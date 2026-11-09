import os

from celery import Celery
from celery.signals import setup_logging

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@setup_logging.connect
def configure_logging(**kwargs) -> None:
    """Use Django's JSON LOGGING config in workers instead of Celery's plain-text one."""

    from logging.config import dictConfig

    from django.conf import settings

    from common.logging.celery import connect_task_request_id

    dictConfig(settings.LOGGING)
    connect_task_request_id()
