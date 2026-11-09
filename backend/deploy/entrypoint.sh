#!/bin/sh
# Container start: prepare the database, then run the given command (gunicorn by default).
# Every step is idempotent, so it is safe on every restart.
set -eu

echo "entrypoint: applying migrations"
python manage.py migrate --noinput

echo "entrypoint: demo user"
python manage.py create_demo_user

echo "entrypoint: demo data"
python manage.py seed_demo

exec "$@"
