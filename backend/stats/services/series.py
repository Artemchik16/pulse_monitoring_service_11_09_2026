from datetime import datetime, timedelta
from typing import Any

from stats import constants


def floor_to_bucket(moment: datetime, bucket: timedelta) -> datetime:
    """Same bucketing as date_bin() in the database."""

    offset = (moment - constants.BUCKET_ORIGIN) // bucket
    return constants.BUCKET_ORIGIN + offset * bucket


def uptime_pct(succeeded: int, total: int) -> float | None:
    return round(succeeded * 100 / total, 3) if total else None


def round_or_none(value: float | None, digits: int) -> float | None:
    return None if value is None else round(value, digits)


def fill_series(
    *, rows: list[dict], since: datetime, now: datetime, bucket: timedelta
) -> list[dict[str, Any]]:
    """One point per bucket; buckets without checks are explicit gaps (nulls) for the chart."""

    by_bucket = {row["bucket"]: row for row in rows}
    points = []
    current = floor_to_bucket(since, bucket)
    while current <= now:
        row = by_bucket.get(current)
        points.append(
            {
                "ts": current,
                "checks": row["total"] if row else 0,
                "uptime_pct": uptime_pct(row["succeeded"], row["total"]) if row else None,
                "avg_response_ms": round_or_none(row["avg_response_ms"], 1) if row else None,
            }
        )
        current += bucket
    return points
