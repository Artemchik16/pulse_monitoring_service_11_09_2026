from django.conf import settings
from django.db import models

from monitors import constants
from monitors.choices import HttpMethodChoices, MonitorStatusChoices


class Monitor(models.Model):
    """Endpoint watched by the uptime checker."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="monitors"
    )
    name = models.CharField(max_length=100)
    url = models.CharField(max_length=constants.MAX_URL_LENGTH)
    method = models.CharField(
        max_length=4, choices=HttpMethodChoices.choices, default=HttpMethodChoices.GET
    )
    expected_status_from = models.PositiveSmallIntegerField(
        default=constants.DEFAULT_EXPECTED_STATUS_FROM
    )
    expected_status_to = models.PositiveSmallIntegerField(
        default=constants.DEFAULT_EXPECTED_STATUS_TO
    )
    interval_sec = models.PositiveIntegerField(default=constants.DEFAULT_INTERVAL_SEC)
    timeout_ms = models.PositiveIntegerField(default=constants.DEFAULT_TIMEOUT_MS)
    is_active = models.BooleanField(default=True)
    is_public = models.BooleanField(default=False)

    status = models.CharField(
        max_length=7, choices=MonitorStatusChoices.choices, default=MonitorStatusChoices.PENDING
    )
    consecutive_failures = models.PositiveIntegerField(default=0)
    last_checked_at = models.DateTimeField(null=True, blank=True)
    next_check_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [
            models.Index(fields=("owner", "status"), name="monitor_owner_status_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(interval_sec__gte=constants.MIN_INTERVAL_SEC)
                & models.Q(interval_sec__lte=constants.MAX_INTERVAL_SEC),
                name="monitor_interval_range",
            ),
            models.CheckConstraint(
                condition=models.Q(timeout_ms__lt=models.F("interval_sec") * 1000),
                name="monitor_timeout_lt_interval",
            ),
            models.CheckConstraint(
                condition=models.Q(expected_status_from__lte=models.F("expected_status_to")),
                name="monitor_expected_status_range",
            ),
        ]

    def __str__(self) -> str:
        return self.name
