"""SSRF guard: allow outgoing requests only to public internet addresses."""

import ipaddress
import socket
from urllib.parse import urlsplit

IpAddress = ipaddress.IPv4Address | ipaddress.IPv6Address

# Names that point inside the host or the cloud regardless of what public DNS says
BLOCKED_HOSTNAMES = frozenset(
    {
        "localhost",
        "metadata",
        "metadata.google.internal",
        "metadata.goog",
        "instance-data",
        "instance-data.ec2.internal",
    }
)
BLOCKED_HOST_SUFFIXES = (".localhost", ".internal", ".local")

# Cloud metadata / control-plane endpoints that sit in otherwise "global" ranges.
# Link-local 169.254.169.254, Alibaba 100.100.100.200 (CGNAT) and AWS fd00:ec2::254 (ULA)
# are already non-global; listed for clarity.
BLOCKED_NETWORKS = tuple(
    ipaddress.ip_network(network)
    for network in (
        "169.254.169.254/32",  # AWS / GCP / Azure / DigitalOcean / OpenStack metadata
        "100.100.100.200/32",  # Alibaba Cloud metadata
        "168.63.129.16/32",  # Azure WireServer
        "fd00:ec2::254/128",  # AWS metadata over IPv6
    )
)


class UnsafeTargetError(Exception):
    """Target resolves to a loopback, private, link-local or cloud metadata address."""


class HostResolutionError(Exception):
    """Host name could not be resolved."""


def is_public_ip(ip: IpAddress) -> bool:
    """True only for globally routable unicast addresses outside the blocklist."""

    if isinstance(ip, ipaddress.IPv6Address):
        # ::ffff:127.0.0.1 and 2002:7f00:1:: embed IPv4 targets
        embedded = ip.ipv4_mapped or ip.sixtofour
        if embedded is not None and not is_public_ip(embedded):
            return False
    if any(ip in network for network in BLOCKED_NETWORKS):
        return False
    # is_global excludes loopback, RFC 1918, link-local, CGNAT, ULA, reserved, documentation
    return ip.is_global and not ip.is_multicast


def resolve_host(host: str, port: int) -> list[str]:
    """Resolve a host (name or IP literal) to its unique IP addresses."""

    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError) as exc:
        raise HostResolutionError(f"Не удалось определить IP-адрес домена {host}") from exc
    return list(dict.fromkeys(info[4][0] for info in infos))


def ensure_public_host(host: str, port: int) -> list[str]:
    """Resolve the host and return its IPs; raise if any of them is not public."""

    name = host.strip("[]").rstrip(".").lower()
    if name in BLOCKED_HOSTNAMES or name.endswith(BLOCKED_HOST_SUFFIXES):
        raise UnsafeTargetError(f"Адрес {host} ведёт во внутреннюю сеть")

    addresses = resolve_host(name, port)
    for address in addresses:
        # Strip IPv6 zone index (fe80::1%eth0) before parsing
        ip = ipaddress.ip_address(address.split("%", 1)[0])
        if not is_public_ip(ip):
            # Any internal record blocks the host: the client may connect to any of them
            raise UnsafeTargetError(f"Адрес {host} ведёт во внутреннюю сеть ({ip})")
    return addresses


def ensure_public_url(url: str) -> list[str]:
    """Validate that the URL host resolves only to public addresses."""

    parts = urlsplit(url)
    if not parts.hostname:
        raise UnsafeTargetError("В URL не указан хост")
    try:
        port = parts.port or (443 if parts.scheme == "https" else 80)
    except ValueError as exc:
        raise UnsafeTargetError("Некорректный порт в URL") from exc
    return ensure_public_host(parts.hostname, port)
