import pytest
from django.urls import resolve, reverse

# Literal paths: reverse() alone cannot catch a broken prefix, it builds the same wrong URL
ROUTES = [
    ("/api/v1/auth/register", "api:auth:register", {}),
    ("/api/v1/auth/login", "api:auth:login", {}),
    ("/api/v1/auth/refresh", "api:auth:refresh", {}),
    ("/api/v1/auth/logout", "api:auth:logout", {}),
    ("/api/v1/auth/me", "api:auth:me", {}),
    ("/api/v1/monitors", "api:monitors:monitor-list", {}),
    ("/api/v1/monitors/7", "api:monitors:monitor-detail", {"pk": 7}),
    ("/api/v1/monitors/7/stats", "api:stats:monitor-stats", {"monitor_id": 7}),
    ("/api/v1/monitors/summary", "api:stats:monitors-summary", {}),
    ("/api/v1/monitors/7/checks", "api:checks:monitor-checks", {"monitor_id": 7}),
    ("/api/v1/incidents", "api:incidents:incident-list", {}),
    ("/api/v1/incidents/3", "api:incidents:incident-detail", {"pk": 3}),
    ("/api/docs", "swagger-docs", {}),
    ("/api/schema", "schema", {}),
]


@pytest.mark.parametrize(("path", "name", "kwargs"), ROUTES)
def test_route(path, name, kwargs):
    assert reverse(name, kwargs=kwargs) == path
    assert resolve(path).view_name == name
