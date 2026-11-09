from datetime import timedelta

import pytest
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from checks.repositories import CheckResultRepository
from monitors.services import MonitorService
from users.services import AuthService

pytestmark = pytest.mark.django_db

URL = "/api/v1/monitors/summary"


@pytest.fixture(autouse=True)
def _isolated_cache(settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    cache.clear()


def make_user(email: str):
    user, _ = AuthService().register(email=email, password="Str0ng-pass-123")
    return user


@pytest.fixture
def user():
    return make_user("owner@example.com")


@pytest.fixture
def api_client(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client


def add_check(monitor, *, ago: timedelta, ok: bool = True, ms: int | None = 100, code=200):
    CheckResultRepository().create(
        monitor_id=monitor.id,
        checked_at=timezone.now() - ago,
        ok=ok,
        status_code=code,
        response_time_ms=ms,
        error_code="" if ok else "UNEXPECTED_STATUS",
    )


def test_summary_per_monitor(api_client, user):
    monitor = MonitorService().create(owner_id=user.id, name="m", url="https://a.example")
    add_check(monitor, ago=timedelta(hours=2), ms=100)
    add_check(monitor, ago=timedelta(hours=1), ok=False, ms=None, code=503)
    add_check(monitor, ago=timedelta(minutes=1), ms=300)
    add_check(monitor, ago=timedelta(days=2), ok=False)  # outside 24h

    response = api_client.get(URL)

    assert response.status_code == 200
    [item] = response.data["results"]
    assert item["monitor_id"] == monitor.id
    assert item["checks_24h"] == 3
    assert item["uptime_24h"] == pytest.approx(66.667)
    assert item["last_check"]["response_time_ms"] == 300
    assert item["last_check"]["ok"] is True
    assert len(item["sparkline"]) in (24, 25)
    assert sum(point["checks"] for point in item["sparkline"]) == 3


def test_monitor_without_checks(api_client, user):
    MonitorService().create(owner_id=user.id, name="new", url="https://a.example")

    [item] = api_client.get(URL).data["results"]

    assert item["last_check"] is None
    assert item["uptime_24h"] is None
    assert item["checks_24h"] == 0


def test_only_own_monitors(api_client, user):
    MonitorService().create(owner_id=user.id, name="own", url="https://a.example")
    foreign = MonitorService().create(
        owner_id=make_user("other@example.com").id, name="foreign", url="https://b.example"
    )

    ids = [item["monitor_id"] for item in api_client.get(URL).data["results"]]

    assert foreign.id not in ids
    assert len(ids) == 1


def test_query_count_does_not_grow_with_monitors(api_client, user, django_assert_max_num_queries):
    for index in range(10):
        monitor = MonitorService().create(
            owner_id=user.id, name=f"m{index}", url="https://a.example"
        )
        add_check(monitor, ago=timedelta(minutes=5))

    # auth + monitor ids + latest checks + hourly series
    with django_assert_max_num_queries(4):
        response = api_client.get(URL)

    assert len(response.data["results"]) == 10


def test_empty(api_client):
    assert api_client.get(URL).data == {"results": []}


def test_requires_auth():
    assert APIClient().get(URL).status_code == 401
    assert reverse("api:stats:monitors-summary") == URL
