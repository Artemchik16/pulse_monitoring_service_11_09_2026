from rest_framework import serializers

from playground.choices import PlaygroundModeChoices
from playground.models import PlaygroundTarget


class PlaygroundTargetOutputSerializer(serializers.ModelSerializer):
    """A playground endpoint: `path` is relative to the API origin."""

    path = serializers.SerializerMethodField()

    class Meta:
        model = PlaygroundTarget
        fields = ("slug", "mode", "path", "updated_at")
        read_only_fields = fields

    def get_path(self, target: PlaygroundTarget) -> str:
        return f"/api/v1/playground/{target.slug}"


class PlaygroundModeInputSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=PlaygroundModeChoices.choices)
