from datetime import datetime, timedelta
from typing import Any

from django.db.models import DateTimeField, ExpressionWrapper, F, QuerySet, Value

from monitors.models import Monitor


class MonitorRepository:
    """Monitor database operations."""

    def list_by_owner(self, *, owner_id: int) -> QuerySet[Monitor]:
        """List the owner's Monitors, newest first."""

        return Monitor.objects.filter(owner_id=owner_id)

    def get_by_id(self, *, monitor_id: int, owner_id: int) -> Monitor:
        """Get the owner's Monitor by ID."""

        return Monitor.objects.get(id=monitor_id, owner_id=owner_id)

    def find_active_by_id(self, *, monitor_id: int) -> Monitor | None:
        """Find an active Monitor by ID regardless of owner (system use: background checks)."""

        return Monitor.objects.filter(id=monitor_id, is_active=True).first()

    def lock_by_id(self, *, monitor_id: int) -> Monitor | None:
        """Lock a Monitor row until the end of the current transaction (system use)."""

        return Monitor.objects.select_for_update().filter(id=monitor_id).first()

    def claim_due(self, *, now: datetime, limit: int) -> list[Monitor]:
        """Claim due active Monitors: lock them and move next_check_at one interval ahead.

        Must run inside a transaction. Rows locked by a concurrent claim are skipped, and
        the claimed rows are no longer due, so two schedulers never pick the same monitor.
        """

        monitors = list(
            Monitor.objects.select_for_update(skip_locked=True)
            .filter(is_active=True, next_check_at__lte=now)
            .order_by("next_check_at")[:limit]
        )
        if monitors:
            # Next run counts from now, not from the missed slot: no catch-up avalanche
            Monitor.objects.filter(id__in=[monitor.id for monitor in monitors]).update(
                next_check_at=ExpressionWrapper(
                    Value(now) + F("interval_sec") * timedelta(seconds=1),
                    output_field=DateTimeField(),
                )
            )
        return monitors

    def count_by_owner(self, *, owner_id: int) -> int:
        """Count the owner's Monitors."""

        return Monitor.objects.filter(owner_id=owner_id).count()

    def create(self, *, owner_id: int, **fields: Any) -> Monitor:
        """Create a Monitor."""

        return Monitor.objects.create(owner_id=owner_id, **fields)

    def update(self, *, monitor: Monitor, **fields: Any) -> Monitor:
        """Update the given fields of a Monitor."""

        for name, value in fields.items():
            setattr(monitor, name, value)
        monitor.save(update_fields=[*fields, "updated_at"])
        return monitor

    def delete(self, *, monitor: Monitor) -> None:
        """Delete a Monitor."""

        monitor.delete()
