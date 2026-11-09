from rest_framework import serializers

from checks.choices import CheckErrorChoices
from stats.serializers.monitor_stats import StatsPointSerializer


class LastCheckSerializer(serializers.Serializer):
    """The most recent check of a monitor."""

    checked_at = serializers.DateTimeField()
    ok = serializers.BooleanField()
    status_code = serializers.IntegerField(allow_null=True)
    response_time_ms = serializers.IntegerField(allow_null=True)
    error_code = serializers.ChoiceField(
        choices=[("", ""), *CheckErrorChoices.choices], allow_blank=True
    )


class MonitorSummarySerializer(serializers.Serializer):
    """Dashboard row data of one monitor."""

    monitor_id = serializers.IntegerField()
    last_check = LastCheckSerializer(allow_null=True)
    uptime_24h = serializers.FloatField(allow_null=True)
    checks_24h = serializers.IntegerField()
    sparkline = StatsPointSerializer(many=True)


class MonitorsSummaryOutputSerializer(serializers.Serializer):
    """Summary of all the user's monitors (at most 20, so not paginated)."""

    results = MonitorSummarySerializer(many=True)
