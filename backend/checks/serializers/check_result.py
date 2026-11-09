from rest_framework import serializers

from checks.models import CheckResult


class CheckResultOutputSerializer(serializers.ModelSerializer):
    """One check of the monitor history; `error` is a human-readable failure reason."""

    class Meta:
        model = CheckResult
        fields = (
            "id",
            "checked_at",
            "ok",
            "status_code",
            "response_time_ms",
            "error_code",
            "error",
        )
        read_only_fields = fields
