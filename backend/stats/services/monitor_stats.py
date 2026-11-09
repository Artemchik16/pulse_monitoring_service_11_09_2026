from datetime import timedelta
from typing import Any

from django.core.cache import cache
from django.utils import timezone

from incidents.repositories import IncidentRepository
from monitors.repositories import MonitorRepository
from stats import constants
from stats.repositories import CheckStatsRepository
from stats.services.series import fill_series, round_or_none, uptime_pct


class MonitorStatsService:
    """Uptime, response time and chart series of a monitor over a period."""

    def __init__(self) -> None:
        self._monitor_repository = MonitorRepository()
        self._check_stats_repository = CheckStatsRepository()
        self._incident_repository = IncidentRepository()

    def get(self, *, monitor_id: int, owner_id: int, period: str) -> dict[str, Any]:
        """Stats of the owner's monitor; cached briefly because history only grows by checks."""

        # Ownership check happens before the cache: foreign monitors -> DoesNotExist -> 404
        monitor = self._monitor_repository.get_by_id(monitor_id=monitor_id, owner_id=owner_id)
        config = constants.PERIODS[period]
        return cache.get_or_set(
            f"stats:monitor:{monitor.id}:{period}",
            lambda: self._compute(monitor_id=monitor.id, period=period, config=config),
            timeout=config["cache_ttl_sec"],
        )

    def _compute(self, *, monitor_id: int, period: str, config: dict) -> dict[str, Any]:
        """Aggregate the period from the database."""

        now = timezone.now()
        bucket: timedelta = config["bucket"]
        since = now - config["window"]

        summary = self._check_stats_repository.summarize(
            monitor_id=monitor_id, since=since, percentile=constants.P95
        )
        rows = self._check_stats_repository.series(
            monitor_id=monitor_id, since=since, bucket=bucket, origin=constants.BUCKET_ORIGIN
        )
        return {
            "period": period,
            "since": since,
            "until": now,
            "bucket_sec": int(bucket.total_seconds()),
            "checks_total": summary["total"],
            "checks_failed": summary["total"] - summary["succeeded"],
            "uptime_pct": uptime_pct(summary["succeeded"], summary["total"]),
            "avg_response_ms": round_or_none(summary["avg_response_ms"], 1),
            "p95_response_ms": round_or_none(summary["p_response_ms"], 0),
            "incidents_count": self._incident_repository.count_overlapping(
                monitor_id=monitor_id, since=since
            ),
            "series": fill_series(rows=rows, since=since, now=now, bucket=bucket),
        }
