from django.core.management.base import BaseCommand
from django.db import connection
from django.test.utils import CaptureQueriesContext

from monitors.models import Monitor
from stats.choices import StatsPeriodChoices
from stats.constants import PERIODS
from stats.services import MonitorStatsService


class Command(BaseCommand):
    help = "Print EXPLAIN ANALYZE for the queries behind /monitors/{id}/stats."

    def add_arguments(self, parser):
        parser.add_argument("monitor_id", type=int)
        parser.add_argument(
            "--period", choices=StatsPeriodChoices.values, default=StatsPeriodChoices.MONTH
        )

    def handle(self, *args, **options):
        monitor = Monitor.objects.get(id=options["monitor_id"])
        service = MonitorStatsService()
        with CaptureQueriesContext(connection) as captured:
            # Bypass the cache to see the real database work
            service._compute(
                monitor_id=monitor.id,
                period=options["period"],
                config=PERIODS[options["period"]],
            )
        with connection.cursor() as cursor:
            for query in captured.captured_queries:
                self.stdout.write(self.style.MIGRATE_HEADING(query["sql"]))
                cursor.execute(f"EXPLAIN (ANALYZE, BUFFERS) {query['sql']}")
                for (line,) in cursor.fetchall():
                    self.stdout.write(line)
                self.stdout.write("")
