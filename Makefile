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

# AI Agent Development Commands
agent-validate: ## Validate environment for AI agents
	node scripts/agent-env-validator.mjs

agent-monitor: ## Monitor AI agent performance
	node scripts/agent-performance-monitor.mjs

agent-context: ## Generate repository context for AI agents (alias for context)
	node scripts/context-snapshot.mjs

agent-setup: ## Complete AI agent setup and validation
	@echo "🤖 Setting up environment for AI agent collaboration..."
	node scripts/agent-env-validator.mjs
	@echo "📊 Generating repository context..."
	node scripts/context-snapshot.mjs
	@echo "✅ AI agent setup complete!"
	@echo "📖 Next steps:"
	@echo "  • Read: .github/COPILOT_AGENT_SETUP.md"
	@echo "  • Start: npm run dev:health"
	@echo "  • Test: npm test"

clean: ## Clean build artifacts and caches
	rm -rf dist/
	rm -rf coverage/
	rm -rf .nyc_output/
	rm -rf .agent-metrics/
	npm cache clean --force