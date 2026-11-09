import json
import logging

import pytest
from django.conf import settings
from rest_framework.test import APIClient

from common.logging import RequestIdFilter, get_request_id
from common.logging.celery import _on_task_postrun, _on_task_prerun
from common.services import health

pytestmark = pytest.mark.django_db


class ListHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.records: list[logging.LogRecord] = []
        self.addFilter(RequestIdFilter())

    def emit(self, record):
        self.records.append(record)


@pytest.fixture
def access_log():
    handler = ListHandler()
    logger = logging.getLogger("pulse.access")
    previous_level = logger.level
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)
    yield handler
    logger.removeHandler(handler)
    logger.setLevel(previous_level)


@pytest.fixture(autouse=True)
def _redis_up(monkeypatch):
    monkeypatch.setattr(health.redis.Redis, "ping", lambda self: True)


def test_generates_request_id_and_logs_it(access_log):
    response = APIClient().get("/health")

    request_id = response["X-Request-ID"]
    assert len(request_id) == 32
    [record] = access_log.records
    assert record.request_id == request_id
    assert record.status_code == 200
    assert record.path == "/health"
    assert record.duration_ms >= 0


def test_keeps_valid_incoming_request_id(access_log):
    response = APIClient().get("/health", HTTP_X_REQUEST_ID="trace-abc.123")

    assert response["X-Request-ID"] == "trace-abc.123"
    assert access_log.records[0].request_id == "trace-abc.123"


@pytest.mark.parametrize("incoming", ["bad id with spaces", "x" * 65, "<script>"])
def test_replaces_unsafe_incoming_request_id(incoming):
    response = APIClient().get("/health", HTTP_X_REQUEST_ID=incoming)

    assert response["X-Request-ID"] != incoming


def test_request_id_is_reset_after_request():
    APIClient().get("/health")

    assert get_request_id() is None


def test_error_responses_carry_request_id():
    response = APIClient().get("/api/v1/monitors")

    assert response.status_code == 401
    assert response["X-Request-ID"]


def test_access_log_has_user_id(access_log, django_user_model):
    user = django_user_model.objects.create_user(email="u@example.com", password="x")
    client = APIClient()
    client.force_authenticate(user)

    client.get("/api/v1/monitors")

    assert access_log.records[-1].user_id == user.id


def test_celery_task_id_used_as_request_id():
    _on_task_prerun(task_id="task-42")
    try:
        record = logging.LogRecord("celery", logging.INFO, __file__, 1, "msg", None, None)
        RequestIdFilter().filter(record)
        assert record.request_id == "task-42"
    finally:
        _on_task_postrun(task_id="task-42")
    assert get_request_id() is None


def test_log_record_is_json_with_request_id():
    from logging.config import dictConfig

    dictConfig(settings.LOGGING)
    handler = logging.getLogger().handlers[0]
    record = logging.LogRecord("pulse", logging.INFO, __file__, 1, "hello %s", ("world",), None)
    handler.filter(record)

    payload = json.loads(handler.format(record))

    assert payload["message"] == "hello world"
    assert payload["level"] == "INFO"
    assert "request_id" in payload
    assert "timestamp" in payload
