from typing import Any

from django.core.validators import URLValidator
from rest_framework import serializers

from common.net import HostResolutionError, UnsafeTargetError, ensure_public_url
from monitors import constants
from monitors.choices import HttpMethodChoices
from monitors.models import Monitor


class MonitorInputSerializer(serializers.Serializer):
    """Validate Monitor create/update data."""

    name = serializers.CharField(max_length=100)
    url = serializers.CharField(
        max_length=constants.MAX_URL_LENGTH,
        validators=[
            URLValidator(
                schemes=constants.ALLOWED_URL_SCHEMES,
                message="Укажите корректный URL с протоколом http или https",
            )
        ],
    )
    method = serializers.ChoiceField(
        choices=HttpMethodChoices.choices, default=HttpMethodChoices.GET
    )
    expected_status_from = serializers.IntegerField(
        min_value=constants.MIN_HTTP_STATUS,
        max_value=constants.MAX_HTTP_STATUS,
        default=constants.DEFAULT_EXPECTED_STATUS_FROM,
    )
    expected_status_to = serializers.IntegerField(
        min_value=constants.MIN_HTTP_STATUS,
        max_value=constants.MAX_HTTP_STATUS,
        default=constants.DEFAULT_EXPECTED_STATUS_TO,
    )
    interval_sec = serializers.IntegerField(
        min_value=constants.MIN_INTERVAL_SEC,
        max_value=constants.MAX_INTERVAL_SEC,
        default=constants.DEFAULT_INTERVAL_SEC,
        error_messages={
            "min_value": f"Интервал должен быть от {constants.MIN_INTERVAL_SEC} до {constants.MAX_INTERVAL_SEC} секунд",
            "max_value": f"Интервал должен быть от {constants.MIN_INTERVAL_SEC} до {constants.MAX_INTERVAL_SEC} секунд",
        },
    )
    timeout_ms = serializers.IntegerField(
        min_value=constants.MIN_TIMEOUT_MS,
        max_value=constants.MAX_TIMEOUT_MS,
        default=constants.DEFAULT_TIMEOUT_MS,
    )
    body_contains = serializers.CharField(
        max_length=constants.BODY_CONTAINS_MAX, allow_blank=True, default="", trim_whitespace=False
    )
    expect_json = serializers.BooleanField(default=False)
    is_active = serializers.BooleanField(default=True)
    is_public = serializers.BooleanField(default=False)

    def validate_url(self, value: str) -> str:
        # SSRF guard on the resolved IPs, not just the URL string (checks re-validate at runtime)
        try:
            ensure_public_url(value)
        except (UnsafeTargetError, HostResolutionError) as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return value

    def validate_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Название не может быть пустым")
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        # On PATCH, cross-field rules must see the stored values of omitted fields
        def current(field: str) -> Any:
            if field in attrs:
                return attrs[field]
            return getattr(self.instance, field)

        errors: dict[str, str] = {}
        if current("timeout_ms") >= current("interval_sec") * 1000:
            errors["timeout_ms"] = "Таймаут должен быть меньше интервала проверки"
        if current("method") == "HEAD" and (current("body_contains") or current("expect_json")):
            errors["method"] = (
                "HEAD-запрос без тела: проверку содержимого используйте с GET или POST"
            )
        if current("expected_status_from") > current("expected_status_to"):
            errors["expected_status_to"] = (
                "Верхняя граница кода ответа должна быть не меньше нижней"
            )
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class MonitorOutputSerializer(serializers.ModelSerializer):
    """Monitor representation for its owner."""

    class Meta:
        model = Monitor
        fields = (
            "id",
            "name",
            "url",
            "method",
            "expected_status_from",
            "expected_status_to",
            "interval_sec",
            "timeout_ms",
            "body_contains",
            "expect_json",
            "is_active",
            "is_public",
            "status",
            "consecutive_failures",
            "last_checked_at",
            "next_check_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
