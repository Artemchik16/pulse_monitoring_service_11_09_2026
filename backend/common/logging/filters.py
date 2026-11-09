import logging

from common.logging.context import get_request_id


class RequestIdFilter(logging.Filter):
    """Attach the current request/task id to every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id()
        return True
