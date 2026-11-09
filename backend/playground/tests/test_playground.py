import socket
from unittest import mock

import httpx
import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from checks.choices import CheckErrorChoices
from checks.clients import HttpProbe
from common.net import UnsafeTargetError, ensure_public_host
from playground import constants
from playground.repositories import PlaygroundTargetRepository
from users.services import AuthService

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _env(settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    cache.clear()


@pytest.fixture(autouse=True)
def _no_sleep():
    with mock.patch("playground.views.probe.time.sleep") as sleep:
        yield sleep


def probe(slug: str, **params):
    return APIClient().get(f"/api/v1/playground/{slug}", params)


def test_modes_answer_as_described(_no_sleep):
    assert probe("ok").status_code == 200
    assert probe("error").status_code == 500
    assert probe("slow").status_code == 200
    assert probe("hang").status_code == 200
    # hang sleeps longer than any monitor waits
    assert _no_sleep.call_args.args[0] == constants.HANG_SEC > 60

    redirect = probe("redirect-loop", hop=3)
    assert redirect.status_code == 302
    assert redirect["Location"] == "/api/v1/playground/redirect-loop?hop=4"

    wrong = probe("wrong-content")
    assert wrong.status_code == 200
    assert wrong["Content-Type"].startswith("text/html")

    huge = probe("huge-body")
    assert huge.streaming
    assert huge["Content-Length"] == str(constants.HUGE_BODY_BYTES)
    assert len(next(iter(huge.streaming_content))) == constants.HUGE_BODY_CHUNK_BYTES


@pytest.mark.parametrize(("roll", "status"), [(0.1, 503), (0.9, 200)])
def test_flapping(roll, status):
    with mock.patch("playground.views.probe.random.random", return_value=roll):
        assert probe("flapping").status_code == status


def test_unknown_endpoint():
    assert probe("nope").status_code == 404


def test_switching_requires_sign_in_and_changes_behaviour():
    assert (
        APIClient()
        .patch("/api/v1/playground/targets/ok", {"mode": "error"}, format="json")
        .status_code
        == 401
    )

    user, _ = AuthService().register(email="u@example.com", password="Str0ng-pass-123")
    client = APIClient()
    client.force_authenticate(user)
    listed = client.get("/api/v1/playground/targets").data
    switched = client.patch("/api/v1/playground/targets/ok", {"mode": "error"}, format="json")

    assert [t["slug"] for t in listed] == [
        "ok",
        "error",
        "slow",
        "hang",
        "flapping",
        "redirect-loop",
        "huge-body",
        "wrong-content",
    ]
    assert switched.data["mode"] == "error"
    assert probe("ok").status_code == 500
    assert (
        client.patch("/api/v1/playground/targets/ok", {"mode": "nope"}, format="json").status_code
        == 422
    )
    assert PlaygroundTargetRepository().find_mode(slug="ok") == "error"


def content_probe(body: bytes, content_type: str, **checks):
    transport = httpx.MockTransport(
        lambda request: httpx.Response(200, content=body, headers={"Content-Type": content_type})
    )
    return HttpProbe(transport=transport).probe(
        url="https://a.example/",
        method="GET",
        timeout_ms=2000,
        expected_status_from=200,
        expected_status_to=299,
        **checks,
    )


def test_content_checks():
    html = b"<html>502 Bad Gateway</html>"
    assert (
        content_probe(html, "text/html", expect_json=True).error_code
        == CheckErrorChoices.INVALID_JSON
    )
    assert "text/html" in content_probe(html, "text/html", expect_json=True).error
    assert content_probe(b'{"status": "ok"}', "application/json", expect_json=True).ok
    assert (
        content_probe(b"hello", "text/plain", body_contains="world").error_code
        == CheckErrorChoices.CONTENT_MISMATCH
    )
    assert content_probe(b"hello world", "text/plain", body_contains="world").ok


def test_content_check_needs_a_body():
    user, _ = AuthService().register(email="u@example.com", password="Str0ng-pass-123")
    client = APIClient()
    client.force_authenticate(user)
    with mock.patch(
        "socket.getaddrinfo",
        return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.215.14", 443))],
    ):
        response = client.post(
            "/api/v1/monitors",
            {"name": "x", "url": "https://example.com", "method": "HEAD", "expect_json": True},
            format="json",
        )
    assert response.status_code == 422
    assert "method" in response.data["error"]["fields"]


def test_ssrf_allowlist_is_exact_hostnames(settings):
    settings.SSRF_ALLOWED_HOSTS = ["localhost"]
    assert ensure_public_host("localhost", 8000)  # our own backend: allowed
    with pytest.raises(UnsafeTargetError):
        ensure_public_host("127.0.0.1", 8000)  # same address by IP: still blocked
