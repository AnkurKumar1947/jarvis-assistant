# ╔═══════════════════════════════════════════════════════════════╗
# ║                    🤖 JARVIS ASSISTANT                        ║
# ║                        Makefile                               ║
# ╚═══════════════════════════════════════════════════════════════╝

.PHONY: all install dev start stop server web clean help check status restart build

# Directories
SERVER_DIR := apps/server
WEB_DIR := apps/web

# Default target
all: dev

# ─────────────────────────────────────────────────────────────────
# Installation
# ─────────────────────────────────────────────────────────────────

install: ## Install all dependencies
	@echo "📦 Installing server dependencies..."
	@cd $(SERVER_DIR) && npm install
	@echo "📦 Installing web dependencies..."
	@cd $(WEB_DIR) && npm install
	@echo "✅ All dependencies installed!"

install-server: ## Install server dependencies only
	@cd $(SERVER_DIR) && npm install

install-web: ## Install web dependencies only
	@cd $(WEB_DIR) && npm install

# ─────────────────────────────────────────────────────────────────
# Development
# ─────────────────────────────────────────────────────────────────

dev: check-deps check-env ## Start both server and web in development mode
	@echo ""
	@echo "╔═══════════════════════════════════════════════════════════════╗"
	@echo "║                    🤖 JARVIS ASSISTANT                        ║"
	@echo "╚═══════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🚀 Starting Backend Server (port 3001)..."
	@cd $(SERVER_DIR) && npm run dev &
	@sleep 3
	@echo "🌐 Starting Web Frontend (port 3000)..."
	@cd $(WEB_DIR) && npm run dev &
	@sleep 5
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "✅ Jarvis Assistant is running!"
	@echo ""
	@echo "  Backend:  http://localhost:3001"
	@echo "  Frontend: http://localhost:3000"
	@echo ""
	@echo "  Press Ctrl+C to stop, then run 'make stop' to clean up"
	@echo "═══════════════════════════════════════════════════════════════"
	@wait

start: dev ## Alias for dev

server: check-deps ## Start backend server only (foreground)
	@echo "🚀 Starting Backend Server..."
	@cd $(SERVER_DIR) && npm run dev

web: check-deps ## Start web frontend only (foreground)
	@echo "🌐 Starting Web Frontend..."
	@cd $(WEB_DIR) && npm run dev

# ─────────────────────────────────────────────────────────────────
# Production Build
# ─────────────────────────────────────────────────────────────────

build: ## Build both server and web for production
	@echo "🏗️ Building server..."
	@cd $(SERVER_DIR) && npm run build
	@echo "🏗️ Building web..."
	@cd $(WEB_DIR) && npm run build
	@echo "✅ Production build complete!"

build-server: ## Build server only
	@cd $(SERVER_DIR) && npm run build

build-web: ## Build web only
	@cd $(WEB_DIR) && npm run build

# ─────────────────────────────────────────────────────────────────
# Process Management
# ─────────────────────────────────────────────────────────────────

stop: ## Stop all running Jarvis processes
	@echo "🛑 Stopping Jarvis..."
	@-lsof -ti :3000 | xargs kill -9 2>/dev/null || true
	@-lsof -ti :3001 | xargs kill -9 2>/dev/null || true
	@echo "✅ All processes stopped"

restart: stop dev ## Restart all services

kill: stop ## Alias for stop

# ─────────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────────

clean: ## Clean node_modules and build artifacts
	@echo "🧹 Cleaning..."
	@rm -rf $(SERVER_DIR)/node_modules $(SERVER_DIR)/dist
	@rm -rf $(WEB_DIR)/node_modules $(WEB_DIR)/.next $(WEB_DIR)/out
	@echo "✅ Cleaned!"

clean-build: ## Clean only build artifacts (keep node_modules)
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf $(SERVER_DIR)/dist
	@rm -rf $(WEB_DIR)/.next $(WEB_DIR)/out
	@echo "✅ Build artifacts cleaned!"

# ─────────────────────────────────────────────────────────────────
# Environment Setup
# ─────────────────────────────────────────────────────────────────

setup-env: ## Create .env file from template
	@if [ ! -f .env ]; then \
		echo "# JARVIS Assistant Configuration" > .env; \
		echo "" >> .env; \
		echo "# ElevenLabs API Key (Required for TTS)" >> .env; \
		echo "# Get your key from: https://elevenlabs.io → Profile → API Keys" >> .env; \
		echo "# Free tier: 10,000 characters/month" >> .env; \
		echo "ELEVENLABS_API_KEY=your-elevenlabs-api-key" >> .env; \
		echo "" >> .env; \
		echo "# TTS Configuration" >> .env; \
		echo "# Voices: rachel, adam, antoni, elli, josh, arnold, domi, bella" >> .env; \
		echo "TTS_VOICE=adam" >> .env; \
		echo "TTS_STABILITY=0.5" >> .env; \
		echo "TTS_SIMILARITY_BOOST=0.75" >> .env; \
		echo "" >> .env; \
		echo "# Server Configuration" >> .env; \
		echo "PORT=3001" >> .env; \
		echo "NODE_ENV=development" >> .env; \
		echo "✅ Created .env file - add your ELEVENLABS_API_KEY"; \
	else \
		echo "⚠️  .env file already exists"; \
	fi

check-env: ## Check if .env is configured
	@if [ ! -f .env ]; then \
		echo "⚠️  No .env file found. Run 'make setup-env' first"; \
		exit 1; \
	fi
	@if grep -q "your-elevenlabs-api-key" .env 2>/dev/null; then \
		echo "⚠️  ELEVENLABS_API_KEY not configured in .env"; \
		echo "   TTS will be disabled until you add your API key"; \
	fi

# ─────────────────────────────────────────────────────────────────
# Checks & Status
# ─────────────────────────────────────────────────────────────────

check: ## Check system requirements
	@echo "🔍 Checking requirements..."
	@echo ""
	@printf "  Node.js:  "; node -v 2>/dev/null || echo "❌ NOT FOUND"
	@printf "  npm:      v"; npm -v 2>/dev/null || echo "❌ NOT FOUND"
	@printf "  ollama:   "; ollama --version 2>/dev/null || echo "⚠️  not found (optional)"
	@echo ""
	@echo "📋 Environment:"
	@if [ -f .env ]; then \
		echo "  .env file:   ✅ exists"; \
		if grep -q "ELEVENLABS_API_KEY=" .env 2>/dev/null && ! grep -q "your-elevenlabs-api-key" .env 2>/dev/null; then \
			echo "  ElevenLabs:  ✅ configured"; \
		else \
			echo "  ElevenLabs:  ⚠️  not configured"; \
		fi \
	else \
		echo "  .env file:   ❌ missing (run 'make setup-env')"; \
	fi
	@echo ""

check-deps: ## Ensure dependencies are installed
	@if [ ! -d "$(SERVER_DIR)/node_modules" ]; then \
		echo "📦 Server dependencies not found, installing..."; \
		cd $(SERVER_DIR) && npm install; \
	fi
	@if [ ! -d "$(WEB_DIR)/node_modules" ]; then \
		echo "📦 Web dependencies not found, installing..."; \
		cd $(WEB_DIR) && npm install; \
	fi

status: ## Show status of running services
	@echo ""
	@echo "📊 Service Status:"
	@echo ""
	@if lsof -i :3001 > /dev/null 2>&1; then \
		echo "  Backend  (3001):  🟢 Running"; \
	else \
		echo "  Backend  (3001):  🔴 Stopped"; \
	fi
	@if lsof -i :3000 > /dev/null 2>&1; then \
		echo "  Frontend (3000):  🟢 Running"; \
	else \
		echo "  Frontend (3000):  🔴 Stopped"; \
	fi
	@if lsof -i :11434 > /dev/null 2>&1; then \
		echo "  Ollama   (11434): 🟢 Running"; \
	else \
		echo "  Ollama   (11434): 🔴 Stopped"; \
	fi
	@echo ""

# ─────────────────────────────────────────────────────────────────
# Help
# ─────────────────────────────────────────────────────────────────

help: ## Show this help message
	@echo ""
	@echo "╔═══════════════════════════════════════════════════════════════╗"
	@echo "║                    🤖 JARVIS ASSISTANT                        ║"
	@echo "╠═══════════════════════════════════════════════════════════════╣"
	@echo "║  TTS: ElevenLabs (10K chars/month free)                      ║"
	@echo "╚═══════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "Commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Quick Start:"
	@echo "  1. make setup-env     # Create .env file"
	@echo "  2. Edit .env          # Add your OPENAI_API_KEY"
	@echo "  3. make               # Start the assistant"
	@echo ""
	@echo "Examples:"
	@echo "  make              # Start both server and web"
	@echo "  make server       # Start only backend"
	@echo "  make web          # Start only frontend"
	@echo "  make stop         # Stop all services"
	@echo "  make status       # Check what's running"
	@echo ""
