from rest_framework import serializers

from stats.choices import StatsPeriodChoices


class MonitorStatsQuerySerializer(serializers.Serializer):
    """Validate ?period=24h|7d|30d."""

    period = serializers.ChoiceField(
        choices=StatsPeriodChoices.choices, default=StatsPeriodChoices.DAY
    )


class StatsPointSerializer(serializers.Serializer):
    """One chart bucket; nulls mean no checks in the bucket."""

    ts = serializers.DateTimeField()
    checks = serializers.IntegerField()
    uptime_pct = serializers.FloatField(allow_null=True)
    avg_response_ms = serializers.FloatField(allow_null=True)


class MonitorStatsOutputSerializer(serializers.Serializer):
    """Monitor statistics over a period."""

    period = serializers.ChoiceField(choices=StatsPeriodChoices.choices)
    since = serializers.DateTimeField()
    until = serializers.DateTimeField()
    bucket_sec = serializers.IntegerField()
    checks_total = serializers.IntegerField()
    checks_failed = serializers.IntegerField()
    uptime_pct = serializers.FloatField(allow_null=True)
    avg_response_ms = serializers.FloatField(allow_null=True)
    p95_response_ms = serializers.FloatField(allow_null=True)
    incidents_count = serializers.IntegerField()
    series = StatsPointSerializer(many=True)
