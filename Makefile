# Pulse — run commands. `make` (or `make help`) lists them.
COMPOSE := docker compose
APP := backend celery-worker celery-beat
ENV := backend/.env
PORT := 8080

.DEFAULT_GOAL := help
.PHONY: help up down restart rebuild ps logs logs-backend run-demo tunnel debug-on debug-off seed \
        shell-backend test lint

help: ## Show this list
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-14s %s\n", $$1, $$2}'

## --- Stack ---
up: ## Build and start everything: http://localhost:8080 (demo@pulse.app / DemoPulse2026!)
	$(COMPOSE) up -d --build
	@echo "App: http://localhost:$(PORT)   API docs: http://localhost:8000/api/docs"

down: ## Stop everything (data in the db volume is kept)
	$(COMPOSE) down

restart: ## Restart backend, worker and beat (picks up backend/.env changes)
	$(COMPOSE) up -d --force-recreate $(APP)

rebuild: ## Rebuild images after code changes and restart
	$(COMPOSE) up -d --build

ps: ## Containers and their health
	$(COMPOSE) ps

logs: ## Follow logs of all services
	$(COMPOSE) logs -f --tail=100

logs-backend: ## Follow backend logs only
	$(COMPOSE) logs -f --tail=100 backend

## --- Public demo ---
run-demo: debug-off up tunnel ## Public demo: production mode + stack + ngrok link (Ctrl+C stops the link)

tunnel: ## Public HTTPS link to the running stack (ngrok must be installed and logged in)
	@echo "Public link: see 'Forwarding https://…ngrok-free.app' below; Ctrl+C closes it"
	ngrok http $(PORT)

debug-off: ## Production mode (DEBUG=false): use before exposing the app; localhost:8080 then redirects to HTTPS
	sed -i 's/^DEBUG=.*/DEBUG=false/' $(ENV)
	@if $(COMPOSE) ps -q backend | grep -q .; then $(COMPOSE) up -d --force-recreate $(APP); fi

debug-on: ## Development mode (DEBUG=true): plain http://localhost:8080 works again
	sed -i 's/^DEBUG=.*/DEBUG=true/' $(ENV)
	@if $(COMPOSE) ps -q backend | grep -q .; then $(COMPOSE) up -d --force-recreate $(APP); fi

## --- Data and tools ---
seed: ## Re-create missing demo data (demo user, monitors, status page)
	$(COMPOSE) exec backend python manage.py create_demo_user
	$(COMPOSE) exec backend python manage.py seed_demo

shell-backend: ## Django shell inside the backend container
	$(COMPOSE) exec backend python manage.py shell

test: ## Backend and frontend unit tests (needs `docker compose up -d db redis`)
	$(MAKE) -C backend test
	cd frontend && npm run test

lint: ## Backend and frontend linters
	$(MAKE) -C backend lint
	cd frontend && npm run lint
