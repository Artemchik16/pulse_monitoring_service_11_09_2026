from django.db.models import QuerySet
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics

from checks.filters import CheckResultFilter
from checks.models import CheckResult
from checks.repositories import CheckResultRepository
from checks.serializers import CheckResultOutputSerializer
from common.pagination import DefaultPagination
from monitors.repositories import MonitorRepository


@extend_schema(
    tags=["Monitors"],
    summary="История проверок монитора",
    description="Последние проверки, новые первыми, с пагинацией. `?ok=false` — только неудачные. "
    "У неудачной проверки `error_code` и понятная причина в `error`.",
    responses={200: CheckResultOutputSerializer(many=True), 422: OpenApiResponse()},
)
class MonitorChecksView(generics.ListAPIView):
    """Paginated check history of the current user's monitor."""

    http_method_names = ("get",)
    serializer_class = CheckResultOutputSerializer
    pagination_class = DefaultPagination
    filterset_class = CheckResultFilter

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self._monitor_repository = MonitorRepository()
        self._check_result_repository = CheckResultRepository()

    def get_queryset(self) -> QuerySet[CheckResult]:
        if getattr(self, "swagger_fake_view", False):
            return self._check_result_repository.none()
        # Ownership first: a foreign monitor raises DoesNotExist -> 404
        monitor = self._monitor_repository.get_by_id(
            monitor_id=self.kwargs["monitor_id"], owner_id=self.request.user.id
        )
        return self._check_result_repository.list_by_monitor(monitor_id=monitor.id)
