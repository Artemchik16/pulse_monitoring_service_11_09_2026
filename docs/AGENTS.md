# Agents / contributor guide

How to write code in **Pulse** — a website/API uptime monitoring service (see [`TZ.md`](./TZ.md)).
The repository is a monorepo:

```
backend/    Django 5.2 + DRF, PostgreSQL, Redis, Celery (managed by uv)
frontend/   React 19 + TypeScript + Vite
docs/       TZ, design, this guide
```

Both sides follow **Clean Architecture split by modules (feature modules)**: code is grouped by
domain module first, then by layer inside the module.

**Language:**
- Code, identifiers, comments, docstrings, commit messages — **English**.
- User-facing text (UI strings, API error `message`, AI summaries) — **Russian**.

---

## Non-negotiables

1. **Module first, layer second.** A new feature lives in its domain module, never in a shared "misc" place.
2. **Respect layer boundaries** (backend): views → serializers (validate) → services → repositories → models.
3. **No ORM outside repositories.** Views, serializers, tasks never call `Model.objects`.
4. **No persistence in serializers** (`create`/`update`/`save` that write to the DB are forbidden).
5. **Respect module boundaries.** Modules depend on each other only in the allowed direction (see graphs below) and only through public entry points.
6. **Owner scoping is enforced in repositories/services, not by convention.** Every user-owned query takes `owner_id` explicitly. The same rule protects AI context (TZ E2/E3).
7. **Secrets only from env.** Never hardcode tokens, keys, URLs of environments.
8. Prefer small, focused diffs that match existing patterns in the same module.

---

## Backend (`backend/`)

### Module map

Each Django app is one domain module.

| Module          | Responsibility                                                                        | TZ          |
|-----------------|---------------------------------------------------------------------------------------|-------------|
| `common`        | Shared primitives: base repository, error format/exception handler, pagination, request-id + JSON logging, SSRF guard, `/health` | A2, A6, A9 |
| `users`         | Custom `User` (email login), registration, JWT login/refresh/logout                   | A1          |
| `monitors`      | Monitor CRUD, validation, quotas, pause/resume                                        | A2          |
| `incidents`     | Open/close incidents, state machine `UP/DOWN/PENDING/PAUSED`, emits incident signals  | A4          |
| `checks`        | Check scheduling, HTTP probing, `check_results` history, `/internal/tick`, retention cleanup | A3, A7, D1 |
| `stats`         | Uptime / avg / p95 / time series aggregation, caching, degradation detection         | A5, D5      |
| `status_pages`  | Public status pages, 90-day history, SVG badge                                        | B5, D4      |
| `notifications` | Telegram bot: chat linking, webhook, commands, reliable delivery                      | D2          |
| `playground`    | Test endpoints with switchable modes (ok/error/slow/hang/…/prompt-injection)          | D1, E3      |
| `ai`            | LLM provider adapter (+ stub), incident summaries, "ask about incidents" chat         | E           |
| `api`           | URL aggregation only (`/api/v1/...`, root URLs) and OpenAPI (`/api/docs`)             | A8          |
| `config`        | Settings, Celery app, ASGI/WSGI. No domain code.                                      | —           |

### Module dependency direction

A module may import from the modules to its **left / below** only. Never create cycles.

```
common  ←  users  ←  monitors  ←  incidents  ←  checks
                         ↑            ↑           ↑
                         └──── stats ─┴───────────┘
status_pages  → monitors, incidents, stats
notifications → users, monitors, incidents, stats
ai            → monitors, incidents, stats
playground    → common
api           → every module's urls (wiring only)
```

- Cross-module calls go through the other module's **service or repository**; never import its views or serializers.
- "Upward" reactions (incident opened/resolved → Telegram message, AI summary) use **Django signals** declared in `incidents/signals.py`; `notifications` and `ai` subscribe in `AppConfig.ready()`. Handlers only enqueue Celery tasks via `transaction.on_commit`.

### Module layout

```
monitors/
  __init__.py
  apps.py
  admin.py
  choices.py            # TextChoices enums (MonitorStatusChoices, HttpMethodChoices)
  models.py             # or models/ package when > 1-2 models
  repositories/
    __init__.py         # explicit re-exports
    monitor.py          # MonitorRepository
  services/
    __init__.py
    monitor.py          # MonitorService
  serializers/
    __init__.py
    monitor.py          # MonitorInputSerializer, MonitorOutputSerializer
  views/
    __init__.py
    monitor.py          # MonitorViewSet
  permissions.py        # only if module-specific
  throttling/
    __init__.py         # explicit re-exports
    auth.py             # AuthRateThrottle — all module throttles live here
  filters.py            # django-filter FilterSets
  tasks.py              # Celery tasks — thin wrappers calling services
  urls.py
  migrations/
  tests/
```

Create only the files a module actually needs (YAGNI). Small modules may use flat `services.py` / `repositories.py`.

### Layers

| Layer         | Owns                                                                                 | Must not                                        |
|---------------|--------------------------------------------------------------------------------------|-------------------------------------------------|
| `models`      | Fields, constraints, indexes, `Meta`                                                 | Business rules, HTTP, external calls            |
| `repositories`| All ORM queries/writes, `select_for_update(skip_locked=True)`, `select_related`, aggregations in SQL | Ownership decisions, HTTP, Celery |
| `services`    | Use cases: rules, quotas, ownership checks, transactions, side effects (cache, Celery, signals, HTTP to external services) | Depend on DRF `Request`/`Response` |
| `serializers` | Input validation (shape, ranges), output projection                                  | DB writes                                       |
| `views`       | HTTP adaptation: auth, permissions, throttling, call service/repository, status codes, OpenAPI | Business rules, ORM                     |
| `tasks`       | Celery entry points → call one service method                                        | Business logic                                  |
| `throttling`  | Rate-limit classes (`<Name>RateThrottle`), rates come from settings/env              | Business rules, inline `throttle_scope` in views |

Typical flow: **validate (serializer) → orchestrate (service) → persist (repository) → respond (view)**.

### API contract

- Prefix `/api/v1/`. REST resources, plural nouns: `/api/v1/monitors`, `/api/v1/monitors/{id}/stats?period=24h`.
- Success responses return the resource itself (no envelope). Lists use the project pagination:
  ```json
  {"count": 42, "next": "...", "previous": null, "results": [...]}
  ```
- Status codes: `200` read/update, `201` create, `204` delete, `401` unauthenticated, `403` forbidden, `404` not found / not owned, `409` conflict, `422` validation, `429` rate limit, `503` health failure.
- **One error format** for every error (produced by `common` exception handler):
  ```json
  {
    "error": {
      "code": "validation_error",
      "message": "Некорректные данные",
      "fields": {"interval_sec": ["Интервал должен быть от 60 до 3600 секунд"]}
    }
  }
  ```
  `fields` is present only for validation errors; keys equal request field names so the frontend can show them next to inputs (TZ B3).
- Objects not owned by the user return **404**, not 403 (do not leak existence).
- Every endpoint is documented with `drf_spectacular` (`@extend_schema`), tags = module name (`Monitors`, `Stats`, …).

### Background work

- Scheduling via Celery beat; tasks live in the module that owns the use case (`checks/tasks.py`, `ai/tasks.py`).
- Concurrency safety lives in repositories: `select_for_update(skip_locked=True)` for picking due monitors, DB unique/partial constraints for "one open incident per monitor". Do not rely on in-process locks.
- Outbound HTTP to user URLs **only** via the `checks` probe client (timeouts, redirect limit, streamed body size limit, SSRF guard on resolved IP).
- Tasks must be idempotent: safe to run twice.

### Naming

Inject collaborators in `__init__` with explicit role suffixes:

```python
class MonitorService:
    """Monitor business logic."""

    def __init__(self) -> None:
        self._monitor_repository = MonitorRepository()
        self._user_repository = UserRepository()
```

| Kind       | Pattern                    | Example                     |
|------------|----------------------------|-----------------------------|
| Repository | `self._<noun>_repository`  | `self._monitor_repository`  |
| Service    | `self._<noun>_service`     | `self._incident_service`    |

Avoid vague names: `_repo`, `_service`, `_monitors`, `_data`.

- Repository methods: `get_*` (raises `DoesNotExist`), `find_*` (returns `None`), `list_*`, `exists_*`, `count_*`, `create`, `update`, `delete`.
- Service methods are named after the use case: `create`, `pause`, `resume`, `process_check_result`, `resolve_incident`.
- Keyword-only arguments for public methods: `def get_by_id(self, *, monitor_id: int, owner_id: int) -> Monitor`.
- Closed sets are `TextChoices` enums; compare against members, never magic strings.

### Example

```python
class MonitorRepository(BaseRepository):
    """Monitor database operations."""

    def get_by_id(self, *, monitor_id: int, owner_id: int) -> Monitor:
        """Get the owner's Monitor by ID."""

        return Monitor.objects.get(id=monitor_id, owner_id=owner_id)

    def count_by_owner(self, *, owner_id: int) -> int:
        """Count the owner's Monitors."""

        return Monitor.objects.filter(owner_id=owner_id).count()


class MonitorService:
    """Monitor business logic."""

    MAX_MONITORS_PER_USER = 20

    def __init__(self) -> None:
        self._monitor_repository = MonitorRepository()

    @transaction.atomic
    def create(self, *, owner_id: int, **data) -> Monitor:
        """Create a Monitor for the owner."""

        if self._monitor_repository.count_by_owner(owner_id=owner_id) >= self.MAX_MONITORS_PER_USER:
            raise MonitorQuotaExceeded()
        assert_public_url(data["url"])  # common SSRF guard
        return self._monitor_repository.create(owner_id=owner_id, **data)
```

### Tests

- `pytest` + `pytest-django`; tests in `<module>/tests/test_<topic>.py`.
- Service/repository tests for rules (quotas, state machine, concurrency); API tests for the contract (status code + error format).
- Create fixtures through services/repositories, not raw `Model.objects`, where a repository exists.
- Mock external I/O (HTTP probes, Telegram, LLM). The AI module always has a `stub` provider for tests/CI.

### Tooling

```bash
cd backend
uv sync                      # install
uv add <pkg>                 # add dependency (never edit uv.lock by hand)
uv run python manage.py ...  # any manage.py command
make lint / make format / make test
```

- Ruff, line length **100**, config in `pyproject.toml`. New first-party modules must be added to `known-first-party`.
- Type hints on public methods; `X | None` unions.

---

## Frontend (`frontend/`)

### Structure

```
src/
  app/                    # composition root
    providers.tsx         # QueryClientProvider, Router, auth provider
    router.tsx            # route table, guards (private / public)
    layout/               # app shell, navigation
    styles/               # global css, tokens
  shared/                 # domain-agnostic, imports nothing from modules/
    api/                  # axios client, token refresh interceptor, ApiError type
    ui/                   # Button, Input, Spinner, EmptyState, ErrorState, StatusBadge…
    lib/                  # formatters (duration, ms, %), helpers
    config/               # env (import.meta.env.VITE_*)
  modules/                # one folder per domain module, mirrors backend
    auth/
    monitors/
    incidents/
    stats/
    status-pages/
    notifications/
    playground/
    assistant/            # AI chat (backend `ai`)
```

### Module layout

```
modules/monitors/
  api/            # raw requests (monitorsApi.list/create/…) + TanStack Query hooks (useMonitors, useCreateMonitor)
  model/          # types (DTOs mirroring backend), query keys, pure logic, constants
  ui/             # presentational components (MonitorCard, MonitorForm)
  pages/          # route-level screens (DashboardPage, MonitorDetailPage) — composition only
  index.ts        # public API of the module
```

### Layers and rules

| Layer   | Owns                                                       | Must not                                  |
|---------|------------------------------------------------------------|-------------------------------------------|
| `api`   | HTTP calls via `shared/api` client, query/mutation hooks, cache invalidation | Render UI                    |
| `model` | Types, query keys, mappers, pure functions                 | Import React components, call HTTP        |
| `ui`    | Presentational components driven by props                  | Call axios/fetch directly                 |
| `pages` | Compose hooks + ui, handle loading / empty / error states  | Contain reusable business logic           |

Dependency direction: `app → modules → shared`. Inside a module: `pages → ui, api → model`.

- Import another module **only via its `index.ts`** (`import { MonitorStatusBadge } from '@/modules/monitors'`); never deep-import its internals.
- `shared/` never imports from `modules/` or `app/`.
- Server state = TanStack Query only. No copying server data into `useState`/context. Local UI state = `useState`.
- Only `shared/api` knows about tokens and base URL. On `401` it refreshes once, retries, otherwise redirects to `/login` — no white screen (TZ B1).
- Backend validation errors (`error.fields`) are mapped onto form fields (TZ B3) via a shared helper.
- **Every screen handles loading, empty and error states** using `shared/ui` components (TZ B6). Layout must work on mobile.
- **Never use `dangerouslySetInnerHTML`.** AI/model output is rendered as text or via `react-markdown` without raw HTML (TZ E3).
- Polling/live updates via `refetchInterval` in query hooks, not ad-hoc `setInterval` (TZ D3).

### Naming

- Components: `PascalCase.tsx`, one component per file. Hooks: `useSomething.ts`. Other files: `camelCase.ts`.
- Query keys are defined in `model/queryKeys.ts` of the module: `monitorKeys.detail(id)`.
- Types mirror backend field names (`snake_case` from API is kept as-is in DTOs).
- Path alias `@/` → `src/`.

### Tooling

```bash
cd frontend
nvm use          # Node 22 (.nvmrc)
npm install
npm run dev      # Vite on :5173, /api proxied to Django :8000
npm run lint     # oxlint
npm run build    # tsc + vite build
```

---

## Patterns and paradigms

When principles conflict, prefer **correct module/layer placement** and **clarity** over clever reuse.

- **Clean Architecture** — dependencies point inward; HTTP and UI are adapters around use cases.
- **KISS** — simplest solution that fits a neighbouring pattern; a clear `if` beats a strategy registry until there are several real variants.
- **DRY for knowledge, WET for code** — extract after the second/third real duplicate, into the right layer (query → repository, rule → service, request → module `api`).
- **YAGNI** — implement what the TZ item needs; no speculative flags, empty placeholders, or commented-out code.
- **SOLID, lightly** — one service/repository per aggregate; services take explicit args, not `Request`.
- **Fail clearly** — validate at the edge, raise domain exceptions in services, map them to the unified error format at the edge.

Priority when unsure: **module/layer fit → KISS / match neighbours → WET over speculative DRY → YAGNI**.

---

## Docstrings and comments

- English, one short sentence stating the essence: `"""Monitor database operations."""`, `"""Resolve the open incident."""`.
- Comments explain *why*, not *what*. No commented-out code.

---

## Checklist for a new feature

**Backend**
1. Pick the owning module (create a new app only for a new domain).
2. Model + migration if the persistence shape changes (indexes/constraints included).
3. Repository methods for new queries/writes, scoped by `owner_id`.
4. Service method for rules, transactions, side effects.
5. Input/output serializers — no DB writes.
6. View: permissions, throttles (classes from the module's `throttling/` package), status codes, `@extend_schema`; route in module `urls.py`.
7. Tests: service rules + API contract.

**Frontend**
1. Types + query keys in `model/`.
2. Requests + hooks in `api/`.
3. Presentational components in `ui/`.
4. Page in `pages/` with loading / empty / error states; route in `app/router.tsx`.
5. Export what other modules need from `index.ts`.
