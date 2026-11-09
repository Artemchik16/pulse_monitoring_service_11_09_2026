from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from checks import constants
from checks.clients import HttpProbe
from checks.models import CheckResult
from checks.repositories import CheckResultRepository
from incidents.services import CheckOutcome, MonitorStateService
from monitors.repositories import MonitorRepository


class CheckService:
    """Run a single monitor check and record its outcome."""

    def __init__(self) -> None:
        self._monitor_repository = MonitorRepository()
        self._check_result_repository = CheckResultRepository()
        self._monitor_state_service = MonitorStateService()
        self._http_probe = HttpProbe()

    def run(self, *, monitor_id: int) -> CheckResult | None:
        """Probe the monitor's URL and store the result; None if skipped."""

        monitor = self._monitor_repository.find_active_by_id(monitor_id=monitor_id)
        if monitor is None:
            # Deleted or paused after the check was queued
            return None

        # Guards against duplicate delivery of the same task (acks_late redelivery)
        lock_key = f"checks:lock:{monitor_id}"
        lock_ttl = monitor.timeout_ms // 1000 + constants.CHECK_LOCK_MARGIN_SEC
        if not cache.add(lock_key, 1, timeout=lock_ttl):
            return None
        try:
            checked_at = timezone.now()
            probe = self._http_probe.probe(
                url=monitor.url,
                method=monitor.method,
                timeout_ms=monitor.timeout_ms,
                expected_status_from=monitor.expected_status_from,
                expected_status_to=monitor.expected_status_to,
                body_contains=monitor.body_contains,
                expect_json=monitor.expect_json,
            )
            # History row and monitor state change together or not at all
            with transaction.atomic():
                result = self._check_result_repository.create(
                    monitor_id=monitor.id,
                    checked_at=checked_at,
                    ok=probe.ok,
                    status_code=probe.status_code,
                    response_time_ms=probe.response_time_ms,
                    error_code=probe.error_code,
                    error=probe.error,
                )
                self._monitor_state_service.apply_check(
                    monitor_id=monitor.id,
                    outcome=CheckOutcome(
                        ok=probe.ok,
                        checked_at=checked_at,
                        error_code=probe.error_code,
                        error=probe.error,
                    ),
                )
            return result
        finally:
            cache.delete(lock_key)
