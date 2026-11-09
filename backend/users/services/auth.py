from dataclasses import dataclass

from django.contrib.auth import authenticate
from django.db import IntegrityError, transaction
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from rest_framework_simplejwt.tokens import RefreshToken

from users.exceptions import EmailAlreadyRegistered, InvalidCredentials, InvalidRefreshToken
from users.models import User
from users.repositories import UserRepository


@dataclass(frozen=True)
class TokenPair:
    """Issued JWT access/refresh pair."""

    access: str
    refresh: str


class AuthService:
    """Registration, login, token refresh and logout."""

    def __init__(self) -> None:
        self._user_repository = UserRepository()

    def register(self, *, email: str, password: str) -> tuple[User, TokenPair]:
        """Register a User and issue tokens for immediate sign-in."""

        email = email.strip().lower()
        if self._user_repository.exists_by_email(email=email):
            raise EmailAlreadyRegistered()
        try:
            with transaction.atomic():
                user = self._user_repository.create(email=email, password=password)
        except IntegrityError:
            # Concurrent registration with the same email
            raise EmailAlreadyRegistered() from None
        return user, self._issue_tokens(user=user)

    def login(self, *, email: str, password: str) -> tuple[User, TokenPair]:
        """Authenticate by email/password and issue tokens."""

        user = authenticate(email=email.strip().lower(), password=password)
        if user is None:
            raise InvalidCredentials()
        return user, self._issue_tokens(user=user)

    def refresh(self, *, refresh_token: str) -> TokenPair:
        """Rotate the refresh token and issue a new pair."""

        token = self._parse_refresh(refresh_token=refresh_token)
        user = self._user_repository.find_active_by_id(user_id=token[jwt_settings.USER_ID_CLAIM])
        if user is None:
            raise InvalidRefreshToken()
        token.blacklist()
        return self._issue_tokens(user=user)

    def logout(self, *, user: User, refresh_token: str) -> None:
        """Revoke the user's refresh token."""

        token = self._parse_refresh(refresh_token=refresh_token)
        if str(token[jwt_settings.USER_ID_CLAIM]) != str(user.pk):
            raise InvalidRefreshToken()
        token.blacklist()

    def _parse_refresh(self, *, refresh_token: str) -> RefreshToken:
        """Decode a refresh token, rejecting expired or blacklisted ones."""

        try:
            return RefreshToken(refresh_token)
        except TokenError:
            raise InvalidRefreshToken() from None

    def _issue_tokens(self, *, user: User) -> TokenPair:
        """Create a new access/refresh pair for the user."""

        refresh = RefreshToken.for_user(user)
        return TokenPair(access=str(refresh.access_token), refresh=str(refresh))
