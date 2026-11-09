from django.db.models import QuerySet
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, viewsets
from rest_framework.request import Request
from rest_framework.response import Response

from playground.models import PlaygroundTarget
from playground.repositories import PlaygroundTargetRepository
from playground.serializers import PlaygroundModeInputSerializer, PlaygroundTargetOutputSerializer
from playground.services import PlaygroundService


@extend_schema_view(
    list=extend_schema(
        summary="Эндпоинты полигона", description="Тестовые эндпоинты и их текущие режимы."
    ),
    partial_update=extend_schema(
        summary="Переключить режим",
        request=PlaygroundModeInputSerializer,
        responses=PlaygroundTargetOutputSerializer,
    ),
)
@extend_schema(tags=["Playground"])
class PlaygroundTargetViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Playground endpoints: list and switch modes (signed-in users)."""

    http_method_names = ("get", "patch")
    serializer_class = PlaygroundTargetOutputSerializer
    pagination_class = None
    lookup_field = "slug"

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self._playground_target_repository = PlaygroundTargetRepository()
        self._playground_service = PlaygroundService()

    def get_queryset(self) -> QuerySet[PlaygroundTarget]:
        return self._playground_target_repository.list_all()

    def partial_update(self, request: Request, slug: str) -> Response:
        serializer = PlaygroundModeInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target = self._playground_service.set_mode(
            slug=slug, mode=serializer.validated_data["mode"]
        )
        return Response(PlaygroundTargetOutputSerializer(target).data)
