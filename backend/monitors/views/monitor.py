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

_VALIDATION_ERROR = OpenApiResponse(description="Validation error")
_NOT_FOUND = OpenApiResponse(description="Monitor not found")


@extend_schema_view(
    list=extend_schema(responses=MonitorOutputSerializer(many=True)),
    retrieve=extend_schema(responses={200: MonitorOutputSerializer, 404: _NOT_FOUND}),
    create=extend_schema(
        request=MonitorInputSerializer,
        responses={201: MonitorOutputSerializer, 422: _VALIDATION_ERROR},
    ),
    update=extend_schema(
        request=MonitorInputSerializer,
        responses={200: MonitorOutputSerializer, 404: _NOT_FOUND, 422: _VALIDATION_ERROR},
    ),
    partial_update=extend_schema(
        request=MonitorInputSerializer,
        responses={200: MonitorOutputSerializer, 404: _NOT_FOUND, 422: _VALIDATION_ERROR},
    ),
    destroy=extend_schema(responses={204: None, 404: _NOT_FOUND}),
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
