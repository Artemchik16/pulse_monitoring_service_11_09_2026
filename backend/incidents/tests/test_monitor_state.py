import threading
from datetime import timedelta
from unittest import mock

import pytest
from django.core.cache import cache
from django.db import IntegrityError, connection, transaction
from django.utils import timezone

from checks.clients import ProbeResult
from checks.services import CheckService
from incidents.models import Incident
from incidents.repositories import IncidentRepository
from incidents.services import CheckOutcome, MonitorStateService
from monitors.choices import MonitorStatusChoices
from monitors.models import Monitor
from monitors.services import MonitorService
from users.services import AuthService

T0 = timezone.now().replace(microsecond=0)


@pytest.fixture(autouse=True)
def _isolated_cache(settings):
    """Use in-memory cache so tests do not need Redis."""

    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    cache.clear()


@pytest.fixture
def monitor(db) -> Monitor:
    user, _ = AuthService().register(email="owner@example.com", password="Str0ng-pass-123")
    return MonitorService().create(
        owner_id=user.id, name="m", url="https://a.example", interval_sec=60, timeout_ms=5000
    )


def apply(monitor: Monitor, *, ok: bool, at_sec: int, error: str = "Нет ответа за 5 с") -> Monitor:
    MonitorStateService().apply_check(
        monitor_id=monitor.id,
        outcome=CheckOutcome(
            ok=ok,
            checked_at=T0 + timedelta(seconds=at_sec),
            error_code="" if ok else "TIMEOUT",
            error="" if ok else error,
        ),
    )
    monitor.refresh_from_db()
    return monitor


def incidents_of(monitor: Monitor) -> list[Incident]:
    return list(Incident.objects.filter(monitor=monitor).order_by("started_at"))


@pytest.mark.django_db
class TestStateMachine:
    def test_success_turns_pending_up(self, monitor):
        monitor = apply(monitor, ok=True, at_sec=0)

        assert monitor.status == MonitorStatusChoices.UP
        assert monitor.last_checked_at == T0
        assert incidents_of(monitor) == []

    def test_single_failure_does_not_open_incident(self, monitor):
        apply(monitor, ok=True, at_sec=0)

        monitor = apply(monitor, ok=False, at_sec=60)

        assert monitor.status == MonitorStatusChoices.UP
        assert monitor.consecutive_failures == 1
        assert incidents_of(monitor) == []

    def test_two_failures_turn_down_and_open_incident(self, monitor):
        apply(monitor, ok=True, at_sec=0)
        apply(monitor, ok=False, at_sec=60, error="first")

        monitor = apply(monitor, ok=False, at_sec=120, error="Код ответа 500")

        [incident] = incidents_of(monitor)
        assert monitor.status == MonitorStatusChoices.DOWN
        # Downtime starts at the first failure of the streak, not at confirmation
        assert incident.started_at == T0 + timedelta(seconds=60)
        assert incident.is_open
        assert incident.cause_code == "TIMEOUT"
        assert incident.cause == "Код ответа 500"

    def test_further_failures_keep_single_incident(self, monitor):
        for step in range(5):
            monitor = apply(monitor, ok=False, at_sec=step * 60)

        assert monitor.consecutive_failures == 5
        assert len(incidents_of(monitor)) == 1

    def test_first_success_resolves_incident_with_duration(self, monitor):
        apply(monitor, ok=False, at_sec=0)
        apply(monitor, ok=False, at_sec=60)

        monitor = apply(monitor, ok=True, at_sec=300)

        [incident] = incidents_of(monitor)
        assert monitor.status == MonitorStatusChoices.UP
        assert monitor.consecutive_failures == 0
        assert monitor.failing_since is None
        assert incident.resolved_at == T0 + timedelta(seconds=300)
        assert incident.duration_sec == 300

    def test_next_outage_opens_new_incident(self, monitor):
        for at_sec, ok in [(0, False), (60, False), (120, True), (180, False), (240, False)]:
            monitor = apply(monitor, ok=ok, at_sec=at_sec)

        first, second = incidents_of(monitor)
        assert not first.is_open
        assert second.is_open
        assert second.started_at == T0 + timedelta(seconds=180)

    def test_flapping_never_opens_incident(self, monitor):
        for step in range(10):
            monitor = apply(monitor, ok=step % 2 == 1, at_sec=step * 60)

        assert incidents_of(monitor) == []
        assert monitor.status == MonitorStatusChoices.UP

    def test_failures_separated_by_sleep_are_not_consecutive(self, monitor):
        apply(monitor, ok=True, at_sec=0)
        apply(monitor, ok=False, at_sec=60)

        # Host slept for an hour; the first check after wake-up fails too
        monitor = apply(monitor, ok=False, at_sec=60 + 3600)

        assert monitor.status == MonitorStatusChoices.UP
        assert monitor.consecutive_failures == 1
        assert monitor.failing_since == T0 + timedelta(seconds=60 + 3600)
        assert incidents_of(monitor) == []

    def test_open_incident_survives_sleep_and_closes_on_success(self, monitor):
        apply(monitor, ok=False, at_sec=0)
        apply(monitor, ok=False, at_sec=60)

        monitor = apply(monitor, ok=True, at_sec=60 + 3600)

        [incident] = incidents_of(monitor)
        assert incident.resolved_at == T0 + timedelta(seconds=60 + 3600)

    def test_late_older_result_is_ignored(self, monitor):
        apply(monitor, ok=True, at_sec=120)

        monitor = apply(monitor, ok=False, at_sec=60)

        assert monitor.consecutive_failures == 0
        assert monitor.last_checked_at == T0 + timedelta(seconds=120)

    def test_paused_monitor_state_is_untouched(self, monitor):
        MonitorService().update(monitor=monitor, is_active=False)

        monitor = apply(monitor, ok=False, at_sec=0)
        monitor = apply(monitor, ok=False, at_sec=60)

        assert monitor.status == MonitorStatusChoices.PAUSED
        assert incidents_of(monitor) == []


@pytest.mark.django_db
def test_database_rejects_second_open_incident(monitor):
    IncidentRepository().create_open(monitor_id=monitor.id, started_at=T0, cause_code="", cause="")

    with pytest.raises(IntegrityError), transaction.atomic():
        IncidentRepository().create_open(
            monitor_id=monitor.id, started_at=T0, cause_code="", cause=""
        )


@pytest.mark.django_db(transaction=True)
def test_concurrent_failures_open_one_incident(monitor):
    apply(monitor, ok=False, at_sec=0)
    start = threading.Barrier(2)
    errors = []

    def worker(at_sec: int) -> None:
        try:
            start.wait(timeout=5)
            MonitorStateService().apply_check(
                monitor_id=monitor.id,
                outcome=CheckOutcome(
                    ok=False, checked_at=T0 + timedelta(seconds=at_sec), error_code="TIMEOUT"
                ),
            )
        except Exception as exc:  # pragma: no cover - surfaced by the assert below
            errors.append(exc)
        finally:
            connection.close()

    threads = [threading.Thread(target=worker, args=(at,)) for at in (60, 61)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    monitor.refresh_from_db()
    assert errors == []
    assert monitor.status == MonitorStatusChoices.DOWN
    assert len(incidents_of(monitor)) == 1


@pytest.mark.django_db
def test_check_service_drives_incidents(monitor):
    service = CheckService()
    service._http_probe = mock.Mock(
        probe=mock.Mock(
            return_value=ProbeResult(ok=False, error_code="TIMEOUT", error="Нет ответа за 5 с")
        )
    )

    service.run(monitor_id=monitor.id)
    service.run(monitor_id=monitor.id)

    monitor.refresh_from_db()
    assert monitor.status == MonitorStatusChoices.DOWN
    assert monitor.check_results.count() == 2
    assert len(incidents_of(monitor)) == 1
