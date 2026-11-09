import time
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from checks.repositories import CheckResultRepository
from monitors.constants import MAX_MONITORS_PER_USER
from monitors.repositories import MonitorRepository
from monitors.services import MonitorService
from users.models import User


class Command(BaseCommand):
    help = "Generate synthetic check history for load testing the stats endpoint."

    def add_arguments(self, parser):
        parser.add_argument("--email", default="loadtest@example.com")
        parser.add_argument("--rows", type=int, default=1_000_000, help="Total rows to insert")
        parser.add_argument("--monitors", type=int, default=MAX_MONITORS_PER_USER)
        parser.add_argument("--days", type=int, default=30)
        parser.add_argument("--failure-rate", type=float, default=0.02)

    def handle(self, *args, **options):
        user = User.objects.filter(email=options["email"]).first() or User.objects.create_user(
            email=options["email"], password=None
        )
        monitor_service = MonitorService()
        monitor_repository = MonitorRepository()
        existing = list(monitor_repository.list_by_owner(owner_id=user.id))
        for index in range(len(existing), options["monitors"]):
            existing.append(
                monitor_service.create(
                    owner_id=user.id,
                    name=f"Load test #{index + 1}",
                    url=f"https://load-{index + 1}.example.com",
                    is_active=False,
                )
            )
        monitor_ids = [monitor.id for monitor in existing[: options["monitors"]]]

        rows_per_monitor = options["rows"] // len(monitor_ids)
        step = timedelta(days=options["days"]) / rows_per_monitor
        started = time.perf_counter()
        inserted = CheckResultRepository().generate_synthetic_history(
            monitor_ids=monitor_ids,
            rows_per_monitor=rows_per_monitor,
            step=step,
            until=timezone.now(),
            failure_rate=options["failure_rate"],
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Inserted {inserted} rows for {len(monitor_ids)} monitors of {user.email} "
                f"(one check every {step.total_seconds():.1f}s per monitor) "
                f"in {time.perf_counter() - started:.1f}s. Monitor IDs: {monitor_ids}"
            )
        )
