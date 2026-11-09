import logging
from typing import Any

from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


class DomainError(Exception):
    """Business rule violation raised by services and mapped to the unified error format."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    code: str = "domain_error"
    message: str = "Ошибка запроса"

    def __init__(
        self, message: str | None = None, *, fields: dict[str, list[str]] | None = None
    ) -> None:
        self.message = message or self.message
        self.fields = fields
        super().__init__(self.message)


def error_payload(
    *, code: str, message: str, fields: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Build the unified error body."""

    error: dict[str, Any] = {"code": code, "message": message}
    if fields is not None:
        error["fields"] = fields
    return {"error": error}


def _flatten_detail(detail: Any) -> str:
    """Pick a human-readable message from a DRF error detail."""

    if isinstance(detail, list):
        return _flatten_detail(detail[0]) if detail else ""
    if isinstance(detail, dict):
        # simplejwt wraps token errors as {"detail": ..., "code": ..., "messages": [...]}
        if "detail" in detail:
            return _flatten_detail(detail["detail"])
        return _flatten_detail(next(iter(detail.values()), ""))
    return str(detail)


def _normalize_fields(detail: Any) -> dict[str, Any]:
    """Convert DRF validation detail to {field: [messages]}."""

    if isinstance(detail, dict):
        fields: dict[str, Any] = {}
        for key, value in detail.items():
            if isinstance(value, dict):
                fields[key] = _normalize_fields(value)
            elif isinstance(value, list):
                fields[key] = [str(item) for item in value]
            else:
                fields[key] = [str(value)]
        return fields
    if isinstance(detail, list):
        return {"non_field_errors": [str(v) for v in detail]}
    return {"non_field_errors": [str(detail)]}


def unified_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """Render every API error as {"error": {"code", "message", "fields"?}}."""

    if isinstance(exc, DomainError):
        return Response(
            error_payload(code=exc.code, message=exc.message, fields=exc.fields),
            status=exc.status_code,
        )

    if isinstance(exc, exceptions.ValidationError):
        return Response(
            error_payload(
                code="validation_error",
                message="Некорректные данные",
                fields=_normalize_fields(exc.detail),
            ),
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    if isinstance(exc, Http404 | ObjectDoesNotExist):
        exc = exceptions.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = exceptions.PermissionDenied()

    response = exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API error", exc_info=exc)
        return Response(
            error_payload(code="server_error", message="Внутренняя ошибка сервера"),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    code = exc.default_code if isinstance(exc, exceptions.APIException) else "error"
    if isinstance(exc, exceptions.APIException) and isinstance(exc.detail, dict):
        code = str(exc.detail.get("code", code))
    response.data = error_payload(code=code, message=_flatten_detail(response.data))
    return response
