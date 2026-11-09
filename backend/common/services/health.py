import logging
import time
from collections.abc import Callable

import redis
from django.conf import settings
from django.db import connection

logger = logging.getLogger(__name__)

# Health must answer fast even when a dependency hangs
REDIS_TIMEOUT_SEC = 2


class HealthService:
    """Check that the dependencies the app cannot work without are reachable."""

    def check(self) -> dict:
        """Return {"status": "ok"|"error", "checks": {name: {...}}}."""

        checks = {
            "database": self._run("database", self._check_database),
            "redis": self._run("redis", self._check_redis),
        }
        healthy = all(item["status"] == "ok" for item in checks.values())
        return {"status": "ok" if healthy else "error", "checks": checks}

    @staticmethod
    def _run(name: str, probe: Callable[[], None]) -> dict:
        started = time.perf_counter()
        try:
            probe()
        except Exception:
            # Details (hosts, credentials in DSN errors) go to logs only, never to the response
            logger.exception("Health check failed", extra={"check": name})
            return {"status": "error"}
        return {"status": "ok", "latency_ms": round((time.perf_counter() - started) * 1000, 1)}

    @staticmethod
    def _check_database() -> None:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")

    @staticmethod
    def _check_redis() -> None:
        client = redis.Redis.from_url(
            settings.REDIS_URL,
            socket_connect_timeout=REDIS_TIMEOUT_SEC,
            socket_timeout=REDIS_TIMEOUT_SEC,
        )
        try:
            client.ping()
        finally:
            client.close()
