import time

import httpx

from checks import constants
from checks.choices import CheckErrorChoices
from checks.clients import HttpProbe

URL = "https://target.example/health"


def probe(handler, *, method="GET", timeout_ms=1000, expected=(200, 299)):
    return HttpProbe(transport=httpx.MockTransport(handler)).probe(
        url=URL,
        method=method,
        timeout_ms=timeout_ms,
        expected_status_from=expected[0],
        expected_status_to=expected[1],
    )


def test_ok():
    result = probe(lambda request: httpx.Response(200, text="ok"))

    assert result.ok
    assert result.status_code == 200
    assert result.response_time_ms is not None
    assert result.error_code == ""


def test_unexpected_status():
    result = probe(lambda request: httpx.Response(500))

    assert not result.ok
    assert result.status_code == 500
    assert result.error_code == CheckErrorChoices.UNEXPECTED_STATUS
    assert "500" in result.error


def test_custom_expected_range_accepts_redirect_code():
    result = probe(lambda request: httpx.Response(204), expected=(204, 204))

    assert result.ok


def test_timeout_without_response():
    def handler(request):
        raise httpx.ReadTimeout("timed out", request=request)

    result = probe(handler)

    assert not result.ok
    assert result.error_code == CheckErrorChoices.TIMEOUT


def test_slow_body_hits_total_deadline():
    def slow_body():
        yield b"a"
        time.sleep(0.3)
        yield b"b"

    result = probe(lambda request: httpx.Response(200, content=slow_body()), timeout_ms=200)

    assert result.error_code == CheckErrorChoices.TIMEOUT


def test_redirect_loop_is_cut():
    calls = []

    def handler(request):
        calls.append(request.url)
        return httpx.Response(302, headers={"Location": URL})

    result = probe(handler)

    assert result.error_code == CheckErrorChoices.TOO_MANY_REDIRECTS
    assert len(calls) == constants.MAX_REDIRECTS + 1


def test_huge_body_is_not_downloaded():
    chunk = b"x" * constants.BODY_CHUNK_BYTES
    produced = []

    def endless_body():
        while True:
            produced.append(1)
            yield chunk

    result = probe(lambda request: httpx.Response(200, content=endless_body()))

    assert result.error_code == CheckErrorChoices.BODY_TOO_LARGE
    assert result.status_code == 200
    downloaded = len(produced) * len(chunk)
    assert downloaded <= constants.MAX_BODY_BYTES + 2 * len(chunk)


def test_head_does_not_read_body():
    def handler(request):
        assert request.method == "HEAD"
        return httpx.Response(200)

    assert probe(handler, method="HEAD").ok


def test_dns_error():
    def handler(request):
        raise httpx.ConnectError("[Errno -2] Name or service not known", request=request)

    assert probe(handler).error_code == CheckErrorChoices.DNS_ERROR


def test_connection_refused():
    def handler(request):
        raise httpx.ConnectError("[Errno 111] Connection refused", request=request)

    result = probe(handler)

    assert result.error_code == CheckErrorChoices.CONNECTION_ERROR
    assert "Connection refused" in result.error
