# Pulse

Сервис мониторинга доступности сайтов и API. Техническое задание — [`docs/TZ.md`](docs/TZ.md),
правила разработки — [`docs/AGENTS.md`](docs/AGENTS.md).

## Локальный запуск

```bash
cp backend/.env.example backend/.env   # заполнить DEBUG=true, SECRET_KEY и т.д.
docker compose up -d --build           # PostgreSQL :5432, Redis :6379, миграции, Celery worker + beat

cd backend && uv sync && uv run python manage.py runserver   # API на :8000
cd frontend && nvm use && npm install && npm run dev         # UI на :5173
```

## Ключевые решения

### Аутентификация (A1)

**Выбор: JWT (access + refresh), а не сессии с CSRF.**

- Frontend и backend живут на разных доменах (статический хостинг + отдельный backend).
  Сессионная cookie в таком случае требует `SameSite=None; Secure`, настройки CSRF-токена
  между доменами и `credentials` в каждом запросе. Токен в заголовке `Authorization: Bearer`
  не отправляется браузером автоматически, поэтому CSRF-атака на API невозможна по построению.
- Тот же токен без изменений подходит для Swagger, скриптов и тестов.
- Недостаток JWT — нельзя мгновенно отозвать выданный токен. Он закрыт так:
  - **access** живёт 15 минут;
  - **refresh** живёт 7 дней и **ротируется**:
    при каждом `/refresh` старый токен попадает в blacklist (таблица в PostgreSQL),
    повторное использование украденного refresh возвращает 401;
  - **выход** (`/logout`) заносит refresh в blacklist; access истекает сам не позже чем через 15 минут.
- Пароли хешируются **Argon2** (`Argon2PasswordHasher`), проверяются стандартными валидаторами Django
  (длина, схожесть с email, словарь частых паролей, только цифры).
- Эндпоинты `/auth/*` ограничены по частоте (20 запросов в минуту с IP) —
  защита от перебора паролей.

| Метод | Путь                     | Доступ        | Ответ                         |
|-------|--------------------------|---------------|-------------------------------|
| POST  | `/api/v1/auth/register`  | все           | `201 {user, tokens}` / `422`  |
| POST  | `/api/v1/auth/login`     | все           | `200 {user, tokens}` / `401`  |
| POST  | `/api/v1/auth/refresh`   | все           | `200 {access, refresh}` / `401` |
| POST  | `/api/v1/auth/logout`    | авторизованные | `204` / `401`                |
| GET   | `/api/v1/auth/me`        | авторизованные | `200 {id, email, created_at}` |

Все ошибки возвращаются в едином формате:

```json
{"error": {"code": "validation_error", "message": "Некорректные данные", "fields": {"email": ["..."]}}}
```
