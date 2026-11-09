import pytest
from django.contrib.auth.hashers import identify_hasher
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient

from users.repositories import UserRepository
from users.services import AuthService
from users.throttling import AuthRateThrottle

pytestmark = pytest.mark.django_db

PASSWORD = "Str0ng-pass-123"


@pytest.fixture(autouse=True)
def _isolated_cache(settings):
    """Use in-memory cache so tests do not need Redis and throttles start clean."""

    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    cache.clear()


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


def _register(api_client, email="user@example.com", password=PASSWORD):
    return api_client.post(
        reverse("api:auth:register"), {"email": email, "password": password}, format="json"
    )


class TestRegister:
    def test_creates_user_with_argon2_hash(self, api_client):
        response = _register(api_client, email="User@Example.com")

        assert response.status_code == 201
        assert response.data["user"]["email"] == "user@example.com"
        assert response.data["tokens"]["access"] and response.data["tokens"]["refresh"]
        user = UserRepository().find_active_by_id(user_id=response.data["user"]["id"])
        assert identify_hasher(user.password).algorithm == "argon2"

    def test_duplicate_email_returns_field_error(self, api_client):
        _register(api_client)

        response = _register(api_client, email="USER@example.com")

        assert response.status_code == 422
        assert response.data["error"]["code"] == "validation_error"
        assert "email" in response.data["error"]["fields"]

    def test_weak_password_returns_field_error(self, api_client):
        response = _register(api_client, password="123")

        assert response.status_code == 422
        assert "password" in response.data["error"]["fields"]

    def test_invalid_email_returns_field_error(self, api_client):
        response = _register(api_client, email="not-an-email")

        assert response.status_code == 422
        assert "email" in response.data["error"]["fields"]


class TestLogin:
    def test_returns_tokens(self, api_client):
        AuthService().register(email="user@example.com", password=PASSWORD)

        response = api_client.post(
            reverse("api:auth:login"),
            {"email": "user@example.com", "password": PASSWORD},
            format="json",
        )

        assert response.status_code == 200
        assert response.data["tokens"]["access"]

    def test_wrong_password_returns_401(self, api_client):
        AuthService().register(email="user@example.com", password=PASSWORD)

        response = api_client.post(
            reverse("api:auth:login"),
            {"email": "user@example.com", "password": "wrong-password"},
            format="json",
        )

        assert response.status_code == 401
        assert response.data["error"]["code"] == "invalid_credentials"


class TestTokens:
    def test_me_requires_auth(self, api_client):
        response = api_client.get(reverse("api:auth:me"))

        assert response.status_code == 401
        assert response.data["error"]["code"] == "not_authenticated"

    def test_me_with_access_token(self, api_client):
        _, tokens = AuthService().register(email="user@example.com", password=PASSWORD)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens.access}")

        response = api_client.get(reverse("api:auth:me"))

        assert response.status_code == 200
        assert response.data["email"] == "user@example.com"

    def test_refresh_rotates_and_blacklists_old_token(self, api_client):
        _, tokens = AuthService().register(email="user@example.com", password=PASSWORD)
        url = reverse("api:auth:refresh")

        first = api_client.post(url, {"refresh": tokens.refresh}, format="json")
        reused = api_client.post(url, {"refresh": tokens.refresh}, format="json")

        assert first.status_code == 200
        assert first.data["refresh"] != tokens.refresh
        assert reused.status_code == 401
        assert reused.data["error"]["code"] == "token_not_valid"

    def test_logout_revokes_refresh_token(self, api_client):
        _, tokens = AuthService().register(email="user@example.com", password=PASSWORD)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens.access}")

        logout = api_client.post(
            reverse("api:auth:logout"), {"refresh": tokens.refresh}, format="json"
        )
        refresh = api_client.post(
            reverse("api:auth:refresh"), {"refresh": tokens.refresh}, format="json"
        )

        assert logout.status_code == 204
        assert refresh.status_code == 401

    def test_logout_rejects_foreign_refresh_token(self, api_client):
        _, own = AuthService().register(email="user@example.com", password=PASSWORD)
        _, foreign = AuthService().register(email="other@example.com", password=PASSWORD)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {own.access}")

        response = api_client.post(
            reverse("api:auth:logout"), {"refresh": foreign.refresh}, format="json"
        )

        assert response.status_code == 401


def test_auth_endpoints_are_throttled(api_client, monkeypatch):
    # DRF reads throttle rates at import time, so patch the class attribute
    monkeypatch.setattr(AuthRateThrottle, "THROTTLE_RATES", {"auth": "2/min"})
    url = reverse("api:auth:login")
    payload = {"email": "user@example.com", "password": "x"}

    statuses = [api_client.post(url, payload, format="json").status_code for _ in range(3)]

    assert statuses[-1] == 429
