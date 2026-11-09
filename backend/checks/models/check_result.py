from django.db import models
from django.utils import timezone

from checks.choices import CheckErrorChoices


class CheckResult(models.Model):
    """Outcome of a single HTTP check of a monitor."""

    # No separate FK index: the composite index below starts with monitor_id and serves it
    monitor = models.ForeignKey(
        "monitors.Monitor", on_delete=models.CASCADE, related_name="check_results", db_index=False
    )
    checked_at = models.DateTimeField(default=timezone.now)
    ok = models.BooleanField()
    status_code = models.PositiveSmallIntegerField(null=True, blank=True)
    response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    error_code = models.CharField(max_length=20, choices=CheckErrorChoices.choices, blank=True)
    error = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ("-checked_at", "-id")
        indexes = [
            # Covering index: stats read ok/response_time_ms without touching the heap
            models.Index(
                fields=("monitor", "-checked_at"),
                include=("ok", "response_time_ms"),
                name="check_monitor_checked_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.monitor_id} @ {self.checked_at:%Y-%m-%d %H:%M:%S} ok={self.ok}"
