from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from users.models import User
from users.serializers.user import UserOutputSerializer


class RegisterInputSerializer(serializers.Serializer):
    """Validate registration data."""

    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False)

    def validate(self, attrs: dict) -> dict:
        # Run Django password validators against the would-be user (similarity check)
        try:
            validate_password(attrs["password"], user=User(email=attrs["email"]))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs


class LoginInputSerializer(serializers.Serializer):
    """Validate login data."""

    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False)


class RefreshInputSerializer(serializers.Serializer):
    """Validate a refresh token payload."""

    refresh = serializers.CharField()


class TokenPairOutputSerializer(serializers.Serializer):
    """JWT access/refresh pair."""

    access = serializers.CharField()
    refresh = serializers.CharField()


class AuthOutputSerializer(serializers.Serializer):
    """Authenticated user with issued tokens."""

    user = UserOutputSerializer()
    tokens = TokenPairOutputSerializer()
