from collections.abc import Iterable

import httpcore

from common.net import HostResolutionError, ensure_public_host


class SafeNetworkBackend(httpcore.SyncBackend):
    """TCP connector that only reaches public IPs.

    The host is resolved and validated on every connection (each redirect hop included),
    and the socket is opened to the validated IP itself: a DNS answer cannot change
    between the check and the connect (DNS rebinding). TLS still verifies the original
    host name, because httpcore passes it separately for SNI and certificate checks.
    """

    def connect_tcp(
        self,
        host: str,
        port: int,
        timeout: float | None = None,
        local_address: str | None = None,
        socket_options: Iterable | None = None,
    ) -> httpcore.NetworkStream:
        try:
            addresses = ensure_public_host(host, port)
        except HostResolutionError as exc:
            # Same wording as the OS error, so the probe reports it as a DNS failure
            raise httpcore.ConnectError(f"[Errno -2] Name or service not known: {host}") from exc

        last_error: Exception | None = None
        for address in addresses:
            try:
                return super().connect_tcp(
                    address,
                    port,
                    timeout=timeout,
                    local_address=local_address,
                    socket_options=socket_options,
                )
            except httpcore.ConnectError as exc:
                last_error = exc
        raise last_error or httpcore.ConnectError(f"No addresses for {host}")
