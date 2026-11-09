from __future__ import annotations

from typing import TYPE_CHECKING

from django.contrib.auth.base_user import BaseUserManager

if TYPE_CHECKING:
    from users.models.user import User


class UserManager(BaseUserManager["User"]):
    """Manager creating users identified by email."""

    use_in_migrations = True

    def create_user(self, email: str, password: str | None = None, **extra) -> User:
        """Create a regular user with a hashed password."""

        if not email:
            raise ValueError("Email is required")
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str | None = None, **extra) -> User:
        """Create a superuser."""

        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra)
