import logging
from datetime import timedelta
from pathlib import Path

import environ
from corsheaders.defaults import default_headers

# Base app path
BASE_DIR = Path(__file__).resolve().parent.parent

# Environment config
#########################
env = environ.Env(
    # Main environ
    DEBUG=(bool, False),
    SECRET_KEY=(str, "django-insecure-local-dev-only-change-me"),
    ADMIN_PAGE_LOCATION=(str, "admin/"),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    # Database environ
    DATABASE_URL=(str, "postgres://pulse:pulse@127.0.0.1:5432/pulse"),
    # Redis environ (cache + Celery broker)
    REDIS_URL=(str, "redis://127.0.0.1:6379/0"),
    CELERY_BROKER_URL=(str, ""),
    # CORS/CSRF environ
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:5173", "http://127.0.0.1:5173"]),
    CSRF_TRUSTED_ORIGINS=(list, ["http://localhost:5173", "http://127.0.0.1:5173"]),
    # Telegram environ
    TELEGRAM_BOT_TOKEN=(str, ""),
    TELEGRAM_BOT_USERNAME=(str, ""),
    TELEGRAM_WEBHOOK_SECRET=(str, ""),
    # Other environ
    BASE_BACKEND_URL=(str, "http://localhost:8000"),
    BASE_FRONTEND_URL=(str, "http://localhost:5173"),
    LOG_LEVEL=(str, "INFO"),
)
environ.Env.read_env(BASE_DIR / ".env")
#########################

# Main settings
#########################
DEBUG = env("DEBUG")
SECRET_KEY = env("SECRET_KEY")
ADMIN_PAGE_LOCATION = env("ADMIN_PAGE_LOCATION")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
#########################

# Applications
#########################
INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # 3rd party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "drf_spectacular",
    "corsheaders",
    "django_celery_beat",
    # Project apps
    "common.apps.CommonConfig",
    "users.apps.UsersConfig",
    "monitors.apps.MonitorsConfig",
    "incidents.apps.IncidentsConfig",
    "checks.apps.ChecksConfig",
    "stats.apps.StatsConfig",
    "status_pages.apps.StatusPagesConfig",
    "api.apps.ApiConfig",
]
#########################

# Middlewares
#########################
MIDDLEWARE = [
    # First: every log line of the request, including errors in other middleware, has an id
    "common.middleware.RequestIdMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
#########################

# Templates
#########################
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]
#########################

# Database (PostgreSQL)
#########################
DATABASES = {"default": env.db("DATABASE_URL")}
DATABASES["default"]["CONN_MAX_AGE"] = 60
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
# Fail fast instead of hanging requests and /health when the database is unreachable
DATABASES["default"].setdefault("OPTIONS", {})["connect_timeout"] = 5
#########################

# Auth / passwords (argon2 — медленный хеш по ТЗ A1)
#########################
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
AUTH_USER_MODEL = "users.User"
#########################

# Internationalization
#########################
LANGUAGE_CODE = "ru"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
#########################

# Static files
#########################
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
#########################

# Cache (Redis)
#########################
REDIS_URL = env("REDIS_URL")
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
    }
}
#########################

# Logging (JSON, request_id добавляется middleware — TODO)
#########################
LOG_LEVEL = env("LOG_LEVEL")
# Python warnings go through logging (JSON) instead of raw stderr lines
logging.captureWarnings(True)
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {"()": "common.logging.RequestIdFilter"},
    },
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
    "root": {"handlers": ["console"], "level": LOG_LEVEL},
    "loggers": {
        "django": {"handlers": ["console"], "level": LOG_LEVEL, "propagate": False},
        # Access log is written by RequestIdMiddleware (JSON, with request_id)
        "django.server": {"handlers": [], "propagate": False},
        "celery": {"handlers": ["console"], "level": LOG_LEVEL, "propagate": False},
        "gunicorn.error": {"handlers": ["console"], "level": LOG_LEVEL, "propagate": False},
    },
}
#########################

# Django REST framework
#########################
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PARSER_CLASSES": ("rest_framework.parsers.JSONParser",),
    "DEFAULT_RENDERER_CLASSES": (
        ("rest_framework.renderers.JSONRenderer", "rest_framework.renderers.BrowsableAPIRenderer")
        if DEBUG
        else ("rest_framework.renderers.JSONRenderer",)
    ),
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "DEFAULT_PAGINATION_CLASS": "common.pagination.DefaultPagination",
    "DEFAULT_SCHEMA_CLASS": "common.openapi.PulseAutoSchema",
    "EXCEPTION_HANDLER": "common.exceptions.unified_exception_handler",
    "DEFAULT_THROTTLE_RATES": {"auth": "20/min", "public_status_page": "120/min"},
}
#########################

# OpenAPI / Swagger (/api/docs)
#########################
SPECTACULAR_SETTINGS = {
    "TITLE": "Pulse API",
    "DESCRIPTION": """
Сервис мониторинга доступности сайтов и API.

**Авторизация.** JWT: получите пару токенов через `POST /api/v1/auth/login`
(или `register`), нажмите **Authorize** и вставьте `access`. Access живёт 15 минут,
обновляется через `POST /api/v1/auth/refresh`.

**Ошибки** всегда в одном формате:
`{"error": {"code": "...", "message": "...", "fields": {...}}}`;
`fields` есть только у ошибок валидации (`422`).

**Списки** постраничные: `?page=2&page_size=50` (по умолчанию 20, максимум 100).

Пользователь видит и меняет только свои мониторы и инциденты: чужие отдают `404`.
""".strip(),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    # Several components have a "status" field with different choice sets
    "ENUM_NAME_OVERRIDES": {
        "MonitorStatusEnum": "monitors.choices.MonitorStatusChoices",
        "HealthStatusEnum": ["ok", "error"],
    },
    "TAGS": [
        {"name": "Auth", "description": "Регистрация, вход, обновление токена, выход"},
        {"name": "Monitors", "description": "Мониторы: CRUD, пагинация, фильтр по статусу"},
        {"name": "Stats", "description": "Uptime, время ответа и график за 24h / 7d / 30d"},
        {"name": "Incidents", "description": "Инциденты: открываются и закрываются проверками"},
        {"name": "Status pages", "description": "Статус-страницы: свои и публичные /status/{slug}"},
        {"name": "Health", "description": "Проверка работоспособности (БД, Redis)"},
    ],
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorization": True,
        "displayRequestDuration": True,
        "filter": True,
    },
}
#########################

# Simple JWT (access + refresh, ротация с blacklist)
#########################
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}
#########################

# Celery / Celery beat
#########################
CELERY_BROKER_URL = env("CELERY_BROKER_URL") or REDIS_URL
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_IGNORE_RESULT = True
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_BEAT_SCHEDULE = {
    "dispatch-due-checks": {"task": "checks.dispatch_due_checks", "schedule": 15.0},
    "purge-old-checks": {"task": "checks.purge_old_checks", "schedule": 60 * 60.0},
}
#########################

# CORS / CSRF (только домен фронтенда — ТЗ B1)
#########################
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
# Frontend can read the id to show it in error screens and send its own
CORS_EXPOSE_HEADERS = ("X-Request-ID",)
CORS_ALLOW_HEADERS = (*default_headers, "x-request-id")
CSRF_TRUSTED_ORIGINS = env("CSRF_TRUSTED_ORIGINS")
#########################

# Production security
#########################
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
#########################

# Project settings
#########################
TELEGRAM_BOT_TOKEN = env("TELEGRAM_BOT_TOKEN")
TELEGRAM_BOT_USERNAME = env("TELEGRAM_BOT_USERNAME")
TELEGRAM_WEBHOOK_SECRET = env("TELEGRAM_WEBHOOK_SECRET")

BASE_BACKEND_URL = env("BASE_BACKEND_URL")
BASE_FRONTEND_URL = env("BASE_FRONTEND_URL")
#########################
