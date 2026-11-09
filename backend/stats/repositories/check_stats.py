from datetime import datetime, timedelta
from typing import Any

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

    @staticmethod
    def _window(*, monitor_id: int, since: datetime):
        # Every column used (monitor_id, checked_at, ok, response_time_ms) is in the covering
        # index, so PostgreSQL answers with an Index Only Scan without reading the table
        return CheckResult.objects.filter(monitor_id=monitor_id, checked_at__gte=since).order_by()
