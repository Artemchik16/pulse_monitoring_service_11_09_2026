"""Gunicorn settings: JSON logs from the master process too, access log is written by Django."""

bind = "0.0.0.0:8000"
workers = 1
# Threads: playground "hang"/"slow" hold a request for up to 75 s; a sync worker would freeze the API
worker_class = "gthread"
threads = 16
# The app runs as a non-root user and cannot write to /app (owned by root); keep the socket in /tmp
control_socket = "/tmp/gunicorn.ctl"
# RequestIdMiddleware writes a JSON access line with request_id; avoid a second plain-text one
accesslog = None
errorlog = "-"

logconfig_dict = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {"request_id": {"()": "common.logging.RequestIdFilter"}},
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.json.JsonFormatter",
            "fmt": "%(levelname)s %(name)s %(request_id)s %(message)s",
            "rename_fields": {"levelname": "level", "name": "logger"},
            # ISO 8601 in UTC from the record itself: same clock in gunicorn, Django and Celery
            "timestamp": True,
            "json_ensure_ascii": False,
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
            "filters": ["request_id"],
        },
    },
    "loggers": {
        "gunicorn.error": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "gunicorn.access": {"handlers": [], "propagate": False},
    },
}
