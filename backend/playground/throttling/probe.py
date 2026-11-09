from rest_framework.throttling import SimpleRateThrottle


class PlaygroundProbeRateThrottle(SimpleRateThrottle):
    """Per-IP limit on the public playground endpoints (huge-body is 50 MB per call)."""

    scope = "playground_probe"

    def get_cache_key(self, request, view) -> str:
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}
