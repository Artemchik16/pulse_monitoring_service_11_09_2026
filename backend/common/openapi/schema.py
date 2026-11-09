from drf_spectacular.openapi import AutoSchema
from drf_spectacular.utils import OpenApiResponse
from rest_framework.permissions import AllowAny

from common.openapi.serializers import ErrorResponseSerializer, ValidationErrorResponseSerializer

_ERROR_DESCRIPTIONS = {
    "401": "Нет токена, токен недействителен или истёк",
    "404": "Объект не найден или принадлежит другому пользователю",
    "422": "Ошибка валидации: сообщения по полям в `error.fields`",
    "429": "Слишком много запросов, повторите позже",
}


class PulseAutoSchema(AutoSchema):
    """Adds the unified error responses (401/404/422/429) to every operation that can return them."""

    def _get_response_bodies(self, direction="response"):
        responses = super()._get_response_bodies(direction=direction)
        for code in self._error_codes(declared=responses):
            declared = responses.get(code, {})
            if declared.get("content"):
                continue
            serializer = (
                ValidationErrorResponseSerializer if code == "422" else ErrorResponseSerializer
            )
            # Keep a view-specific description (e.g. "Invalid credentials") if one was declared
            description = declared.get("description") or _ERROR_DESCRIPTIONS.get(code, "")
            responses[code] = self._get_response_for_code(
                OpenApiResponse(serializer, description=description), code, direction=direction
            )
        return responses

    def _error_codes(self, *, declared: dict) -> list[str]:
        """Error codes this operation can produce."""

        codes = {code for code in declared if code.startswith(("4", "5"))}
        if self._requires_auth():
            codes.add("401")
        if "{" in self.path:
            codes.add("404")
        if self.method in ("POST", "PUT", "PATCH"):
            codes.add("422")
        if self.view.get_throttles():
            codes.add("429")
        return sorted(codes)

    def _requires_auth(self) -> bool:
        return any(
            not issubclass(permission, AllowAny) for permission in self.view.permission_classes
        )
