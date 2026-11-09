"""Idempotent demo data for the demo account: creates only what is missing."""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from monitors.repositories import MonitorRepository
from monitors.services import MonitorService
from status_pages.repositories import StatusPageRepository
from status_pages.services import StatusPageService
from users.constants import DEMO_EMAIL
from users.models import User

# Our own public sites (TZ: «можно предзаполнить наши сайты»)
DEMO_MONITORS = (
    {"name": "Pleazy", "url": "https://pleazy.kz/"},
    {"name": "EnterEdu", "url": "https://enteredu.kz/"},
    {"name": "AgroGo", "url": "https://agrogo.kz/"},
    {"name": "Proxymo", "url": "https://proxymo.kz/"},
)

DEMO_STATUS_PAGE = {"title": "Статус сервисов", "slug": "demo"}


class Command(BaseCommand):
    help = "Create the demo account's monitors and public status page (idempotent)."

    @transaction.atomic
    def handle(self, *args, **options):
        user = User.objects.filter(email=DEMO_EMAIL).first()
        if user is None:
            raise CommandError(f"No demo user {DEMO_EMAIL}: run `create_demo_user` first")

        monitor_service = MonitorService()
        existing = {m.name: m for m in MonitorRepository().list_by_owner(owner_id=user.id)}
        for spec in DEMO_MONITORS:
            if spec["name"] in existing:
                continue
            existing[spec["name"]] = monitor_service.create(
                owner_id=user.id,
                name=spec["name"],
                url=spec["url"],
                interval_sec=60,
                timeout_ms=10_000,
                is_public=True,
            )
            self.stdout.write(f"Created monitor {spec['name']}")

        if StatusPageRepository().find_by_slug(slug=DEMO_STATUS_PAGE["slug"]) is None:
            StatusPageService().create(
                owner_id=user.id,
                title=DEMO_STATUS_PAGE["title"],
                slug=DEMO_STATUS_PAGE["slug"],
                monitor_ids=[existing[spec["name"]].id for spec in DEMO_MONITORS],
            )
            self.stdout.write(f"Created status page /status/{DEMO_STATUS_PAGE['slug']}")

        self.stdout.write(self.style.SUCCESS(f"Demo data ready for {DEMO_EMAIL}"))
