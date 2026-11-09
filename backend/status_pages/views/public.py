from django.http import Http404
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from status_pages.serializers import PublicStatusPageSerializer
from status_pages.services import PublicStatusPageService
from status_pages.throttling import PublicStatusPageRateThrottle


@extend_schema(
    tags=["Status pages"],
    summary="Публичная статус-страница",
    description="Без авторизации. Только название, статус и uptime выбранных публичных мониторов: "
    "URL, внутренние id и тексты ошибок не раскрываются. Ответ кэшируется на 30 секунд.",
    responses=PublicStatusPageSerializer,
)
class PublicStatusPageView(APIView):
    """Anonymous status page data for /status/{slug}."""

    http_method_names = ("get",)
    # No authentication at all: a stale token in the browser must not turn the page into a 401
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_classes = (PublicStatusPageRateThrottle,)

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self._public_status_page_service = PublicStatusPageService()

    def get(self, request: Request, slug: str) -> Response:
        snapshot = self._public_status_page_service.get(slug=slug)
        if snapshot is None:
            raise Http404
        response = Response(PublicStatusPageSerializer(snapshot).data)
        response["Cache-Control"] = "public, max-age=30"
        return response
