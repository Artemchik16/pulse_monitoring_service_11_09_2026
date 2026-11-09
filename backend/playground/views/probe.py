"""Public playground endpoints that monitors call. Plain Django views on purpose: they stream
50 MB and hold connections open, which is HTTP behaviour, not an API resource."""

import json
import random
import time
from collections.abc import Iterator

from django.http import Http404, HttpRequest, HttpResponse, JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt

from common.exceptions import error_payload
from playground import constants
from playground.choices import PlaygroundModeChoices as Mode
from playground.repositories import PlaygroundTargetRepository
from playground.throttling import PlaygroundProbeRateThrottle

WRONG_CONTENT_HTML = """<!doctype html>
<html><head><title>502 Bad Gateway</title></head>
<body><h1>502 Bad Gateway</h1><p>The upstream server returned an invalid response.</p>
<hr><address>nginx</address></body></html>
"""


def _huge_body() -> Iterator[bytes]:
    """50 MB generated chunk by chunk: never held in memory."""

    chunk = b"x" * constants.HUGE_BODY_CHUNK_BYTES
    for _ in range(constants.HUGE_BODY_BYTES // constants.HUGE_BODY_CHUNK_BYTES):
        yield chunk


def _respond(mode: str, request: HttpRequest) -> HttpResponse:
    if mode == Mode.OK:
        time.sleep(constants.OK_DELAY_SEC)
        return JsonResponse({"status": "ok"})
    if mode == Mode.ERROR:
        return JsonResponse({"status": "error", "message": "Internal Server Error"}, status=500)
    if mode == Mode.SLOW:
        time.sleep(random.uniform(*constants.SLOW_DELAY_SEC))
        return JsonResponse({"status": "ok", "slow": True})
    if mode == Mode.HANG:
        # Accept the connection and say nothing for longer than any monitor waits
        time.sleep(constants.HANG_SEC)
        return JsonResponse({"status": "too late"})
    if mode == Mode.FLAPPING:
        if random.random() < constants.FLAPPING_FAILURE_RATE:
            return JsonResponse({"status": "unavailable"}, status=503)
        return JsonResponse({"status": "ok"})
    if mode == Mode.REDIRECT_LOOP:
        hop = int(request.GET.get(constants.REDIRECT_LOOP_PARAM, "0") or 0) + 1
        response = HttpResponse(status=302)
        response["Location"] = f"{request.path}?{constants.REDIRECT_LOOP_PARAM}={hop}"
        return response
    if mode == Mode.HUGE_BODY:
        response = StreamingHttpResponse(_huge_body(), content_type="application/octet-stream")
        response["Content-Length"] = str(constants.HUGE_BODY_BYTES)
        return response
    if mode == Mode.WRONG_CONTENT:
        return HttpResponse(WRONG_CONTENT_HTML, content_type="text/html; charset=utf-8")
    raise Http404


@csrf_exempt
def playground_probe(request: HttpRequest, slug: str) -> HttpResponse:
    """GET/HEAD/POST /api/v1/playground/{slug}: behave according to the endpoint's current mode."""

    throttle = PlaygroundProbeRateThrottle()
    if not throttle.allow_request(request, None):
        return HttpResponse(
            json.dumps(
                error_payload(code="throttled", message="Слишком много запросов к полигону")
            ),
            status=429,
            content_type="application/json",
            headers={"Retry-After": str(int(throttle.wait() or 60))},
        )
    mode = PlaygroundTargetRepository().find_mode(slug=slug)
    if mode is None:
        raise Http404
    response = _respond(mode, request)
    response["Cache-Control"] = "no-store"
    return response
