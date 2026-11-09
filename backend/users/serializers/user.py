from rest_framework import serializers

from users.models import User


class UserOutputSerializer(serializers.ModelSerializer):
    """Public representation of the current User."""

    class Meta:
        model = User
        fields = ("id", "email", "created_at")
        read_only_fields = fields
