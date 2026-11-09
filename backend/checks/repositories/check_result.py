from typing import Any

from checks.models import CheckResult


class CheckResultRepository:
    """CheckResult database operations."""

    def create(self, *, monitor_id: int, **fields: Any) -> CheckResult:
        """Store a check outcome."""

        return CheckResult.objects.create(monitor_id=monitor_id, **fields)
