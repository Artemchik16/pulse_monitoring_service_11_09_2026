import pytest
from rest_framework.test import APIClient

from common.services import health

pytestmark = pytest.mark.django_db

FRONTEND = "https://pulse-frontend.example"


@pytest.fixture(autouse=True)
def _settings(settings, monkeypatch):
    settings.CORS_ALLOWED_ORIGINS = [FRONTEND]
    monkeypatch.setattr(health.redis.Redis, "ping", lambda self: True)


def preflight(origin: str):
    return APIClient().options(
        "/api/v1/auth/login",
        HTTP_ORIGIN=origin,
        HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        HTTP_ACCESS_CONTROL_REQUEST_HEADERS="authorization,content-type,x-request-id",
    )


def test_frontend_origin_is_allowed():
    response = preflight(FRONTEND)

    assert response["Access-Control-Allow-Origin"] == FRONTEND
    allowed = response["Access-Control-Allow-Headers"].lower()
    assert "authorization" in allowed
    assert "x-request-id" in allowed


def test_other_origins_are_rejected():
    response = preflight("https://evil.example")

    assert "Access-Control-Allow-Origin" not in response


def test_request_id_is_readable_by_frontend():
    response = APIClient().get("/health", HTTP_ORIGIN=FRONTEND)

    assert response["Access-Control-Allow-Origin"] == FRONTEND
    assert "x-request-id" in response["Access-Control-Expose-Headers"].lower()
