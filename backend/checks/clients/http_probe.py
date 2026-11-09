import socket
import ssl
import time
from dataclasses import dataclass

import httpx

from checks import constants
from checks.choices import CheckErrorChoices


@dataclass(frozen=True)
class ProbeResult:
    """Outcome of one HTTP probe."""

    ok: bool
    status_code: int | None = None
    response_time_ms: int | None = None
    error_code: str = ""
    error: str = ""


class _DeadlineExceeded(Exception):
    """Total probe time budget is spent."""


class _BodyTooLarge(Exception):
    """Response body exceeds the size limit."""


class HttpProbe:
    """HTTP client for checking user URLs with strict time, size and redirect limits."""

    def __init__(self, *, transport: httpx.BaseTransport | None = None) -> None:
        # transport is injectable so tests can simulate any server behaviour
        self._transport = transport

    def probe(
        self,
        *,
        url: str,
        method: str,
        timeout_ms: int,
        expected_status_from: int,
        expected_status_to: int,
    ) -> ProbeResult:
        """Request the URL and classify the outcome."""

        timeout_sec = timeout_ms / 1000
        started = time.perf_counter()
        deadline = started + timeout_sec
        try:
            with self._client(timeout_sec=timeout_sec) as client:
                with client.stream(method, url) as response:
                    response_time_ms = self._elapsed_ms(started)
                    if method != "HEAD":
                        self._drain_body(response=response, deadline=deadline)
        except _DeadlineExceeded:
            return self._fail(CheckErrorChoices.TIMEOUT, f"Нет полного ответа за {timeout_sec:g} с")
        except _BodyTooLarge:
            limit_mb = constants.MAX_BODY_BYTES // (1024 * 1024)
            return self._fail(
                CheckErrorChoices.BODY_TOO_LARGE,
                f"Ответ больше {limit_mb} МБ, загрузка прервана",
                status_code=response.status_code,
                response_time_ms=response_time_ms,
            )
        except httpx.TimeoutException:
            return self._fail(CheckErrorChoices.TIMEOUT, f"Нет ответа за {timeout_sec:g} с")
        except httpx.TooManyRedirects:
            return self._fail(
                CheckErrorChoices.TOO_MANY_REDIRECTS,
                f"Больше {constants.MAX_REDIRECTS} редиректов подряд",
            )
        except (httpx.InvalidURL, httpx.UnsupportedProtocol) as exc:
            return self._fail(CheckErrorChoices.INVALID_URL, f"Некорректный URL: {exc}")
        except httpx.ConnectError as exc:
            return self._connect_failure(exc)
        except httpx.HTTPError as exc:
            return self._fail(CheckErrorChoices.CONNECTION_ERROR, f"Ошибка соединения: {exc}")

        if not expected_status_from <= response.status_code <= expected_status_to:
            return self._fail(
                CheckErrorChoices.UNEXPECTED_STATUS,
                f"Код ответа {response.status_code}, ожидался "
                f"{expected_status_from}–{expected_status_to}",
                status_code=response.status_code,
                response_time_ms=response_time_ms,
            )
        return ProbeResult(
            ok=True, status_code=response.status_code, response_time_ms=response_time_ms
        )

    def _client(self, *, timeout_sec: float) -> httpx.Client:
        """Build a client with the probe limits."""

        return httpx.Client(
            timeout=httpx.Timeout(timeout_sec),
            follow_redirects=True,
            max_redirects=constants.MAX_REDIRECTS,
            headers={"User-Agent": constants.USER_AGENT},
            transport=self._transport,
        )

    def _drain_body(self, *, response: httpx.Response, deadline: float) -> None:
        """Read the body up to the size limit, enforcing the total time budget."""

        received = 0
        for chunk in response.iter_bytes(chunk_size=constants.BODY_CHUNK_BYTES):
            received += len(chunk)
            if received > constants.MAX_BODY_BYTES:
                raise _BodyTooLarge()
            if time.perf_counter() > deadline:
                raise _DeadlineExceeded()

    def _connect_failure(self, exc: httpx.ConnectError) -> ProbeResult:
        """Tell DNS and TLS failures apart from plain connection errors."""

        cause = exc.__cause__ or exc.__context__
        if isinstance(cause, socket.gaierror) or "Name or service not known" in str(exc):
            return self._fail(CheckErrorChoices.DNS_ERROR, "Не удалось определить IP-адрес домена")
        if isinstance(cause, ssl.SSLError) or "SSL" in str(exc) or "certificate" in str(exc):
            return self._fail(CheckErrorChoices.SSL_ERROR, f"Ошибка TLS/SSL: {exc}")
        return self._fail(CheckErrorChoices.CONNECTION_ERROR, f"Ошибка соединения: {exc}")

    @staticmethod
    def _elapsed_ms(started: float) -> int:
        return int((time.perf_counter() - started) * 1000)

    @staticmethod
    def _fail(error_code: str, error: str, **fields) -> ProbeResult:
        return ProbeResult(ok=False, error_code=error_code, error=error[:500], **fields)
