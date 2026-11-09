from django.db import models


class StatsPeriodChoices(models.TextChoices):
    """Supported statistics windows."""

    DAY = "24h", "24 часа"
    WEEK = "7d", "7 дней"
    MONTH = "30d", "30 дней"
