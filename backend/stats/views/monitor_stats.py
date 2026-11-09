from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from stats.serializers import MonitorStatsOutputSerializer, MonitorStatsQuerySerializer
from stats.services import MonitorStatsService


@extend_schema(
    tags=["Stats"],
    parameters=[MonitorStatsQuerySerializer],
    responses={
        200: MonitorStatsOutputSerializer,
        404: OpenApiResponse(description="Monitor not found"),
        422: OpenApiResponse(description="Invalid period"),
    },
)
class MonitorStatsView(APIView):
    """Uptime, response time (avg, p95), incident count and chart series of a monitor."""

    http_method_names = ("get",)

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self._monitor_stats_service = MonitorStatsService()

    def get(self, request: Request, monitor_id: int) -> Response:
        query = MonitorStatsQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        stats = self._monitor_stats_service.get(
            monitor_id=monitor_id, owner_id=request.user.id, period=query.validated_data["period"]
        )
        return Response(MonitorStatsOutputSerializer(stats).data)
