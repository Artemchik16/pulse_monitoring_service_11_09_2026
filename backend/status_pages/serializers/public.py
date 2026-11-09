from rest_framework import serializers

from monitors.choices import MonitorStatusChoices

OVERALL_STATUSES = ("operational", "partial_outage", "major_outage", "unknown")


class PublicMonitorSerializer(serializers.Serializer):
    """A monitor on a public page: name and health only (no URL, no ids, no error details)."""

    name = serializers.CharField()
    status = serializers.ChoiceField(choices=MonitorStatusChoices.choices)
    uptime_24h = serializers.FloatField(allow_null=True)
    uptime_30d = serializers.FloatField(allow_null=True)
    last_checked_at = serializers.DateTimeField(allow_null=True)


class PublicStatusPageSerializer(serializers.Serializer):
    title = serializers.CharField()
    slug = serializers.CharField()
    status = serializers.ChoiceField(choices=[(value, value) for value in OVERALL_STATUSES])
    generated_at = serializers.DateTimeField()
    monitors = PublicMonitorSerializer(many=True)
