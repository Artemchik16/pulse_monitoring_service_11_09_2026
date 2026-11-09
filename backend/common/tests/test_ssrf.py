import ipaddress
import socket

import pytest

from common.net import (
    HostResolutionError,
    UnsafeTargetError,
    ensure_public_host,
    ensure_public_url,
    is_public_ip,
)

PUBLIC_IP = "93.184.215.14"


def fake_dns(mapping: dict[str, list[str]]):
    """getaddrinfo replacement: names from the mapping, numeric hosts via the OS parser."""

    real_getaddrinfo = socket.getaddrinfo

    def getaddrinfo(host, port, *args, **kwargs):
        if host in mapping:
            return [
                (
                    socket.AF_INET6 if ":" in ip else socket.AF_INET,
                    socket.SOCK_STREAM,
                    6,
                    "",
                    (ip, port),
                )
                for ip in mapping[host]
            ]
        # Numeric hosts in any notation the OS accepts (2130706433, 0x7f000001, 127.1),
        # without touching the network; unknown names fail like NXDOMAIN
        try:
            return real_getaddrinfo(
                host, port, type=socket.SOCK_STREAM, flags=socket.AI_NUMERICHOST
            )
        except socket.gaierror:
            raise socket.gaierror(socket.EAI_NONAME, "Name or service not known") from None

    return getaddrinfo


@pytest.mark.parametrize(
    "address",
    [
        "127.0.0.1",
        "127.10.20.30",
        "10.0.0.1",
        "172.16.0.1",
        "172.31.255.254",
        "192.168.1.1",
        "169.254.169.254",
        "169.254.1.1",
        "100.100.100.200",
        "168.63.129.16",
        "0.0.0.0",
        "100.64.0.1",
        "224.0.0.1",
        "::1",
        "::",
        "fe80::1",
        "fc00::1",
        "fd00:ec2::254",
        "::ffff:127.0.0.1",
        "::ffff:10.0.0.1",
        "2002:7f00:1::",
    ],
)
def test_internal_addresses_are_not_public(address):
    assert not is_public_ip(ipaddress.ip_address(address))


@pytest.mark.parametrize("address", [PUBLIC_IP, "8.8.8.8", "172.32.0.1", "2606:4700::1111"])
def test_public_addresses(address):
    assert is_public_ip(ipaddress.ip_address(address))


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost/",
        "http://LOCALHOST:8000/admin",
        "http://app.localhost/",
        "http://metadata.google.internal/computeMetadata/v1/",
        "http://127.0.0.1:5432/",
        "http://[::1]/",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.1.2.3/",
        "http://192.168.0.1/",
        "http://172.20.0.5/",
        # Alternative IPv4 notations resolve to 127.0.0.1 too
        "http://2130706433/",
        "http://0x7f000001/",
        "http://127.1/",
    ],
)
def test_internal_urls_are_rejected(url, monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", fake_dns({}))

    with pytest.raises(UnsafeTargetError):
        ensure_public_url(url)


def test_name_resolving_to_private_ip_is_rejected(monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", fake_dns({"evil.example": ["10.0.0.7"]}))

    with pytest.raises(UnsafeTargetError, match="10.0.0.7"):
        ensure_public_url("https://evil.example/")


def test_any_private_record_rejects_the_host(monkeypatch):
    monkeypatch.setattr(
        socket, "getaddrinfo", fake_dns({"mixed.example": [PUBLIC_IP, "127.0.0.1"]})
    )

    with pytest.raises(UnsafeTargetError):
        ensure_public_host("mixed.example", 443)


def test_public_name_is_allowed(monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", fake_dns({"site.example": [PUBLIC_IP]}))

    assert ensure_public_url("https://site.example/health") == [PUBLIC_IP]


def test_unresolvable_name(monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", fake_dns({}))

    with pytest.raises(HostResolutionError):
        ensure_public_url("https://no-such-host.example/")
