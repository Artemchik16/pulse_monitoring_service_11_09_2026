from django.core.validators import RegexValidator
from rest_framework import serializers

from status_pages import constants
from status_pages.models import StatusPage


class SlugField(serializers.CharField):
    """Normalized before validators run: "Acme-Status " is the same address as "acme-status"."""

    def to_internal_value(self, data):
        return super().to_internal_value(data).lower()


class StatusPageInputSerializer(serializers.Serializer):
    """Validate a status page: title, public address and chosen monitors."""

    title = serializers.CharField(max_length=constants.TITLE_MAX_LENGTH)
    slug = SlugField(
        min_length=constants.SLUG_MIN_LENGTH,
        max_length=constants.SLUG_MAX_LENGTH,
        validators=[
            RegexValidator(
                constants.SLUG_PATTERN,
                "Только строчные латинские буквы, цифры и дефис (не в начале и не в конце)",
            )
        ],
        error_messages={
            "min_length": f"Не короче {constants.SLUG_MIN_LENGTH} символов",
            "max_length": f"Не длиннее {constants.SLUG_MAX_LENGTH} символов",
        },
    )
    monitor_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), allow_empty=True, max_length=100
    )

    def validate_title(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Введите название")
        return value

    def validate_monitor_ids(self, value: list[int]) -> list[int]:
        return list(dict.fromkeys(value))


class StatusPageOutputSerializer(serializers.ModelSerializer):
    """Status page as its owner sees it."""

    monitor_ids = serializers.SerializerMethodField()

    class Meta:
        model = StatusPage
        fields = ("id", "title", "slug", "monitor_ids", "created_at", "updated_at")
        read_only_fields = fields

    def get_monitor_ids(self, page: StatusPage) -> list[int]:
        return [monitor.id for monitor in page.monitors.all()]
