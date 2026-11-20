.PHONY: dev test lint typecheck

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest --cov=app --cov-branch --cov-report=term-missing --cov-fail-under=90

lint:
	ruff check app tests
	cd frontend && npm run lint
	cd frontend && npm run format:check

typecheck:
	mypy app
	cd frontend && npm run typecheck
