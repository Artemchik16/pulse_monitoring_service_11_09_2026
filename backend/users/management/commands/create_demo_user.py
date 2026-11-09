from django.core.management.base import BaseCommand

from users.constants import DEMO_EMAIL, DEMO_PASSWORD
from users.repositories import UserRepository


class Command(BaseCommand):
    help = "Create the demo account if it does not exist (idempotent)."

    def handle(self, *args, **options):
        repository = UserRepository()
        if repository.exists_by_email(email=DEMO_EMAIL):
            self.stdout.write(f"Demo user {DEMO_EMAIL} already exists")
            return
        repository.create(email=DEMO_EMAIL, password=DEMO_PASSWORD)
        self.stdout.write(self.style.SUCCESS(f"Created demo user {DEMO_EMAIL} / {DEMO_PASSWORD}"))
