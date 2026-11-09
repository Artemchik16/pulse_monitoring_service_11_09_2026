from datetime import timedelta

import pytest
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from incidents.repositories import IncidentRepository
from monitors.services import MonitorService
from users.services import AuthService

pytestmark = pytest.mark.django_db

LIST_URL = reverse("api:incidents:incident-list")
T0 = timezone.now()


@pytest.fixture(autouse=True)
def _isolated_cache(settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    cache.clear()


def make_user(email: str):
    user, _ = AuthService().register(email=email, password="Str0ng-pass-123")
    return user


def make_incident(user, *, resolved: bool):
    monitor = MonitorService().create(owner_id=user.id, name="m", url="https://a.example")
    incident = IncidentRepository().create_open(
        monitor_id=monitor.id, started_at=T0, cause_code="TIMEOUT", cause="Нет ответа за 5 с"
    )
    if resolved:
        IncidentRepository().resolve(incident=incident, resolved_at=T0 + timedelta(minutes=5))
    return incident


@pytest.fixture
def user():
    return make_user("owner@example.com")


@pytest.fixture
def api_client(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client


def test_list_only_own_incidents(api_client, user):
    own = make_incident(user, resolved=True)
    make_incident(make_user("other@example.com"), resolved=False)

    response = api_client.get(LIST_URL)

    assert response.status_code == 200
    assert [item["id"] for item in response.data["results"]] == [own.id]
    item = response.data["results"][0]
    assert item["duration_sec"] == 300
    assert item["is_open"] is False
    assert item["monitor"]["name"] == "m"
    assert "url" not in item["monitor"]


def test_filter_open_and_by_monitor(api_client, user):
    make_incident(user, resolved=True)
    open_incident = make_incident(user, resolved=False)

    open_only = api_client.get(LIST_URL, {"is_open": "true"})
    by_monitor = api_client.get(LIST_URL, {"monitor": open_incident.monitor_id})

    assert [item["id"] for item in open_only.data["results"]] == [open_incident.id]
    assert [item["id"] for item in by_monitor.data["results"]] == [open_incident.id]


def test_foreign_incident_is_not_found(api_client):
    foreign = make_incident(make_user("other@example.com"), resolved=False)

    response = api_client.get(reverse("api:incidents:incident-detail", kwargs={"pk": foreign.id}))

    assert response.status_code == 404


def test_read_only(api_client, user):
    incident = make_incident(user, resolved=False)

    response = api_client.delete(
        reverse("api:incidents:incident-detail", kwargs={"pk": incident.id})
    )

    assert response.status_code == 405
