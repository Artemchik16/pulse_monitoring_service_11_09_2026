import pytest
from rest_framework.test import APIClient


@pytest.fixture(autouse=True)
def _isolated_cache(settings):
    """Use in-memory cache so tests do not need Redis and throttles start clean."""

    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    from django.core.cache import cache

    cache.clear()


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()
