from django.db import models


class Incident(models.Model):
    """Period when a monitor was DOWN."""

    monitor = models.ForeignKey(
        "monitors.Monitor", on_delete=models.CASCADE, related_name="incidents"
    )
    started_at = models.DateTimeField()
    resolved_at = models.DateTimeField(null=True, blank=True)
    duration_sec = models.PositiveIntegerField(null=True, blank=True)
    cause_code = models.CharField(max_length=20, blank=True)
    cause = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ("-started_at", "-id")
        indexes = [
            models.Index(fields=("monitor", "-started_at"), name="incident_monitor_started_idx"),
        ]
        constraints = [
            # DB-level guarantee: never two open incidents for one monitor
            models.UniqueConstraint(
                fields=("monitor",),
                condition=models.Q(resolved_at__isnull=True),
                name="incident_one_open_per_monitor",
            ),
        ]

    def __str__(self) -> str:
        return f"Incident #{self.pk} monitor={self.monitor_id}"

    @property
    def is_open(self) -> bool:
        return self.resolved_at is None
