from django.db import models


class MonitorStatusChoices(models.TextChoices):
    """Current monitor state."""

    PENDING = "PENDING", "Ожидает проверки"
    UP = "UP", "Работает"
    DOWN = "DOWN", "Не работает"
    PAUSED = "PAUSED", "На паузе"


class HttpMethodChoices(models.TextChoices):
    """HTTP method used for a check."""

    GET = "GET", "GET"
    HEAD = "HEAD", "HEAD"
    POST = "POST", "POST"
