from drf_spectacular.utils import extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from stats.serializers import MonitorsSummaryOutputSerializer
from stats.services import MonitorsSummaryService


@extend_schema(
    tags=["Stats"],
    summary="Сводка для дашборда",
    description="По каждому монитору пользователя: последняя проверка, uptime за 24 часа и "
    "мини-график (среднее время ответа и uptime по часам). Один запрос на весь дашборд; "
    "ответ кэшируется на 15 секунд.",
    responses=MonitorsSummaryOutputSerializer,
)
class MonitorsSummaryView(APIView):
    """Dashboard summary of all the current user's monitors."""

    http_method_names = ("get",)

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self._monitors_summary_service = MonitorsSummaryService()

    def get(self, request: Request) -> Response:
        results = self._monitors_summary_service.get(owner_id=request.user.id)
        return Response(MonitorsSummaryOutputSerializer({"results": results}).data)
