from django.db import models


class CheckErrorChoices(models.TextChoices):
    """Why a check failed."""

    TIMEOUT = "TIMEOUT", "Таймаут"
    DNS_ERROR = "DNS_ERROR", "Ошибка DNS"
    CONNECTION_ERROR = "CONNECTION_ERROR", "Ошибка соединения"
    SSL_ERROR = "SSL_ERROR", "Ошибка TLS/SSL"
    UNEXPECTED_STATUS = "UNEXPECTED_STATUS", "Неожиданный код ответа"
    TOO_MANY_REDIRECTS = "TOO_MANY_REDIRECTS", "Слишком много редиректов"
    BODY_TOO_LARGE = "BODY_TOO_LARGE", "Превышен размер ответа"
    INVALID_URL = "INVALID_URL", "Некорректный URL"
