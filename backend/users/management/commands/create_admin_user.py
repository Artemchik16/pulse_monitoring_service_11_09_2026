from django.core.management.base import BaseCommand

from users.constants import ADMIN_EMAIL, ADMIN_PASSWORD
from users.repositories import UserRepository


class Command(BaseCommand):
    help = "Create the Django admin superuser if it does not exist (idempotent)."

    def handle(self, *args, **options):
        repository = UserRepository()
        if repository.exists_by_email(email=ADMIN_EMAIL):
            self.stdout.write(f"Admin user {ADMIN_EMAIL} already exists")
            return
        repository.create_superuser(email=ADMIN_EMAIL, password=ADMIN_PASSWORD)
        self.stdout.write(
            self.style.SUCCESS(f"Created admin user {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        )
