from rest_framework.request import Request
from rest_framework.throttling import SimpleRateThrottle


class AuthRateThrottle(SimpleRateThrottle):
    """Limit auth endpoints per client IP to slow down password brute force."""

    scope = "auth"

    def get_cache_key(self, request: Request, view) -> str:
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}
