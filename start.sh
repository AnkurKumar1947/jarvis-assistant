#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════╗
# ║                    🤖 JARVIS ASSISTANT                        ║
# ║                     Startup Script                            ║
# ╚═══════════════════════════════════════════════════════════════╝

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/apps/server"
WEB_DIR="$SCRIPT_DIR/apps/web"

# Print banner
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}                    ${BOLD}🤖 JARVIS ASSISTANT${NC}                        ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Function to check if port is in use
port_in_use() {
    lsof -i :"$1" &> /dev/null
}

# Function to kill process on port
kill_port() {
    if port_in_use "$1"; then
        echo -e "${YELLOW}⚠ Port $1 in use, killing existing process...${NC}"
        lsof -ti :"$1" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Parse arguments
MODE="all"
INSTALL=false
KILL_EXISTING=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --server|-s)
            MODE="server"
            shift
            ;;
        --web|-w)
            MODE="web"
            shift
            ;;
        --install|-i)
            INSTALL=true
            shift
            ;;
        --kill|-k)
            KILL_EXISTING=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./start.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --server, -s    Start only the backend server"
            echo "  --web, -w       Start only the web frontend"
            echo "  --install, -i   Force install dependencies"
            echo "  --kill, -k      Kill existing processes on ports"
            echo "  --help, -h      Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./start.sh              # Start both server and web"
            echo "  ./start.sh -s           # Start server only"
            echo "  ./start.sh -w           # Start web only"
            echo "  ./start.sh -i           # Install deps and start both"
            echo "  ./start.sh -k           # Kill existing and start fresh"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Check requirements
echo -e "${BLUE}▶ Checking requirements...${NC}"

if ! command_exists node; then
    echo -e "${RED}✗ Node.js not found${NC}"
    echo "  Install from: https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "  ${GREEN}✓${NC} Node.js $NODE_VERSION"

if ! command_exists npm; then
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "  ${GREEN}✓${NC} npm v$NPM_VERSION"

# Check sox (optional, for audio)
if command_exists sox; then
    echo -e "  ${GREEN}✓${NC} sox installed (audio recording)"
else
    echo -e "  ${YELLOW}⚠${NC} sox not found (install with: brew install sox)"
fi

echo ""

# Kill existing processes if requested
if [ "$KILL_EXISTING" = true ]; then
    echo -e "${BLUE}▶ Killing existing processes...${NC}"
    kill_port 3001
    kill_port 3000
    echo ""
fi

# Install dependencies
install_deps() {
    local dir=$1
    local name=$2
    
    if [ "$INSTALL" = true ] || [ ! -d "$dir/node_modules" ]; then
        echo -e "${BLUE}▶ Installing $name dependencies...${NC}"
        cd "$dir"
        npm install --silent
        echo -e "  ${GREEN}✓${NC} $name dependencies installed"
    else
        echo -e "  ${GREEN}✓${NC} $name dependencies already installed"
    fi
}

# Start server
start_server() {
    echo -e "${BLUE}▶ Starting Backend Server...${NC}"
    
    if port_in_use 3001; then
        echo -e "  ${YELLOW}⚠${NC} Port 3001 already in use"
        echo -e "  ${YELLOW}  Use --kill flag to force restart${NC}"
        return 1
    fi
    
    cd "$SERVER_DIR"
    npm run dev &
    SERVER_PID=$!
    
    # Wait for server to start
    echo -n "  Waiting for server"
    for i in {1..10}; do
        sleep 1
        echo -n "."
        if port_in_use 3001; then
            break
        fi
    done
    echo ""
    
    if port_in_use 3001; then
        echo -e "  ${GREEN}✓${NC} Server running on ${BOLD}http://localhost:3001${NC}"
    else
        echo -e "  ${RED}✗${NC} Server failed to start"
        return 1
    fi
}

# Start web
start_web() {
    echo -e "${BLUE}▶ Starting Web Frontend...${NC}"
    
    if port_in_use 3000; then
        echo -e "  ${YELLOW}⚠${NC} Port 3000 already in use"
        echo -e "  ${YELLOW}  Use --kill flag to force restart${NC}"
        return 1
    fi
    
    cd "$WEB_DIR"
    npm run dev &
    WEB_PID=$!
    
    # Wait for web to start
    echo -n "  Waiting for frontend"
    for i in {1..15}; do
        sleep 1
        echo -n "."
        if port_in_use 3000; then
            break
        fi
    done
    echo ""
    
    if port_in_use 3000; then
        echo -e "  ${GREEN}✓${NC} Frontend running on ${BOLD}http://localhost:3000${NC}"
    else
        echo -e "  ${RED}✗${NC} Frontend failed to start"
        return 1
    fi
}

# Main execution
case $MODE in
    server)
        install_deps "$SERVER_DIR" "Server"
        echo ""
        start_server
        ;;
    web)
        install_deps "$WEB_DIR" "Web"
        echo ""
        start_web
        ;;
    all)
        install_deps "$SERVER_DIR" "Server"
        install_deps "$WEB_DIR" "Web"
        echo ""
        start_server
        echo ""
        start_web
        ;;
esac

# Print summary
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}✓ Jarvis Assistant is running!${NC}"
echo ""
echo -e "  ${BOLD}Backend:${NC}  http://localhost:3001"
echo -e "  ${BOLD}Frontend:${NC} http://localhost:3000"
echo ""
echo -e "  ${BOLD}API Endpoints:${NC}"
echo -e "    GET  /health       - Health check"
echo -e "    GET  /api/status   - Assistant status"
echo -e "    GET  /api/metrics  - System metrics"
echo -e "    POST /api/message  - Send message"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${NC} to stop all services"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Keep script running and handle cleanup
cleanup() {
    echo ""
    echo -e "${YELLOW}▶ Shutting down...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    kill $WEB_PID 2>/dev/null || true
    kill_port 3001
    kill_port 3000
    echo -e "${GREEN}✓ Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for background processes
wait

