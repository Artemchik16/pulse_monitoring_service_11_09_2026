from datetime import timedelta

import pytest
from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from checks import constants
from checks.models import CheckResult
from checks.repositories import CheckResultRepository
from checks.services import RetentionService
from monitors.services import MonitorService
from users.services import AuthService

pytestmark = pytest.mark.django_db

NOW = timezone.now()


@pytest.fixture(autouse=True)
def _isolated_cache(settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    cache.clear()


@pytest.fixture
def monitors():
    user, _ = AuthService().register(email="owner@example.com", password="Str0ng-pass-123")
    return [
        MonitorService().create(owner_id=user.id, name=f"m{i}", url="https://a.example")
        for i in range(2)
    ]


def add_checks(monitor, *, days_ago: float, count: int) -> None:
    CheckResult.objects.bulk_create(
        CheckResult(
            monitor_id=monitor.id,
            checked_at=NOW - timedelta(days=days_ago, seconds=index),
            ok=True,
            status_code=200,
            response_time_ms=100,
        )
        for index in range(count)
    )


def remaining(monitor, *, older: bool) -> int:
    cutoff = NOW - timedelta(days=constants.RETENTION_DAYS)
    lookup = {"checked_at__lt": cutoff} if older else {"checked_at__gte": cutoff}
    return CheckResult.objects.filter(monitor=monitor, **lookup).count()


def test_deletes_only_rows_older_than_retention(monitors):
    first, second = monitors
    add_checks(first, days_ago=31, count=5)
    add_checks(first, days_ago=29, count=3)
    add_checks(second, days_ago=45, count=4)
    add_checks(second, days_ago=1, count=2)

    report = RetentionService().purge(now=NOW)

    assert report.deleted == 9
    assert report.completed
    assert remaining(first, older=True) == 0
    assert remaining(second, older=True) == 0
    assert remaining(first, older=False) == 3
    assert remaining(second, older=False) == 2


def test_deletes_in_batches(monitors, monkeypatch):
    monkeypatch.setattr(constants, "PURGE_BATCH_SIZE", 4)
    monkeypatch.setattr(constants, "PURGE_BATCH_PAUSE_SEC", 0)
    add_checks(monitors[0], days_ago=40, count=10)

    report = RetentionService().purge(now=NOW)

    assert report.deleted == 10
    assert report.batches == 3  # 4 + 4 + 2


def test_each_statement_is_limited(monitors):
    add_checks(monitors[0], days_ago=40, count=3)

    with CaptureQueriesContext(connection) as captured:
        CheckResultRepository().delete_older_than(
            monitor_id=monitors[0].id, before=NOW - timedelta(days=30), limit=2
        )

    [delete_sql] = [
        " ".join(q["sql"].split())
        for q in captured.captured_queries
        if q["sql"].lstrip().startswith("DELETE")
    ]
    # ids computed once through the index, rows deleted through the primary key
    assert "id = ANY(ARRAY( SELECT id" in delete_sql
    assert "LIMIT 2" in delete_sql
    assert remaining(monitors[0], older=True) == 1


def test_time_budget_stops_run(monitors, monkeypatch):
    monkeypatch.setattr(constants, "PURGE_BATCH_SIZE", 2)
    monkeypatch.setattr(constants, "PURGE_BATCH_PAUSE_SEC", 0)
    monkeypatch.setattr(constants, "PURGE_TIME_BUDGET_SEC", -1)
    add_checks(monitors[0], days_ago=40, count=10)

    report = RetentionService().purge(now=NOW)

    assert not report.completed
    assert report.deleted == 2
    assert remaining(monitors[0], older=True) == 8


def test_overlapping_run_is_skipped(monitors):
    add_checks(monitors[0], days_ago=40, count=3)
    cache.add(constants.PURGE_LOCK_KEY, 1)

    report = RetentionService().purge(now=NOW)

    assert report.skipped
    assert remaining(monitors[0], older=True) == 3
