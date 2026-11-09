from django.db import transaction
from django.utils import timezone

from checks import constants
from monitors.repositories import MonitorRepository


class SchedulerService:
    """Pick due monitors and dispatch their checks."""

    def __init__(self) -> None:
        self._monitor_repository = MonitorRepository()

    def dispatch_due(self) -> int:
        """Claim due monitors and enqueue one check per monitor; return how many."""

        # Local import: tasks import services, avoid a cycle at module load
        from checks.tasks import run_check

        now = timezone.now()
        with transaction.atomic():
            monitors = self._monitor_repository.claim_due(
                now=now, limit=constants.SCHEDULER_BATCH_SIZE
            )
            for monitor in monitors:
                # A check that waited in the queue longer than its interval is stale:
                # the broker drops it instead of running a burst of outdated checks
                transaction.on_commit(
                    lambda monitor=monitor: run_check.apply_async(
                        args=(monitor.id,), expires=monitor.interval_sec
                    )
                )
        return len(monitors)
