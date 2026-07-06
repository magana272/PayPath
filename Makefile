.PHONY: up down backend frontend mongo dev-backend dev-frontend test

up:
	docker compose up --build

down:
	docker compose down

backend:
	docker compose up --build backend

frontend:
	docker compose up --build frontend

mongo:
	docker compose up -d mongo

dev-backend:
	cd backend && $(MAKE) run

dev-frontend:
	cd frontend && $(MAKE) dev

test:
	cd backend && $(MAKE) test
