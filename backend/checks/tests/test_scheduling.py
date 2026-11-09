import threading
from datetime import timedelta
from unittest import mock

import pytest
from django.core.cache import cache
from django.db import connection, transaction
from django.utils import timezone

from checks.clients import ProbeResult
from checks.services import CheckService, SchedulerService
from monitors.models import Monitor
from monitors.repositories import MonitorRepository
from monitors.services import MonitorService
from users.services import AuthService


@pytest.fixture(autouse=True)
def _isolated_cache(settings):
    """Use in-memory cache so tests do not need Redis."""

    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    cache.clear()


@pytest.fixture
def user(db):
    user, _ = AuthService().register(email="owner@example.com", password="Str0ng-pass-123")
    return user


def make_monitor(user, **fields) -> Monitor:
    defaults = {"name": "m", "url": "https://a.example", "interval_sec": 60, "timeout_ms": 5000}
    return MonitorService().create(owner_id=user.id, **{**defaults, **fields})


def set_next_check(monitor: Monitor, when) -> None:
    MonitorRepository().update(monitor=monitor, next_check_at=when)


@pytest.mark.django_db
class TestClaimDue:
    def test_claims_due_and_moves_next_check_from_now(self, user):
        monitor = make_monitor(user)
        now = timezone.now()
        # Overdue by a day (e.g. the host was asleep)
        set_next_check(monitor, now - timedelta(days=1))

        with transaction.atomic():
            claimed = MonitorRepository().claim_due(now=now, limit=10)

        monitor.refresh_from_db()
        assert [m.id for m in claimed] == [monitor.id]
        assert monitor.next_check_at == now + timedelta(seconds=60)

    def test_missed_slots_are_not_replayed(self, user):
        monitor = make_monitor(user)
        now = timezone.now()
        set_next_check(monitor, now - timedelta(hours=5))

        with transaction.atomic():
            first = MonitorRepository().claim_due(now=now, limit=10)
        with transaction.atomic():
            second = MonitorRepository().claim_due(now=now, limit=10)

        assert len(first) == 1
        assert second == []

    def test_skips_inactive_and_not_yet_due(self, user):
        make_monitor(user, is_active=False)
        future = make_monitor(user)
        set_next_check(future, timezone.now() + timedelta(minutes=5))

        with transaction.atomic():
            claimed = MonitorRepository().claim_due(now=timezone.now(), limit=10)

        assert claimed == []

    def test_batch_limit_bounds_burst(self, user):
        for _ in range(5):
            make_monitor(user)

        with transaction.atomic():
            claimed = MonitorRepository().claim_due(now=timezone.now(), limit=2)

        assert len(claimed) == 2


@pytest.mark.django_db(transaction=True)
def test_concurrent_schedulers_never_claim_same_monitor(user):
    make_monitor(user)
    first_claimed = threading.Event()
    release = threading.Event()
    claimed_by_first = []

    def first_scheduler():
        try:
            with transaction.atomic():
                claimed_by_first.extend(MonitorRepository().claim_due(now=timezone.now(), limit=10))
                first_claimed.set()
                release.wait(timeout=5)
        finally:
            connection.close()

    thread = threading.Thread(target=first_scheduler)
    thread.start()
    assert first_claimed.wait(timeout=5)

    # Second scheduler runs while the first still holds the row lock
    with transaction.atomic():
        claimed_by_second = MonitorRepository().claim_due(now=timezone.now(), limit=10)

    release.set()
    thread.join()
    assert len(claimed_by_first) == 1
    assert claimed_by_second == []


@pytest.mark.django_db
class TestDispatch:
    def test_enqueues_with_expiry(self, user, django_capture_on_commit_callbacks):
        monitor = make_monitor(user, interval_sec=120)

        with mock.patch("checks.tasks.run_check.apply_async") as apply_async:
            with django_capture_on_commit_callbacks(execute=True):
                dispatched = SchedulerService().dispatch_due()

        assert dispatched == 1
        apply_async.assert_called_once_with(args=(monitor.id,), expires=120)


@pytest.mark.django_db
class TestRunCheck:
    def _service(self, result: ProbeResult) -> CheckService:
        service = CheckService()
        service._http_probe = mock.Mock(probe=mock.Mock(return_value=result))
        return service

    def test_stores_result_and_last_checked_at(self, user):
        monitor = make_monitor(user)
        service = self._service(ProbeResult(ok=True, status_code=200, response_time_ms=42))

        result = service.run(monitor_id=monitor.id)

        monitor.refresh_from_db()
        assert result.ok and result.status_code == 200 and result.response_time_ms == 42
        assert monitor.last_checked_at == result.checked_at

    def test_stores_failure_reason(self, user):
        monitor = make_monitor(user)
        service = self._service(
            ProbeResult(ok=False, error_code="TIMEOUT", error="Нет ответа за 5 с")
        )

        result = service.run(monitor_id=monitor.id)

        assert not result.ok
        assert result.error_code == "TIMEOUT"
        assert result.error == "Нет ответа за 5 с"

    def test_duplicate_delivery_is_skipped(self, user):
        monitor = make_monitor(user)
        service = self._service(ProbeResult(ok=True, status_code=200, response_time_ms=1))
        cache.add(f"checks:lock:{monitor.id}", 1)

        assert service.run(monitor_id=monitor.id) is None
        service._http_probe.probe.assert_not_called()

    def test_paused_monitor_is_skipped(self, user):
        monitor = make_monitor(user, is_active=False)
        service = self._service(ProbeResult(ok=True))

        assert service.run(monitor_id=monitor.id) is None
        assert not monitor.check_results.exists()
        service._http_probe.probe.assert_not_called()
