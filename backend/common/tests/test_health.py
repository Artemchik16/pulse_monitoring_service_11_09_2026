from unittest import mock

import pytest
from django.db import OperationalError
from rest_framework.test import APIClient

from common.services import health

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _redis_up(monkeypatch):
    """Tests do not depend on a running Redis; individual tests break it on purpose."""

    monkeypatch.setattr(health.redis.Redis, "ping", lambda self: True)


def test_healthy():
    response = APIClient().get("/health")

    assert response.status_code == 200
    assert response.data["status"] == "ok"
    assert response.data["checks"]["database"]["status"] == "ok"
    assert response.data["checks"]["redis"]["status"] == "ok"
    assert response["Cache-Control"] == "no-store"


def test_database_down_returns_503():
    with mock.patch.object(
        health.HealthService, "_check_database", side_effect=OperationalError("db host secret")
    ):
        response = APIClient().get("/health")

    assert response.status_code == 503
    assert response.data["status"] == "error"
    assert response.data["checks"]["database"] == {"status": "error"}
    # Connection details are logged, never returned
    assert b"secret" not in response.content


def test_redis_down_returns_503(monkeypatch):
    def ping(self):
        raise health.redis.ConnectionError("redis down")

    monkeypatch.setattr(health.redis.Redis, "ping", ping)

    response = APIClient().get("/health")

    assert response.status_code == 503
    assert response.data["checks"]["redis"]["status"] == "error"
    assert response.data["checks"]["database"]["status"] == "ok"


def test_no_auth_required_even_with_bad_token():
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION="Bearer broken")

    assert client.get("/health").status_code == 200
