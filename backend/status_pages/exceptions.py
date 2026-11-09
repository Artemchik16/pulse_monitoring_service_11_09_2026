from rest_framework import status

from common.exceptions import DomainError
from status_pages.constants import MAX_PAGES_PER_USER


class StatusPageLimitReached(DomainError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "status_page_limit_reached"
    message = f"Можно создать не больше {MAX_PAGES_PER_USER} статус-страниц"


class SlugTaken(DomainError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "validation_error"
    message = "Некорректные данные"

    def __init__(self) -> None:
        super().__init__(fields={"slug": ["Этот адрес уже занят, выберите другой"]})


class UnknownMonitors(DomainError):
    """Some monitor ids do not exist or belong to another user (do not tell which)."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "validation_error"
    message = "Некорректные данные"

    def __init__(self) -> None:
        super().__init__(fields={"monitor_ids": ["Выберите мониторы из своего списка"]})
