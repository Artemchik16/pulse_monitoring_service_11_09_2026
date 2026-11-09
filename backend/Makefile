### Setup ###
install:
	uv sync

### Server ###
runserver:
	uv run python manage.py runserver 8000

### Database ###
makemigrations:
	uv run python manage.py makemigrations
migrate:
	uv run python manage.py migrate

### Background tasks ###
start-celery-worker:
	uv run celery -A config worker --loglevel=info --concurrency=4
start-celery-beat:
	uv run celery -A config beat --loglevel=info

### Tests ###
test:
	uv run python manage.py makemigrations --check --dry-run
	uv run python manage.py check
	uv run pytest

### Linting ###
format:
	uv run ruff format .
	uv run ruff check . --fix
lint:
	uv run ruff format --check .
	uv run ruff check .
