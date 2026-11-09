from rest_framework import serializers


class ErrorSerializer(serializers.Serializer):
    """Error body shared by every API error."""

    code = serializers.CharField(help_text="Машиночитаемый код ошибки, например `not_found`")
    message = serializers.CharField(help_text="Сообщение для пользователя")


class ErrorResponseSerializer(serializers.Serializer):
    """{"error": {"code", "message"}}."""

    error = ErrorSerializer()


class ValidationErrorSerializer(ErrorSerializer):
    """Validation error with messages per request field."""

    fields = serializers.DictField(
        child=serializers.ListField(child=serializers.CharField()),
        help_text='Ошибки по полям запроса: `{"interval_sec": ["..."]}`',
    )


class ValidationErrorResponseSerializer(serializers.Serializer):
    """{"error": {"code": "validation_error", "message", "fields"}}."""

    error = ValidationErrorSerializer()
