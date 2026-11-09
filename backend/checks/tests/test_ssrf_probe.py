import socket
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from checks.choices import CheckErrorChoices
from checks.clients import HttpProbe, safe_network_backend
from common.net import ensure_public_host
from common.tests.test_ssrf import fake_dns


def probe(url: str):
    return HttpProbe().probe(
        url=url, method="GET", timeout_ms=2000, expected_status_from=200, expected_status_to=399
    )


@pytest.mark.parametrize(
    "url",
    ["http://127.0.0.1:1/", "http://localhost:8000/", "http://169.254.169.254/latest/meta-data/"],
)
def test_probe_refuses_internal_targets(url, monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", fake_dns({}))

    result = probe(url)

    assert not result.ok
    assert result.error_code == CheckErrorChoices.BLOCKED_ADDRESS


def test_dns_rebinding_is_blocked_at_check_time(monkeypatch):
    # Validated as public when the monitor was created, now points to loopback
    monkeypatch.setattr(socket, "getaddrinfo", fake_dns({"rebind.example": ["127.0.0.1"]}))

    result = probe("http://rebind.example/")

    assert result.error_code == CheckErrorChoices.BLOCKED_ADDRESS
    assert "127.0.0.1" in result.error


def test_unresolvable_host_is_reported_as_dns_error(monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", fake_dns({}))

    assert probe("http://no-such-host.example/").error_code == CheckErrorChoices.DNS_ERROR


@pytest.fixture
def local_server():
    """Local server: /ok answers 200, /redirect points to the cloud metadata endpoint."""

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == "/ok":
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"ok")
                return
            self.send_response(302)
            self.send_header("Location", "http://169.254.169.254/latest/meta-data/")
            self.end_headers()

        def log_message(self, *args):
            pass

    server = HTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield server.server_address[1]
    server.shutdown()


@pytest.fixture
def public_alias(monkeypatch):
    """Treat "site.example" as a public host that resolves to the local test server."""

    def guard(host, port):
        if host == "site.example":
            return ["127.0.0.1"]
        return ensure_public_host(host, port)

    monkeypatch.setattr(safe_network_backend, "ensure_public_host", guard)
    monkeypatch.setattr(socket, "getaddrinfo", fake_dns({}))


def test_connects_to_validated_ip(local_server, public_alias):
    result = probe(f"http://site.example:{local_server}/ok")

    assert result.ok
    assert result.status_code == 200


def test_redirect_to_internal_address_is_blocked(local_server, public_alias):
    result = probe(f"http://site.example:{local_server}/redirect")

    assert result.error_code == CheckErrorChoices.BLOCKED_ADDRESS
    assert "169.254.169.254" in result.error
