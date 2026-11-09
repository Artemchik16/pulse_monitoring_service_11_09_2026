from rest_framework import serializers

from incidents.models import Incident
from monitors.models import Monitor


class IncidentMonitorSerializer(serializers.ModelSerializer):
    """Short monitor reference inside an incident."""

    class Meta:
        model = Monitor
        fields = ("id", "name")
        read_only_fields = fields


class IncidentOutputSerializer(serializers.ModelSerializer):
    """Incident representation for the monitor owner."""

    monitor = IncidentMonitorSerializer()
    is_open = serializers.BooleanField()

    class Meta:
        model = Incident
        fields = (
            "id",
            "monitor",
            "started_at",
            "resolved_at",
            "duration_sec",
            "is_open",
            "cause_code",
            "cause",
        )
        read_only_fields = fields
