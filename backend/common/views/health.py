from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from common.services import HealthService

_CHECK = inline_serializer(
    "HealthCheck",
    fields={
        "status": serializers.ChoiceField(choices=("ok", "error")),
        "latency_ms": serializers.FloatField(required=False),
    },
)
_HEALTH = inline_serializer(
    "Health",
    fields={
        "status": serializers.ChoiceField(choices=("ok", "error")),
        "checks": inline_serializer("HealthChecks", fields={"database": _CHECK, "redis": _CHECK}),
    },
)


@extend_schema(
    tags=["Health"],
    summary="Проверка работоспособности",
    description="Проверяет доступность PostgreSQL и Redis. 200 — всё работает, 503 — нет.",
    responses={200: _HEALTH, 503: OpenApiResponse(_HEALTH, description="Зависимость недоступна")},
)
class HealthView(APIView):
    """Liveness/readiness probe for the hosting platform and CI."""

    http_method_names = ("get", "head")
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_classes = ()

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self._health_service = HealthService()

    def get(self, request: Request) -> Response:
        report = self._health_service.check()
        healthy = report["status"] == "ok"
        response = Response(
            report, status=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        )
        response["Cache-Control"] = "no-store"
        return response
