from rest_framework.request import Request
from rest_framework.throttling import SimpleRateThrottle


class PublicStatusPageRateThrottle(SimpleRateThrottle):
    """Per-IP limit for the anonymous status page endpoint."""

    scope = "public_status_page"

    def get_cache_key(self, request: Request, view) -> str:
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}
