import logging
import time
from dataclasses import dataclass
from datetime import datetime, timedelta

from django.core.cache import cache
from django.utils import timezone

from checks import constants
from checks.repositories import CheckResultRepository
from monitors.repositories import MonitorRepository

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PurgeReport:
    """Outcome of one retention run."""

    deleted: int
    batches: int
    completed: bool
    skipped: bool = False


class RetentionService:
    """Delete check history older than the retention window in small batches."""

    def __init__(self) -> None:
        self._monitor_repository = MonitorRepository()
        self._check_result_repository = CheckResultRepository()

    def purge(self, *, now: datetime | None = None) -> PurgeReport:
        """Purge old rows monitor by monitor, batch by batch, within the time budget."""

        # Two overlapping runs would only fight over the same rows
        lock_ttl = constants.PURGE_TIME_BUDGET_SEC + 60
        if not cache.add(constants.PURGE_LOCK_KEY, 1, timeout=lock_ttl):
            return PurgeReport(deleted=0, batches=0, completed=False, skipped=True)
        try:
            return self._purge(now=now or timezone.now())
        finally:
            cache.delete(constants.PURGE_LOCK_KEY)

    def _purge(self, *, now: datetime) -> PurgeReport:
        cutoff = now - timedelta(days=constants.RETENTION_DAYS)
        deadline = time.monotonic() + constants.PURGE_TIME_BUDGET_SEC
        deleted = batches = 0

        for monitor_id in self._monitor_repository.list_all_ids():
            while True:
                count = self._check_result_repository.delete_older_than(
                    monitor_id=monitor_id, before=cutoff, limit=constants.PURGE_BATCH_SIZE
                )
                deleted += count
                batches += 1 if count else 0
                if count < constants.PURGE_BATCH_SIZE:
                    break
                if time.monotonic() > deadline:
                    logger.warning(
                        "History purge stopped by time budget",
                        extra={"deleted": deleted, "batches": batches},
                    )
                    return PurgeReport(deleted=deleted, batches=batches, completed=False)
                time.sleep(constants.PURGE_BATCH_PAUSE_SEC)

        logger.info("History purge finished", extra={"deleted": deleted, "batches": batches})
        return PurgeReport(deleted=deleted, batches=batches, completed=True)
