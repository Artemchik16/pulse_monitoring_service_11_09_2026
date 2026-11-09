from django.http import HttpRequest, JsonResponse

from common.exceptions import error_payload


def not_found(request: HttpRequest, exception: Exception | None = None) -> JsonResponse:
    """JSON 404 for URLs that match no route."""

    return JsonResponse(error_payload(code="not_found", message="Не найдено"), status=404)


def server_error(request: HttpRequest) -> JsonResponse:
    """JSON 500 for errors raised outside DRF views."""

    return JsonResponse(
        error_payload(code="server_error", message="Внутренняя ошибка сервера"), status=500
    )
