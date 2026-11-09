from datetime import UTC, datetime, timedelta

from stats.choices import StatsPeriodChoices

# Window length, chart bucket size and cache TTL per period.
# Buckets: 24h -> 96 points, 7d -> 168 points, 30d -> 120 points.
PERIODS: dict[str, dict] = {
    StatsPeriodChoices.DAY: {
        "window": timedelta(hours=24),
        "bucket": timedelta(minutes=15),
        "cache_ttl_sec": 60,
    },
    StatsPeriodChoices.WEEK: {
        "window": timedelta(days=7),
        "bucket": timedelta(hours=1),
        "cache_ttl_sec": 5 * 60,
    },
    StatsPeriodChoices.MONTH: {
        "window": timedelta(days=30),
        "bucket": timedelta(hours=6),
        "cache_ttl_sec": 15 * 60,
    },
}

# Fixed origin keeps buckets aligned to wall-clock boundaries (:00, :15, ...)
BUCKET_ORIGIN = datetime(2000, 1, 1, tzinfo=UTC)

P95 = 0.95

# Dashboard summary (one row per monitor): 24h uptime and an hourly sparkline
SUMMARY_WINDOW = timedelta(hours=24)
SUMMARY_BUCKET = timedelta(hours=1)
# Short: the dashboard polls it, and status must not look stale for long
SUMMARY_CACHE_TTL_SEC = 15
