#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════╗
# ║           🎙️ PIPER TTS VOICE DOWNLOADER                       ║
# ║           Downloads neural voices for Jarvis Assistant        ║
# ╚═══════════════════════════════════════════════════════════════╝

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/.."
VOICES_DIR="$SERVER_DIR/voices/piper"
PIPER_DIR="$SERVER_DIR/bin"

# Piper release info
PIPER_VERSION="2023.11.14-2"
PIPER_RELEASE_BASE="https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}"

# Hugging Face base URL for voices
HF_BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main"

# Print banner
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}           ${BOLD}🎙️ PIPER TTS VOICE DOWNLOADER${NC}                       ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Voice definitions: id|name|gender|path
VOICES=(
    "en_GB-alan-medium|Alan (British Male)|male|en/en_GB/alan/medium"
    "en_GB-amy-medium|Amy (British Female)|female|en/en_GB/amy/medium"
    "en_US-ryan-medium|Ryan (American Male)|male|en/en_US/ryan/medium"
    "en_US-lessac-medium|Lessac (American Female)|female|en/en_US/lessac/medium"
)

# Detect OS and architecture
detect_platform() {
    local os=""
    local arch=""
    
    case "$(uname -s)" in
        Darwin)
            os="macos"
            ;;
        Linux)
            os="linux"
            ;;
        *)
            echo -e "${RED}✗ Unsupported OS: $(uname -s)${NC}"
            exit 1
            ;;
    esac
    
    case "$(uname -m)" in
        x86_64|amd64)
            arch="x64"
            ;;
        arm64|aarch64)
            arch="aarch64"
            ;;
        armv7l)
            arch="armv7"
            ;;
        *)
            echo -e "${RED}✗ Unsupported architecture: $(uname -m)${NC}"
            exit 1
            ;;
    esac
    
    echo "${os}_${arch}"
}

# Get download URL for piper
get_piper_url() {
    local platform=$1
    local filename=""
    
    case "$platform" in
        macos_x64)
            filename="piper_macos_x64.tar.gz"
            ;;
        macos_aarch64)
            filename="piper_macos_aarch64.tar.gz"
            ;;
        linux_x64)
            filename="piper_linux_x86_64.tar.gz"
            ;;
        linux_aarch64)
            filename="piper_linux_aarch64.tar.gz"
            ;;
        *)
            echo ""
            return
            ;;
    esac
    
    echo "${PIPER_RELEASE_BASE}/${filename}"
}

# Install piper
install_piper() {
    local platform=$(detect_platform)
    local url=$(get_piper_url "$platform")
    
    if [ -z "$url" ]; then
        echo -e "${RED}✗ Could not determine Piper download URL for platform: $platform${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}▶ Installing Piper for ${platform}...${NC}"
    
    # Create bin directory
    mkdir -p "$PIPER_DIR"
    
    local temp_file=$(mktemp)
    local temp_dir=$(mktemp -d)
    
    echo -e "  ${YELLOW}↓${NC} Downloading Piper..."
    if curl -L --progress-bar -o "$temp_file" "$url"; then
        echo -e "  ${GREEN}✓${NC} Downloaded"
    else
        echo -e "  ${RED}✗${NC} Failed to download Piper"
        rm -f "$temp_file"
        exit 1
    fi
    
    echo -e "  ${YELLOW}↓${NC} Extracting..."
    tar -xzf "$temp_file" -C "$temp_dir"
    
    # Find piper binary (it's in a subdirectory)
    local piper_binary=$(find "$temp_dir" -name "piper" -type f -perm +111 | head -1)
    
    if [ -z "$piper_binary" ]; then
        # Try without permission check
        piper_binary=$(find "$temp_dir" -name "piper" -type f | head -1)
    fi
    
    if [ -n "$piper_binary" ]; then
        # Copy binary and libs
        local piper_src_dir=$(dirname "$piper_binary")
        cp -r "$piper_src_dir"/* "$PIPER_DIR/"
        chmod +x "$PIPER_DIR/piper"
        echo -e "  ${GREEN}✓${NC} Piper installed to: $PIPER_DIR/piper"
    else
        echo -e "  ${RED}✗${NC} Could not find piper binary in archive"
        rm -f "$temp_file"
        rm -rf "$temp_dir"
        exit 1
    fi
    
    # Cleanup
    rm -f "$temp_file"
    rm -rf "$temp_dir"
    
    echo ""
}

# Check if piper is installed
check_piper() {
    echo -e "${BLUE}▶ Checking Piper installation...${NC}"
    
    # Check system PATH first
    if command -v piper &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} Piper found in PATH: $(which piper)"
        PIPER_BIN="piper"
        return 0
    fi
    
    # Check local bin directory
    if [ -x "$PIPER_DIR/piper" ]; then
        echo -e "  ${GREEN}✓${NC} Piper found: $PIPER_DIR/piper"
        PIPER_BIN="$PIPER_DIR/piper"
        return 0
    fi
    
    echo -e "  ${YELLOW}⚠${NC} Piper not found - will download and install"
    echo ""
    return 1
}

# Function to download a voice
download_voice() {
    local id=$1
    local name=$2
    local gender=$3
    local path=$4
    
    local onnx_file="${id}.onnx"
    local json_file="${id}.onnx.json"
    local onnx_url="${HF_BASE}/${path}/${onnx_file}"
    local json_url="${HF_BASE}/${path}/${json_file}"
    
    echo -e "${BLUE}▶ Downloading ${BOLD}${name}${NC}${BLUE} (${gender})...${NC}"
    
    # Check if already exists
    if [ -f "$VOICES_DIR/$onnx_file" ] && [ -f "$VOICES_DIR/$json_file" ]; then
        echo -e "  ${GREEN}✓${NC} Already downloaded"
        return 0
    fi
    
    # Download model file
    echo -e "  ${YELLOW}↓${NC} Model file..."
    if curl -L --progress-bar -o "$VOICES_DIR/$onnx_file" "$onnx_url"; then
        echo -e "  ${GREEN}✓${NC} Model downloaded"
    else
        echo -e "  ${RED}✗${NC} Failed to download model"
        return 1
    fi
    
    # Download config file
    echo -e "  ${YELLOW}↓${NC} Config file..."
    if curl -L --progress-bar -o "$VOICES_DIR/$json_file" "$json_url"; then
        echo -e "  ${GREEN}✓${NC} Config downloaded"
    else
        echo -e "  ${RED}✗${NC} Failed to download config"
        return 1
    fi
    
    echo -e "  ${GREEN}✓${NC} ${name} ready!"
    echo ""
}

# Create voices directory
create_dirs() {
    echo -e "${BLUE}▶ Creating directories...${NC}"
    mkdir -p "$VOICES_DIR"
    mkdir -p "$PIPER_DIR"
    echo -e "  ${GREEN}✓${NC} Voices directory: $VOICES_DIR"
    echo -e "  ${GREEN}✓${NC} Bin directory: $PIPER_DIR"
    echo ""
}

# Download all voices
download_all() {
    echo -e "${BLUE}▶ Downloading ${#VOICES[@]} voices...${NC}"
    echo ""
    
    for voice in "${VOICES[@]}"; do
        IFS='|' read -r id name gender path <<< "$voice"
        download_voice "$id" "$name" "$gender" "$path"
    done
}

# Create voices manifest
create_manifest() {
    echo -e "${BLUE}▶ Creating voices manifest...${NC}"
    
    cat > "$VOICES_DIR/manifest.json" << 'EOF'
{
  "voices": [
    {
      "id": "en_GB-alan-medium",
      "name": "Alan",
      "language": "en-GB",
      "country": "United Kingdom",
      "gender": "male",
      "quality": "medium",
      "sampleRate": 22050,
      "description": "British male voice - Perfect for Jarvis"
    },
    {
      "id": "en_GB-amy-medium",
      "name": "Amy",
      "language": "en-GB",
      "country": "United Kingdom",
      "gender": "female",
      "quality": "medium",
      "sampleRate": 22050,
      "description": "British female voice"
    },
    {
      "id": "en_US-ryan-medium",
      "name": "Ryan",
      "language": "en-US",
      "country": "United States",
      "gender": "male",
      "quality": "medium",
      "sampleRate": 22050,
      "description": "American male voice"
    },
    {
      "id": "en_US-lessac-medium",
      "name": "Lessac",
      "language": "en-US",
      "country": "United States",
      "gender": "female",
      "quality": "medium",
      "sampleRate": 22050,
      "description": "American female voice - High quality"
    }
  ],
  "defaultVoice": "en_GB-alan-medium"
}
EOF
    
    echo -e "  ${GREEN}✓${NC} Manifest created"
    echo ""
}

# Create piper wrapper script
create_wrapper() {
    echo -e "${BLUE}▶ Creating piper wrapper...${NC}"
    
    # Create a wrapper that adds the bin dir to PATH
    cat > "$PIPER_DIR/piper-wrapper.sh" << EOF
#!/bin/bash
# Piper wrapper script for Jarvis Assistant
export DYLD_LIBRARY_PATH="${PIPER_DIR}:\$DYLD_LIBRARY_PATH"
export LD_LIBRARY_PATH="${PIPER_DIR}:\$LD_LIBRARY_PATH"
"${PIPER_DIR}/piper" "\$@"
EOF
    
    chmod +x "$PIPER_DIR/piper-wrapper.sh"
    echo -e "  ${GREEN}✓${NC} Wrapper created: $PIPER_DIR/piper-wrapper.sh"
    echo ""
}

# Test piper installation
test_piper() {
    echo -e "${BLUE}▶ Testing Piper...${NC}"
    
    # Use wrapper or direct binary
    local piper_cmd="${PIPER_DIR}/piper"
    
    # Set library paths for testing
    export DYLD_LIBRARY_PATH="${PIPER_DIR}:$DYLD_LIBRARY_PATH"
    export LD_LIBRARY_PATH="${PIPER_DIR}:$LD_LIBRARY_PATH"
    
    if "$piper_cmd" --help &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Piper is working!"
    else
        echo -e "  ${YELLOW}⚠${NC} Piper may have issues - check library dependencies"
    fi
    echo ""
}

# Main execution
main() {
    create_dirs
    
    if ! check_piper; then
        install_piper
        create_wrapper
        test_piper
    fi
    
    download_all
    create_manifest
    
    # Summary
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}✓ Piper TTS setup completed!${NC}"
    echo ""
    echo -e "  ${BOLD}Piper binary:${NC}     $PIPER_DIR/piper"
    echo -e "  ${BOLD}Voices directory:${NC} $VOICES_DIR"
    echo -e "  ${BOLD}Default voice:${NC}    en_GB-alan-medium (Alan)"
    echo ""
    echo -e "  ${BOLD}Available voices:${NC}"
    for voice in "${VOICES[@]}"; do
        IFS='|' read -r id name gender path <<< "$voice"
        echo -e "    • ${name}"
    done
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Note:${NC} Update your config to use the local piper path:"
    echo -e "  ${BOLD}piperPath:${NC} \"$PIPER_DIR/piper\""
    echo ""
}

# Run
main "$@"
