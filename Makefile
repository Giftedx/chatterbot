SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

## Show help
help:
	@awk 'BEGIN {FS = ":.*##"; printf "\nTargets:\n"} /^[a-zA-Z0-9_-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

format: ## Format code (if script exists)
	npm run format --if-present

lint: ## Lint code (if script exists)
	npm run lint --if-present

typecheck: ## Typecheck (if script exists)
	npm run typecheck --if-present

build: ## Build project (if script exists)
	npm run build --if-present

test: ## Run tests (if script exists)
	npm test --if-present

verify-env: ## Verify env variables against env.example
	node scripts/verify-env.mjs

context: ## Generate context snapshot for agents
	node scripts/context-snapshot.mjs