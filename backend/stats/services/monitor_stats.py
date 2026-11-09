from datetime import datetime, timedelta
from typing import Any

from django.core.cache import cache
from django.utils import timezone

from incidents.repositories import IncidentRepository
from monitors.repositories import MonitorRepository
from stats import constants
from stats.repositories import CheckStatsRepository


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
            "uptime_pct": self._uptime(summary["succeeded"], summary["total"]),
            "avg_response_ms": self._round(summary["avg_response_ms"], 1),
            "p95_response_ms": self._round(summary["p_response_ms"], 0),
            "incidents_count": self._incident_repository.count_overlapping(
                monitor_id=monitor_id, since=since
            ),
            "series": self._fill_series(rows=rows, since=since, now=now, bucket=bucket),
        }

    def _fill_series(
        self, *, rows: list[dict], since: datetime, now: datetime, bucket: timedelta
    ) -> list[dict[str, Any]]:
        """One point per bucket; buckets without checks are explicit gaps (nulls) for the chart."""

        by_bucket = {row["bucket"]: row for row in rows}
        points = []
        start = self._floor(since, bucket)
        current = start
        while current <= now:
            row = by_bucket.get(current)
            points.append(
                {
                    "ts": current,
                    "checks": row["total"] if row else 0,
                    "uptime_pct": self._uptime(row["succeeded"], row["total"]) if row else None,
                    "avg_response_ms": self._round(row["avg_response_ms"], 1) if row else None,
                }
            )
            current += bucket
        return points

    @staticmethod
    def _floor(moment: datetime, bucket: timedelta) -> datetime:
        """Same bucketing as date_bin() in the database."""

        offset = (moment - constants.BUCKET_ORIGIN) // bucket
        return constants.BUCKET_ORIGIN + offset * bucket

    @staticmethod
    def _uptime(succeeded: int, total: int) -> float | None:
        return round(succeeded * 100 / total, 3) if total else None

    @staticmethod
    def _round(value: float | None, digits: int) -> float | None:
        return None if value is None else round(value, digits)
