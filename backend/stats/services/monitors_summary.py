from collections import defaultdict
from typing import Any

from django.core.cache import cache
from django.utils import timezone

from monitors.repositories import MonitorRepository
from stats import constants
from stats.repositories import CheckStatsRepository
from stats.services.series import fill_series, uptime_pct


class MonitorsSummaryService:
    """Dashboard data for all of the owner's monitors in a fixed number of queries."""

    def __init__(self) -> None:
        self._monitor_repository = MonitorRepository()
        self._check_stats_repository = CheckStatsRepository()

    def get(self, *, owner_id: int) -> list[dict[str, Any]]:
        """Last check, 24h uptime and an hourly sparkline per monitor."""

        return cache.get_or_set(
            f"stats:summary:{owner_id}",
            lambda: self._compute(owner_id=owner_id),
            timeout=constants.SUMMARY_CACHE_TTL_SEC,
        )

    def _compute(self, *, owner_id: int) -> list[dict[str, Any]]:
        monitor_ids = self._monitor_repository.list_ids_by_owner(owner_id=owner_id)
        if not monitor_ids:
            return []

        now = timezone.now()
        since = now - constants.SUMMARY_WINDOW
        latest = self._check_stats_repository.latest_for_monitors(monitor_ids=monitor_ids)
        rows_by_monitor: dict[int, list[dict]] = defaultdict(list)
        for row in self._check_stats_repository.series_for_monitors(
            monitor_ids=monitor_ids,
            since=since,
            bucket=constants.SUMMARY_BUCKET,
            origin=constants.BUCKET_ORIGIN,
        ):
            rows_by_monitor[row["monitor_id"]].append(row)

        summary = []
        for monitor_id in monitor_ids:
            rows = rows_by_monitor[monitor_id]
            total = sum(row["total"] for row in rows)
            succeeded = sum(row["succeeded"] for row in rows)
            last = latest.get(monitor_id)
            summary.append(
                {
                    "monitor_id": monitor_id,
                    "last_check": last,
                    "uptime_24h": uptime_pct(succeeded, total),
                    "checks_24h": total,
                    "sparkline": fill_series(
                        rows=rows, since=since, now=now, bucket=constants.SUMMARY_BUCKET
                    ),
                }
            )
        return summary
