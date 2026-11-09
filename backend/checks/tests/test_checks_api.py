from datetime import timedelta

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from checks.repositories import CheckResultRepository
from monitors.services import MonitorService
from users.services import AuthService

pytestmark = pytest.mark.django_db


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
def monitor(user):
    return MonitorService().create(owner_id=user.id, name="m", url="https://a.example")


@pytest.fixture
def api_client(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client


def add_checks(monitor, count: int, *, failed_every: int = 0):
    now = timezone.now()
    for index in range(count):
        ok = not (failed_every and index % failed_every == 0)
        CheckResultRepository().create(
            monitor_id=monitor.id,
            checked_at=now - timedelta(minutes=index),
            ok=ok,
            status_code=200 if ok else 503,
            response_time_ms=100 + index if ok else None,
            error_code="" if ok else "UNEXPECTED_STATUS",
            error="" if ok else "Код ответа 503, ожидался 200–299",
        )


def url(monitor_id: int) -> str:
    return f"/api/v1/monitors/{monitor_id}/checks"


def test_paginated_newest_first(api_client, monitor):
    add_checks(monitor, 25)

    page1 = api_client.get(url(monitor.id), {"page_size": 10}).data
    page3 = api_client.get(url(monitor.id), {"page_size": 10, "page": 3}).data

    assert page1["count"] == 25
    assert len(page1["results"]) == 10
    assert page1["results"][0]["response_time_ms"] == 100  # the newest
    times = [item["checked_at"] for item in page1["results"]]
    assert times == sorted(times, reverse=True)
    assert len(page3["results"]) == 5
    assert page3["next"] is None


def test_failure_reason_and_filter(api_client, monitor):
    add_checks(monitor, 6, failed_every=3)

    failed = api_client.get(url(monitor.id), {"ok": "false"}).data

    assert failed["count"] == 2
    item = failed["results"][0]
    assert item["ok"] is False
    assert item["error_code"] == "UNEXPECTED_STATUS"
    assert item["error"] == "Код ответа 503, ожидался 200–299"


def test_foreign_monitor_is_not_found(api_client):
    foreign = MonitorService().create(
        owner_id=make_user("other@example.com").id, name="f", url="https://b.example"
    )
    add_checks(foreign, 1)

    assert api_client.get(url(foreign.id)).status_code == 404


def test_requires_auth(monitor):
    assert APIClient().get(url(monitor.id)).status_code == 401
