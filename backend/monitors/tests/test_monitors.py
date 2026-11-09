import socket

import pytest
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient

from common.tests.test_ssrf import PUBLIC_IP, fake_dns
from monitors.choices import MonitorStatusChoices
from monitors.constants import MAX_MONITORS_PER_USER
from monitors.repositories import MonitorRepository
from monitors.services import MonitorService
from users.services import AuthService

pytestmark = pytest.mark.django_db

LIST_URL = reverse("api:monitors:monitor-list")
VALID_MONITOR = {
    "name": "Example",
    "url": "https://example.com/health",
    "method": "GET",
    "interval_sec": 60,
    "timeout_ms": 5000,
}


def detail_url(monitor_id: int) -> str:
    return reverse("api:monitors:monitor-detail", kwargs={"pk": monitor_id})


@pytest.fixture(autouse=True)
def _isolated_cache(settings):
    """Use in-memory cache so tests do not need Redis."""

    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    cache.clear()


@pytest.fixture(autouse=True)
def _fake_dns(monkeypatch):
    """Deterministic DNS: tests never hit the network."""

    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        fake_dns({"example.com": [PUBLIC_IP], "internal.example": ["10.0.0.5"]}),
    )


@pytest.fixture
def user():
    user, _ = AuthService().register(email="owner@example.com", password="Str0ng-pass-123")
    return user


@pytest.fixture
def other_user():
    user, _ = AuthService().register(email="other@example.com", password="Str0ng-pass-123")
    return user


@pytest.fixture
def api_client(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client


class TestCreate:
    def test_creates_pending_monitor_with_defaults(self, api_client, user):
        response = api_client.post(LIST_URL, VALID_MONITOR, format="json")

        assert response.status_code == 201
        assert response.data["status"] == MonitorStatusChoices.PENDING
        assert response.data["expected_status_from"] == 200
        assert response.data["expected_status_to"] == 299
        assert response.data["next_check_at"] is not None
        assert MonitorRepository().count_by_owner(owner_id=user.id) == 1

    def test_inactive_monitor_is_paused(self, api_client):
        response = api_client.post(LIST_URL, {**VALID_MONITOR, "is_active": False}, format="json")

        assert response.status_code == 201
        assert response.data["status"] == MonitorStatusChoices.PAUSED
        assert response.data["next_check_at"] is None

    @pytest.mark.parametrize(
        ("payload", "field"),
        [
            ({"url": "ftp://example.com"}, "url"),
            ({"url": "example.com"}, "url"),
            ({"method": "PUT"}, "method"),
            ({"interval_sec": 59}, "interval_sec"),
            ({"interval_sec": 3601}, "interval_sec"),
            ({"interval_sec": 60, "timeout_ms": 60000}, "timeout_ms"),
            ({"expected_status_from": 300, "expected_status_to": 200}, "expected_status_to"),
            ({"name": "   "}, "name"),
            # SSRF: internal targets by literal, by name and via DNS
            ({"url": "http://127.0.0.1:8000/"}, "url"),
            ({"url": "http://localhost/"}, "url"),
            ({"url": "http://[::1]/"}, "url"),
            ({"url": "http://169.254.169.254/latest/meta-data/"}, "url"),
            ({"url": "http://192.168.1.1/"}, "url"),
            ({"url": "http://metadata.google.internal/"}, "url"),
            ({"url": "https://internal.example/"}, "url"),
            ({"url": "https://no-such-host.example/"}, "url"),
        ],
    )
    def test_validation_errors_are_per_field(self, api_client, payload, field):
        response = api_client.post(LIST_URL, {**VALID_MONITOR, **payload}, format="json")

        assert response.status_code == 422
        assert response.data["error"]["code"] == "validation_error"
        assert field in response.data["error"]["fields"]

    def test_missing_required_fields(self, api_client):
        response = api_client.post(LIST_URL, {}, format="json")

        assert response.status_code == 422
        assert {"name", "url"} <= set(response.data["error"]["fields"])

    def test_limit_per_user(self, api_client, user):
        for index in range(MAX_MONITORS_PER_USER):
            MonitorService().create(owner_id=user.id, name=f"m{index}", url="https://a.example")

        response = api_client.post(LIST_URL, VALID_MONITOR, format="json")

        assert response.status_code == 422
        assert response.data["error"]["code"] == "monitor_limit_reached"


class TestList:
    def test_paginated_and_only_own(self, api_client, user, other_user):
        for index in range(3):
            MonitorService().create(owner_id=user.id, name=f"m{index}", url="https://a.example")
        MonitorService().create(owner_id=other_user.id, name="foreign", url="https://b.example")

        response = api_client.get(LIST_URL, {"page_size": 2})

        assert response.status_code == 200
        assert response.data["count"] == 3
        assert len(response.data["results"]) == 2
        assert response.data["next"] is not None
        assert "foreign" not in {item["name"] for item in response.data["results"]}

    def test_filter_by_status(self, api_client, user):
        MonitorService().create(owner_id=user.id, name="active", url="https://a.example")
        MonitorService().create(
            owner_id=user.id, name="paused", url="https://a.example", is_active=False
        )

        response = api_client.get(LIST_URL, {"status": "PAUSED"})

        assert [item["name"] for item in response.data["results"]] == ["paused"]

    def test_invalid_status_filter(self, api_client):
        response = api_client.get(LIST_URL, {"status": "BROKEN"})

        assert response.status_code == 422
        assert "status" in response.data["error"]["fields"]


class TestDetail:
    def test_retrieve_own(self, api_client, user):
        monitor = MonitorService().create(owner_id=user.id, name="m", url="https://a.example")

        response = api_client.get(detail_url(monitor.id))

        assert response.status_code == 200
        assert response.data["id"] == monitor.id

    @pytest.mark.parametrize("method", ["get", "patch", "put", "delete"])
    def test_foreign_monitor_is_not_found(self, api_client, other_user, method):
        foreign = MonitorService().create(
            owner_id=other_user.id, name="foreign", url="https://b.example"
        )

        response = getattr(api_client, method)(detail_url(foreign.id), VALID_MONITOR, format="json")

        assert response.status_code == 404
        assert response.data["error"]["code"] == "not_found"
        assert MonitorRepository().get_by_id(monitor_id=foreign.id, owner_id=other_user.id)

    def test_unauthenticated(self):
        response = APIClient().get(LIST_URL)

        assert response.status_code == 401


class TestUpdate:
    def test_patch_to_internal_url_is_rejected(self, api_client, user):
        monitor = MonitorService().create(owner_id=user.id, name="m", url="https://a.example")

        response = api_client.patch(
            detail_url(monitor.id), {"url": "http://10.0.0.1/"}, format="json"
        )

        assert response.status_code == 422
        assert "url" in response.data["error"]["fields"]

    def test_put_replaces_fields(self, api_client, user):
        monitor = MonitorService().create(owner_id=user.id, name="m", url="https://a.example")

        response = api_client.put(
            detail_url(monitor.id), {**VALID_MONITOR, "name": "renamed"}, format="json"
        )

        assert response.status_code == 200
        assert response.data["name"] == "renamed"
        assert response.data["url"] == VALID_MONITOR["url"]

    def test_patch_timeout_checked_against_stored_interval(self, api_client, user):
        monitor = MonitorService().create(
            owner_id=user.id, name="m", url="https://a.example", interval_sec=60, timeout_ms=5000
        )

        response = api_client.patch(detail_url(monitor.id), {"timeout_ms": 60000}, format="json")

        assert response.status_code == 422
        assert "timeout_ms" in response.data["error"]["fields"]

    def test_pause_and_resume(self, api_client, user):
        monitor = MonitorService().create(owner_id=user.id, name="m", url="https://a.example")
        MonitorRepository().update(
            monitor=monitor, status=MonitorStatusChoices.DOWN, consecutive_failures=3
        )

        paused = api_client.patch(detail_url(monitor.id), {"is_active": False}, format="json")
        resumed = api_client.patch(detail_url(monitor.id), {"is_active": True}, format="json")

        assert paused.data["status"] == MonitorStatusChoices.PAUSED
        assert paused.data["next_check_at"] is None
        assert resumed.data["status"] == MonitorStatusChoices.PENDING
        assert resumed.data["consecutive_failures"] == 0
        assert resumed.data["next_check_at"] is not None


class TestDelete:
    def test_delete_returns_204(self, api_client, user):
        monitor = MonitorService().create(owner_id=user.id, name="m", url="https://a.example")

        response = api_client.delete(detail_url(monitor.id))

        assert response.status_code == 204
        assert MonitorRepository().count_by_owner(owner_id=user.id) == 0
