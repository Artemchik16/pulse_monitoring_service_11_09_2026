from typing import ClassVar

from django.db.models import QuerySet
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.request import Request
from rest_framework.response import Response

from common.pagination import DefaultPagination
from monitors.filters import MonitorFilter
from monitors.models import Monitor
from monitors.repositories import MonitorRepository
from monitors.serializers import MonitorInputSerializer, MonitorOutputSerializer
from monitors.services import MonitorService


@extend_schema_view(
    list=extend_schema(
        summary="Список мониторов",
        description="Свои мониторы, новые первыми. Фильтры: `status` (можно несколько), "
        "`is_active`, `is_public`.",
        responses={200: MonitorOutputSerializer(many=True), 422: OpenApiResponse()},
    ),
    retrieve=extend_schema(summary="Монитор", responses=MonitorOutputSerializer),
    create=extend_schema(
        summary="Создать монитор",
        description="URL только http/https и только на публичные адреса (проверяется DNS-резолв). "
        "Интервал 60–3600 с, таймаут меньше интервала, не больше 20 мониторов на пользователя.",
        request=MonitorInputSerializer,
        responses={201: MonitorOutputSerializer},
    ),
    update=extend_schema(
        summary="Заменить монитор",
        request=MonitorInputSerializer,
        responses=MonitorOutputSerializer,
    ),
    partial_update=extend_schema(
        summary="Изменить монитор",
        description="`is_active=false` ставит монитор на паузу (`PAUSED`), "
        "`is_active=true` возобновляет проверки (`PENDING`, проверка сразу).",
        request=MonitorInputSerializer,
        responses=MonitorOutputSerializer,
    ),
    destroy=extend_schema(summary="Удалить монитор", description="Вместе с историей проверок."),
)
@extend_schema(tags=["Monitors"])
class MonitorViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """CRUD for the current user's monitors."""

    http_method_names = ("get", "post", "put", "patch", "delete")
    serializer_class = MonitorOutputSerializer
    pagination_class = DefaultPagination
    lookup_value_regex = r"\d+"
    filterset_class = MonitorFilter
    multi_serializer_classes: ClassVar[dict] = {
        "create": MonitorInputSerializer,
        "update": MonitorInputSerializer,
        "partial_update": MonitorInputSerializer,
    }

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self._monitor_repository = MonitorRepository()
        self._monitor_service = MonitorService()

    def get_serializer_class(self):
        return self.multi_serializer_classes.get(self.action, MonitorOutputSerializer)

    def get_queryset(self) -> QuerySet[Monitor]:
        return self._monitor_repository.list_by_owner(owner_id=self.request.user.id)

    def get_object(self) -> Monitor:
        # Foreign monitors raise DoesNotExist -> 404, so their existence is not leaked
        return self._monitor_repository.get_by_id(
            monitor_id=self.kwargs["pk"], owner_id=self.request.user.id
        )

    def create(self, request: Request) -> Response:
        serializer = MonitorInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        monitor = self._monitor_service.create(
            owner_id=request.user.id, **serializer.validated_data
        )
        return Response(MonitorOutputSerializer(monitor).data, status=status.HTTP_201_CREATED)

    def update(self, request: Request, pk: int, partial: bool = False) -> Response:
        monitor = self.get_object()
        serializer = MonitorInputSerializer(monitor, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        monitor = self._monitor_service.update(monitor=monitor, **serializer.validated_data)
        return Response(MonitorOutputSerializer(monitor).data)

    def partial_update(self, request: Request, pk: int) -> Response:
        return self.update(request, pk, partial=True)

    def destroy(self, request: Request, pk: int) -> Response:
        self._monitor_service.delete(monitor=self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)
