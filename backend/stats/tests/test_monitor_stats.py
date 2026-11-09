from datetime import timedelta

import pytest
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from checks.repositories import CheckResultRepository
from incidents.repositories import IncidentRepository
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


def stats_url(monitor_id: int) -> str:
    return reverse("api:stats:monitor-stats", kwargs={"monitor_id": monitor_id})


def add_check(monitor, *, ago: timedelta, ok: bool = True, response_time_ms: int | None = 100):
    CheckResultRepository().create(
        monitor_id=monitor.id,
        checked_at=timezone.now() - ago,
        ok=ok,
        status_code=200 if ok else 503,
        response_time_ms=response_time_ms if ok else None,
        error_code="" if ok else "UNEXPECTED_STATUS",
    )


def test_summary(api_client, monitor):
    for minutes, ms in enumerate([100, 200, 300, 400]):
        add_check(monitor, ago=timedelta(minutes=minutes + 1), response_time_ms=ms)
    add_check(monitor, ago=timedelta(minutes=10), ok=False)
    # Outside the 24h window: must be ignored
    add_check(monitor, ago=timedelta(days=2), ok=False)

    response = api_client.get(stats_url(monitor.id), {"period": "24h"})

    assert response.status_code == 200
    data = response.data
    assert data["checks_total"] == 5
    assert data["checks_failed"] == 1
    assert data["uptime_pct"] == 80.0
    assert data["avg_response_ms"] == 250.0
    # PERCENTILE_CONT(0.95) over [100, 200, 300, 400]
    assert data["p95_response_ms"] == 385.0


def test_series_buckets_and_gaps(api_client, monitor):
    add_check(monitor, ago=timedelta(minutes=1), response_time_ms=100)
    add_check(monitor, ago=timedelta(minutes=2), ok=False)

    data = api_client.get(stats_url(monitor.id), {"period": "24h"}).data

    assert data["bucket_sec"] == 15 * 60
    assert len(data["series"]) in (96, 97)
    filled = [point for point in data["series"] if point["checks"]]
    empty = [point for point in data["series"] if not point["checks"]]
    assert sum(point["checks"] for point in filled) == 2
    assert all(point["uptime_pct"] is None for point in empty)
    assert data["series"][0]["ts"] < data["series"][-1]["ts"]


@pytest.mark.parametrize(("period", "bucket_sec"), [("7d", 3600), ("30d", 6 * 3600)])
def test_period_buckets(api_client, monitor, period, bucket_sec):
    add_check(monitor, ago=timedelta(days=3))

    data = api_client.get(stats_url(monitor.id), {"period": period}).data

    assert data["bucket_sec"] == bucket_sec
    assert data["checks_total"] == 1


def test_empty_history(api_client, monitor):
    data = api_client.get(stats_url(monitor.id)).data

    assert data["period"] == "24h"
    assert data["checks_total"] == 0
    assert data["uptime_pct"] is None
    assert data["p95_response_ms"] is None


def test_incidents_overlapping_period(api_client, monitor):
    now = timezone.now()
    repository = IncidentRepository()
    old = repository.create_open(
        monitor_id=monitor.id, started_at=now - timedelta(days=3), cause_code="", cause=""
    )
    repository.resolve(incident=old, resolved_at=now - timedelta(days=2))
    # Started before the window but still open: counts
    repository.create_open(
        monitor_id=monitor.id, started_at=now - timedelta(days=1, hours=1), cause_code="", cause=""
    )

    data = api_client.get(stats_url(monitor.id), {"period": "24h"}).data

    assert data["incidents_count"] == 1


def test_invalid_period(api_client, monitor):
    response = api_client.get(stats_url(monitor.id), {"period": "1y"})

    assert response.status_code == 422
    assert "period" in response.data["error"]["fields"]


def test_foreign_monitor_is_not_found(api_client):
    other = make_user("other@example.com")
    foreign = MonitorService().create(owner_id=other.id, name="f", url="https://b.example")

    response = api_client.get(stats_url(foreign.id))

    assert response.status_code == 404


def test_result_is_cached(api_client, monitor, django_assert_num_queries):
    api_client.get(stats_url(monitor.id))
    add_check(monitor, ago=timedelta(minutes=1))

    # Cached: only the ownership lookup hits the database, the new check is not visible yet
    with django_assert_num_queries(1):
        data = api_client.get(stats_url(monitor.id)).data

    assert data["checks_total"] == 0
