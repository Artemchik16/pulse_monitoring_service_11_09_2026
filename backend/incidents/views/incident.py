from django.db.models import QuerySet
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import mixins, viewsets

from common.pagination import DefaultPagination
from incidents.filters import IncidentFilter
from incidents.models import Incident
from incidents.repositories import IncidentRepository
from incidents.serializers import IncidentOutputSerializer


@extend_schema_view(
    list=extend_schema(
        summary="Список инцидентов",
        description="Инциденты своих мониторов, новые первыми. "
        "Фильтры: `monitor` (id монитора), `is_open`.",
        responses={200: IncidentOutputSerializer(many=True), 422: OpenApiResponse()},
    ),
    retrieve=extend_schema(summary="Инцидент", responses=IncidentOutputSerializer),
)
@extend_schema(tags=["Incidents"])
class IncidentViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Incidents of the current user's monitors (read-only: they are opened/closed by checks)."""

    http_method_names = ("get",)
    serializer_class = IncidentOutputSerializer
    pagination_class = DefaultPagination
    filterset_class = IncidentFilter
    lookup_value_regex = r"\d+"

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self._incident_repository = IncidentRepository()

    def get_queryset(self) -> QuerySet[Incident]:
        return self._incident_repository.list_by_owner(owner_id=self.request.user.id)

    def get_object(self) -> Incident:
        # Incidents of foreign monitors raise DoesNotExist -> 404
        return self._incident_repository.get_by_id(
            incident_id=self.kwargs["pk"], owner_id=self.request.user.id
        )
