from typing import Any

from django.db.models import QuerySet

from monitors.models import Monitor


class MonitorRepository:
    """Monitor database operations."""

    def list_by_owner(self, *, owner_id: int) -> QuerySet[Monitor]:
        """List the owner's Monitors, newest first."""

        return Monitor.objects.filter(owner_id=owner_id)

    def get_by_id(self, *, monitor_id: int, owner_id: int) -> Monitor:
        """Get the owner's Monitor by ID."""

        return Monitor.objects.get(id=monitor_id, owner_id=owner_id)

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
