from rest_framework import status

from common.exceptions import DomainError


class EmailAlreadyRegistered(DomainError):
    """Registration with an email that already has an account."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "validation_error"
    message = "Некорректные данные"

    def __init__(self) -> None:
        super().__init__(fields={"email": ["Пользователь с таким email уже зарегистрирован"]})


class InvalidCredentials(DomainError):
    """Wrong email/password pair or inactive account."""

    status_code = status.HTTP_401_UNAUTHORIZED
    code = "invalid_credentials"
    message = "Неверный email или пароль"


class InvalidRefreshToken(DomainError):
    """Refresh token is malformed, expired, blacklisted or belongs to another user."""

    status_code = status.HTTP_401_UNAUTHORIZED
    code = "token_not_valid"
    message = "Токен недействителен или истёк"
