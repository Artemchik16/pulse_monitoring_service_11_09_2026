# syntax=docker/dockerfile:1

### Builder: install locked prod dependencies with uv ###
FROM python:3.12-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:0.11.31 /uv /bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project

COPY . .
RUN DEBUG=false SECRET_KEY=collectstatic-only \
    /app/.venv/bin/python manage.py collectstatic --noinput


### Runtime: no build tools, non-root user ###
FROM python:3.12-slim AS runtime

RUN groupadd --system app && useradd --system --gid app --home-dir /app app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DJANGO_SETTINGS_MODULE=config.settings

WORKDIR /app
COPY --from=builder --chown=app:app /app /app

USER app
EXPOSE 8000

# Migrations + demo user + demo data, then the command (gunicorn). Celery containers of the same
# image skip it with `entrypoint: []`: only one container may run migrations
ENTRYPOINT ["/app/deploy/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--config", "gunicorn.conf.py"]
