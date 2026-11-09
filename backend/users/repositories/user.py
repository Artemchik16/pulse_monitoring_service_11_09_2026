from users.models import User


class UserRepository:
    """User database operations."""

    def exists_by_email(self, *, email: str) -> bool:
        """Check whether a User with the email exists."""

        return User.objects.filter(email=email).exists()

    def find_active_by_id(self, *, user_id: int) -> User | None:
        """Find an active User by ID."""

        return User.objects.filter(id=user_id, is_active=True).first()

    def lock_by_id(self, *, user_id: int) -> User:
        """Lock the User row until the end of the current transaction."""

        return User.objects.select_for_update().get(id=user_id)

    def create(self, *, email: str, password: str) -> User:
        """Create a User with a hashed password."""

        return User.objects.create_user(email=email, password=password)

    def create_superuser(self, *, email: str, password: str) -> User:
        """Create a staff superuser (Django admin access)."""

        return User.objects.create_superuser(email=email, password=password)
