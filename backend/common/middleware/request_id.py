import logging
import re
import time
import uuid
from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

from common.logging import reset_request_id, set_request_id

logger = logging.getLogger("pulse.access")

REQUEST_ID_HEADER = "X-Request-ID"
# Accept ids from a proxy/client only if they are short and safe to log
_VALID_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


class RequestIdMiddleware:
    """Give every request an id, expose it in X-Request-ID and write a JSON access log line."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        incoming = request.headers.get(REQUEST_ID_HEADER, "")
        request_id = incoming if _VALID_REQUEST_ID.match(incoming) else uuid.uuid4().hex
        request.request_id = request_id
        token = set_request_id(request_id)
        started = time.perf_counter()
        try:
            response = self.get_response(request)
            response[REQUEST_ID_HEADER] = request_id
            self._log(request, response, started)
            return response
        finally:
            reset_request_id(token)

    @staticmethod
    def _log(request: HttpRequest, response: HttpResponse, started: float) -> None:
        user = getattr(request, "user", None)
        logger.info(
            "%s %s %s",
            request.method,
            request.path,
            response.status_code,
            extra={
                "method": request.method,
                "path": request.path,
                "status_code": response.status_code,
                "duration_ms": round((time.perf_counter() - started) * 1000, 1),
                "user_id": user.pk if user is not None and user.is_authenticated else None,
            },
        )
