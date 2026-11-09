from rest_framework import status

from common.exceptions import DomainError
from monitors.constants import MAX_MONITORS_PER_USER


class MonitorLimitReached(DomainError):
    """User already owns the maximum number of monitors."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "monitor_limit_reached"
    message = f"Можно создать не больше {MAX_MONITORS_PER_USER} мониторов"
