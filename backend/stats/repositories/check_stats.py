from datetime import datetime, timedelta
from typing import Any

from django.db import connection
from django.db.models import (
    Aggregate,
    Avg,
    Count,
    DateTimeField,
    DurationField,
    F,
    FloatField,
    Func,
    Q,
    Value,
)

from checks.models import CheckResult


class Percentile(Aggregate):
    """PostgreSQL PERCENTILE_CONT(p) WITHIN GROUP (ORDER BY expr)."""

    function = "PERCENTILE_CONT"
    template = "%(function)s(%(percentile)s) WITHIN GROUP (ORDER BY %(expressions)s)"
    output_field = FloatField()

    def __init__(self, expression: Any, *, percentile: float, **extra: Any) -> None:
        super().__init__(expression, percentile=float(percentile), **extra)


class DateBin(Func):
    """PostgreSQL date_bin(stride, source, origin): floor a timestamp to a bucket."""

    function = "date_bin"
    output_field = DateTimeField()

    def __init__(self, expression: Any, *, stride: timedelta, origin: datetime) -> None:
        super().__init__(
            Value(stride, output_field=DurationField()),
            expression,
            Value(origin, output_field=DateTimeField()),
        )


class CheckStatsRepository:
    """Aggregations over check history (read-only)."""

    def summarize(self, *, monitor_id: int, since: datetime, percentile: float) -> dict[str, Any]:
        """Totals, average and percentile of response time since the given moment."""

        succeeded = Q(ok=True)
        return self._window(monitor_id=monitor_id, since=since).aggregate(
            total=Count("ok"),
            succeeded=Count("ok", filter=succeeded),
            avg_response_ms=Avg("response_time_ms", filter=succeeded),
            p_response_ms=Percentile("response_time_ms", percentile=percentile, filter=succeeded),
        )

    def series(
        self, *, monitor_id: int, since: datetime, bucket: timedelta, origin: datetime
    ) -> list[dict[str, Any]]:
        """Per-bucket totals and average response time, oldest bucket first."""

        succeeded = Q(ok=True)
        return list(
            self._window(monitor_id=monitor_id, since=since)
            .annotate(bucket=DateBin(F("checked_at"), stride=bucket, origin=origin))
            .values("bucket")
            .annotate(
                total=Count("ok"),
                succeeded=Count("ok", filter=succeeded),
                avg_response_ms=Avg("response_time_ms", filter=succeeded),
            )
            .order_by("bucket")
        )

    def series_for_monitors(
        self, *, monitor_ids: list[int], since: datetime, bucket: timedelta, origin: datetime
    ) -> list[dict[str, Any]]:
        """Per-monitor, per-bucket totals and average response time (one query for many monitors)."""

        succeeded = Q(ok=True)
        return list(
            CheckResult.objects.filter(monitor_id__in=monitor_ids, checked_at__gte=since)
            .order_by()
            .annotate(bucket=DateBin(F("checked_at"), stride=bucket, origin=origin))
            .values("monitor_id", "bucket")
            .annotate(
                total=Count("ok"),
                succeeded=Count("ok", filter=succeeded),
                avg_response_ms=Avg("response_time_ms", filter=succeeded),
            )
            .order_by("monitor_id", "bucket")
        )

    def uptime_for_monitors(
        self, *, monitor_ids: list[int], since: datetime
    ) -> dict[int, tuple[int, int]]:
        """(total, succeeded) checks per monitor since the moment, one GROUP BY for all."""

        rows = (
            CheckResult.objects.filter(monitor_id__in=monitor_ids, checked_at__gte=since)
            .order_by()
            .values("monitor_id")
            .annotate(total=Count("ok"), succeeded=Count("ok", filter=Q(ok=True)))
        )
        return {row["monitor_id"]: (row["total"], row["succeeded"]) for row in rows}

    def latest_for_monitors(self, *, monitor_ids: list[int]) -> dict[int, dict[str, Any]]:
        """The most recent check of each monitor, keyed by monitor id.

        LATERAL + LIMIT 1 reads one index entry per monitor; DISTINCT ON would walk the whole
        history of every monitor.
        """

        if not monitor_ids:
            return {}
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT m.id, c.checked_at, c.ok, c.status_code, c.response_time_ms, c.error_code
                FROM unnest(%(ids)s::bigint[]) AS m(id)
                CROSS JOIN LATERAL (
                    SELECT checked_at, ok, status_code, response_time_ms, error_code
                    FROM checks_checkresult
                    WHERE monitor_id = m.id
                    ORDER BY checked_at DESC
                    LIMIT 1
                ) AS c
                """,
                {"ids": monitor_ids},
            )
            columns = ("checked_at", "ok", "status_code", "response_time_ms", "error_code")
            return {row[0]: dict(zip(columns, row[1:], strict=True)) for row in cursor.fetchall()}

    @staticmethod
    def _window(*, monitor_id: int, since: datetime):
        # Every column used (monitor_id, checked_at, ok, response_time_ms) is in the covering
        # index, so PostgreSQL answers with an Index Only Scan without reading the table
        return CheckResult.objects.filter(monitor_id=monitor_id, checked_at__gte=since).order_by()
