import json
from datetime import timedelta

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from checks.repositories import CheckResultRepository
from monitors.repositories import MonitorRepository
from monitors.services import MonitorService
from status_pages.constants import MAX_PAGES_PER_USER
from status_pages.services import StatusPageService
from users.services import AuthService

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/status-pages"


@pytest.fixture(autouse=True)
def _isolated_cache(settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    cache.clear()


def make_user(email: str):
    user, _ = AuthService().register(email=email, password="Str0ng-pass-123")
    return user


@pytest.fixture
def user():
    return make_user("owner@example.com")


@pytest.fixture
def api_client(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client


def make_monitor(user, name: str, *, is_public: bool = True, status: str = "UP"):
    monitor = MonitorService().create(
        owner_id=user.id,
        name=name,
        url=f"https://{name.lower()}.secret-internal.example",
        is_public=is_public,
    )
    return MonitorRepository().update(monitor=monitor, status=status)


def public_url(slug: str) -> str:
    return f"/api/v1/public/status-pages/{slug}"


class TestOwnerApi:
    def test_create_and_list(self, api_client, user):
        site = make_monitor(user, "Site")

        created = api_client.post(
            LIST_URL,
            {"title": " Статус Acme ", "slug": "Acme-Status", "monitor_ids": [site.id, site.id]},
            format="json",
        )
        listed = api_client.get(LIST_URL)

        assert created.status_code == 201
        assert created.data["title"] == "Статус Acme"
        assert created.data["slug"] == "acme-status"
        assert created.data["monitor_ids"] == [site.id]
        assert [item["slug"] for item in listed.data["results"]] == ["acme-status"]

    @pytest.mark.parametrize(
        "slug", ["ab", "-acme", "acme-", "ac me", "acme_status", "статус", "a" * 51]
    )
    def test_invalid_slug(self, api_client, slug):
        response = api_client.post(
            LIST_URL, {"title": "T", "slug": slug, "monitor_ids": []}, format="json"
        )

        assert response.status_code == 422
        assert "slug" in response.data["error"]["fields"]

    def test_slug_must_be_unique_across_users(self, api_client):
        StatusPageService().create(
            owner_id=make_user("other@example.com").id, title="X", slug="taken", monitor_ids=[]
        )

        response = api_client.post(
            LIST_URL, {"title": "T", "slug": "taken", "monitor_ids": []}, format="json"
        )

        assert response.status_code == 422
        assert response.data["error"]["fields"]["slug"] == ["Этот адрес уже занят, выберите другой"]

    def test_foreign_monitor_is_rejected(self, api_client):
        foreign = make_monitor(make_user("other@example.com"), "Foreign")

        response = api_client.post(
            LIST_URL, {"title": "T", "slug": "mine", "monitor_ids": [foreign.id]}, format="json"
        )

        assert response.status_code == 422
        assert "monitor_ids" in response.data["error"]["fields"]

    def test_page_limit(self, api_client, user):
        for index in range(MAX_PAGES_PER_USER):
            StatusPageService().create(
                owner_id=user.id, title="T", slug=f"page-{index}", monitor_ids=[]
            )

        response = api_client.post(
            LIST_URL, {"title": "T", "slug": "one-more", "monitor_ids": []}, format="json"
        )

        assert response.status_code == 422
        assert response.data["error"]["code"] == "status_page_limit_reached"

    def test_update_and_delete(self, api_client, user):
        site = make_monitor(user, "Site")
        page = StatusPageService().create(
            owner_id=user.id, title="Old", slug="old", monitor_ids=[site.id]
        )

        updated = api_client.put(
            f"{LIST_URL}/{page.id}",
            {"title": "New", "slug": "new", "monitor_ids": []},
            format="json",
        )
        deleted = api_client.delete(f"{LIST_URL}/{page.id}")

        assert updated.status_code == 200
        assert updated.data["slug"] == "new"
        assert updated.data["monitor_ids"] == []
        assert deleted.status_code == 204
        assert APIClient().get(public_url("new")).status_code == 404

    def test_foreign_page_is_not_found(self, api_client):
        foreign = StatusPageService().create(
            owner_id=make_user("other@example.com").id, title="X", slug="foreign", monitor_ids=[]
        )

        assert api_client.get(f"{LIST_URL}/{foreign.id}").status_code == 404
        assert api_client.delete(f"{LIST_URL}/{foreign.id}").status_code == 404


class TestPublicPage:
    def test_no_auth_and_only_safe_fields(self, user):
        site = make_monitor(user, "Site")
        CheckResultRepository().create(
            monitor_id=site.id,
            checked_at=timezone.now() - timedelta(minutes=1),
            ok=True,
            status_code=200,
            response_time_ms=50,
        )
        StatusPageService().create(
            owner_id=user.id, title="Acme", slug="acme", monitor_ids=[site.id]
        )

        response = APIClient().get(public_url("acme"))

        assert response.status_code == 200
        assert set(response.data) == {"title", "slug", "status", "generated_at", "monitors"}
        [item] = response.data["monitors"]
        assert set(item) == {"name", "status", "uptime_24h", "uptime_30d", "last_checked_at"}
        assert item["uptime_24h"] == 100.0
        body = json.dumps(response.data, default=str)
        assert "secret-internal" not in body
        assert "owner@example.com" not in body
        assert str(site.id) not in [str(value) for value in item.values()]

    def test_works_with_a_stale_token_in_the_browser(self, user):
        StatusPageService().create(owner_id=user.id, title="Acme", slug="acme", monitor_ids=[])
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION="Bearer expired-or-garbage")

        assert client.get(public_url("acme")).status_code == 200

    def test_hides_monitors_not_flagged_public(self, user):
        shown = make_monitor(user, "Shown")
        hidden = make_monitor(user, "Hidden", is_public=False)
        StatusPageService().create(
            owner_id=user.id, title="Acme", slug="acme", monitor_ids=[shown.id, hidden.id]
        )

        names = [item["name"] for item in APIClient().get(public_url("acme")).data["monitors"]]

        assert names == ["Shown"]

    @pytest.mark.parametrize(
        ("statuses", "overall"),
        [
            (["UP", "UP"], "operational"),
            (["UP", "DOWN"], "partial_outage"),
            (["DOWN", "DOWN"], "major_outage"),
            (["UP", "PAUSED"], "operational"),
            ([], "unknown"),
        ],
    )
    def test_overall_status(self, user, statuses, overall):
        monitors = [make_monitor(user, f"M{i}", status=status) for i, status in enumerate(statuses)]
        StatusPageService().create(
            owner_id=user.id, title="Acme", slug="acme", monitor_ids=[m.id for m in monitors]
        )

        assert APIClient().get(public_url("acme")).data["status"] == overall

    def test_unknown_slug(self):
        response = APIClient().get(public_url("nope"))

        assert response.status_code == 404
        assert response.data["error"]["code"] == "not_found"

    def test_owner_changes_reach_the_public_page_at_once(self, user):
        site = make_monitor(user, "Site")
        page = StatusPageService().create(
            owner_id=user.id, title="Old", slug="acme", monitor_ids=[site.id]
        )
        APIClient().get(public_url("acme"))  # warm the cache

        StatusPageService().update(
            page=page, owner_id=user.id, title="New", slug="acme", monitor_ids=[]
        )

        data = APIClient().get(public_url("acme")).data
        assert data["title"] == "New"
        assert data["monitors"] == []
