# ╔═══════════════════════════════════════════════════════════════╗
# ║                    🤖 JARVIS ASSISTANT                        ║
# ║                        Makefile                               ║
# ╚═══════════════════════════════════════════════════════════════╝

.PHONY: all install dev start stop server web clean help voices check status restart build

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

dev: check-deps ## Start both server and web in development mode
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
# Voice Models
# ─────────────────────────────────────────────────────────────────

voices: ## Download Piper voice models
	@echo "🎙️ Downloading voice models..."
	@cd $(SERVER_DIR) && ./scripts/download-piper-voices.sh

# ─────────────────────────────────────────────────────────────────
# Checks & Status
# ─────────────────────────────────────────────────────────────────

check: ## Check system requirements
	@echo "🔍 Checking requirements..."
	@echo ""
	@printf "  Node.js:  "; node -v 2>/dev/null || echo "❌ NOT FOUND"
	@printf "  npm:      v"; npm -v 2>/dev/null || echo "❌ NOT FOUND"
	@printf "  sox:      "; sox --version 2>/dev/null | head -1 || echo "⚠️  not found (optional)"
	@printf "  piper:    "; piper --version 2>/dev/null || echo "⚠️  not found (optional)"
	@printf "  ollama:   "; ollama --version 2>/dev/null || echo "⚠️  not found (optional)"
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
	@echo "║  Usage: make [target]                                        ║"
	@echo "╚═══════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "Commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Examples:"
	@echo "  make              # Start both server and web"
	@echo "  make server       # Start only backend"
	@echo "  make web          # Start only frontend"
	@echo "  make stop         # Stop all services"
	@echo "  make status       # Check what's running"
	@echo ""
