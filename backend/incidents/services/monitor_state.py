from dataclasses import dataclass
from datetime import datetime, timedelta

from django.db import transaction

from incidents import constants
from incidents.repositories import IncidentRepository
from monitors.choices import MonitorStatusChoices
from monitors.models import Monitor
from monitors.repositories import MonitorRepository


@dataclass(frozen=True)
class CheckOutcome:
    """What the state machine needs to know about a finished check."""

    ok: bool
    checked_at: datetime
    error_code: str = ""
    error: str = ""


class MonitorStateService:
    """Monitor status state machine: UP/DOWN transitions and incident lifecycle."""

    def __init__(self) -> None:
        self._monitor_repository = MonitorRepository()
        self._incident_repository = IncidentRepository()

    @transaction.atomic
    def apply_check(self, *, monitor_id: int, outcome: CheckOutcome) -> None:
        """Apply a check outcome to the monitor and open/resolve its incident."""

        # Row lock serializes concurrent outcomes of one monitor: no lost updates,
        # no duplicate incidents (the partial unique index is the last line of defence)
        monitor = self._monitor_repository.lock_by_id(monitor_id=monitor_id)
        if monitor is None or not monitor.is_active:
            # Deleted or paused while the check was running: paused state wins
            return
        if monitor.last_checked_at and outcome.checked_at <= monitor.last_checked_at:
            # Late result of an older check must not roll the state back
            return

        if self._is_streak_stale(monitor=monitor, checked_at=outcome.checked_at):
            monitor.consecutive_failures = 0
            monitor.failing_since = None

        if outcome.ok:
            fields = self._on_success(monitor=monitor, outcome=outcome)
        else:
            fields = self._on_failure(monitor=monitor, outcome=outcome)
        self._monitor_repository.update(
            monitor=monitor, last_checked_at=outcome.checked_at, **fields
        )

    def _on_success(self, *, monitor: Monitor, outcome: CheckOutcome) -> dict:
        """First successful check closes the open incident."""

        incident = self._incident_repository.find_open(monitor_id=monitor.id)
        if incident is not None:
            self._incident_repository.resolve(incident=incident, resolved_at=outcome.checked_at)
        return {
            "status": MonitorStatusChoices.UP,
            "consecutive_failures": 0,
            "failing_since": None,
        }

    def _on_failure(self, *, monitor: Monitor, outcome: CheckOutcome) -> dict:
        """Count the failure; the N-th in a row turns the monitor DOWN and opens an incident."""

        failures = monitor.consecutive_failures + 1
        failing_since = monitor.failing_since or outcome.checked_at
        fields = {"consecutive_failures": failures, "failing_since": failing_since}
        if failures < constants.FAILURES_TO_DOWN:
            return fields

        if self._incident_repository.find_open(monitor_id=monitor.id) is None:
            self._incident_repository.create_open(
                monitor_id=monitor.id,
                started_at=failing_since,
                cause_code=outcome.error_code,
                cause=outcome.error,
            )
        fields["status"] = MonitorStatusChoices.DOWN
        return fields

    @staticmethod
    def _is_streak_stale(*, monitor: Monitor, checked_at: datetime) -> bool:
        """Failures separated by a long gap (sleep, outage of the worker) are not consecutive."""

        if not monitor.consecutive_failures or monitor.last_checked_at is None:
            return False
        max_gap = timedelta(
            seconds=monitor.interval_sec * constants.STALE_GAP_INTERVALS
            + constants.STALE_GAP_GRACE_SEC
        )
        return checked_at - monitor.last_checked_at > max_gap
