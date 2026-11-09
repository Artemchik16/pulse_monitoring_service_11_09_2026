from datetime import datetime, timedelta
from typing import Any

from django.db import connection

from checks.models import CheckResult


class CheckResultRepository:
    """CheckResult database operations."""

    def create(self, *, monitor_id: int, **fields: Any) -> CheckResult:
        """Store a check outcome."""

        return CheckResult.objects.create(monitor_id=monitor_id, **fields)

    def generate_synthetic_history(
        self,
        *,
        monitor_ids: list[int],
        rows_per_monitor: int,
        step: timedelta,
        until: datetime,
        failure_rate: float,
    ) -> int:
        """Bulk-insert synthetic history in one SQL statement (load testing only)."""

        # LATERAL references g.n so random() is evaluated per row, not once
        sql = """
            INSERT INTO checks_checkresult
                (monitor_id, checked_at, ok, status_code, response_time_ms, error_code, error)
            SELECT
                m.id,
                %(until)s - g.n * %(step)s,
                r.ok,
                CASE WHEN r.ok THEN 200 ELSE 503 END,
                CASE WHEN r.ok
                    THEN (40 + random() * 160
                          + CASE WHEN random() < 0.05 THEN random() * 1500 ELSE 0 END)::int
                END,
                CASE WHEN r.ok THEN '' ELSE 'UNEXPECTED_STATUS' END,
                CASE WHEN r.ok THEN '' ELSE 'Код ответа 503, ожидался 200–299' END
            FROM unnest(%(ids)s::bigint[]) AS m(id)
            CROSS JOIN generate_series(0, %(rows)s - 1) AS g(n)
            CROSS JOIN LATERAL (SELECT random() + g.n * 0 >= %(failure_rate)s AS ok) AS r
            -- Chronological insert order, monitors interleaved: same physical layout as production
            ORDER BY g.n DESC, m.id
        """
        with connection.cursor() as cursor:
            cursor.execute(
                sql,
                {
                    "ids": monitor_ids,
                    "rows": rows_per_monitor,
                    "step": step,
                    "until": until,
                    "failure_rate": failure_rate,
                },
            )
            inserted = cursor.rowcount
            # Fresh statistics and visibility map: planner picks index-only scans
            cursor.execute("VACUUM ANALYZE checks_checkresult")
        return inserted
