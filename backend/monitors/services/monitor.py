from typing import Any

from django.db import transaction
from django.utils import timezone

from monitors.choices import MonitorStatusChoices
from monitors.constants import MAX_MONITORS_PER_USER
from monitors.exceptions import MonitorLimitReached
from monitors.models import Monitor
from monitors.repositories import MonitorRepository
from users.repositories import UserRepository


class MonitorService:
    """Monitor business logic."""

    def __init__(self) -> None:
        self._monitor_repository = MonitorRepository()
        self._user_repository = UserRepository()

    @transaction.atomic
    def create(self, *, owner_id: int, **data: Any) -> Monitor:
        """Create a Monitor for the owner within the per-user quota."""

        # Lock the owner so concurrent creates cannot both pass the quota check
        self._user_repository.lock_by_id(user_id=owner_id)
        if self._monitor_repository.count_by_owner(owner_id=owner_id) >= MAX_MONITORS_PER_USER:
            raise MonitorLimitReached()

        is_active = data.get("is_active", True)
        return self._monitor_repository.create(
            owner_id=owner_id,
            status=MonitorStatusChoices.PENDING if is_active else MonitorStatusChoices.PAUSED,
            next_check_at=timezone.now() if is_active else None,
            **data,
        )

    @transaction.atomic
    def update(self, *, monitor: Monitor, **data: Any) -> Monitor:
        """Update a Monitor; pausing/resuming resets its check state."""

        fields = dict(data)
        if "is_active" in data and data["is_active"] != monitor.is_active:
            fields.update(self._activity_state(is_active=data["is_active"]))
        if not fields:
            return monitor
        return self._monitor_repository.update(monitor=monitor, **fields)

    def delete(self, *, monitor: Monitor) -> None:
        """Delete a Monitor with its history."""

        self._monitor_repository.delete(monitor=monitor)

    def _activity_state(self, *, is_active: bool) -> dict[str, Any]:
        """State fields applied when a Monitor is paused or resumed."""

        if not is_active:
            return {"status": MonitorStatusChoices.PAUSED, "next_check_at": None}
        # Resume from a clean slate: no stale failures, check right away
        return {
            "status": MonitorStatusChoices.PENDING,
            "consecutive_failures": 0,
            "failing_since": None,
            "next_check_at": timezone.now(),
        }
