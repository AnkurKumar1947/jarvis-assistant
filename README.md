# 🤖 Jarvis Assistant

A personal AI assistant for macOS with a modern web UI, inspired by Iron Man's Jarvis.

## ✨ Features

- 🌐 **Web UI** - Beautiful dark-mode dashboard with real-time updates
- 🎤 **Voice Input** - Browser-based voice commands (+ optional wake word)
- ⌨️ **Text Input** - Chat interface for typing commands
- 🔊 **Neural TTS** - High-quality Piper voices (British male default) + macOS fallback
- 📊 **System Metrics** - Real-time CPU, RAM, disk, battery monitoring
- 📹 **Camera Feed** - Live camera display (visual only)
- 🤖 **AI Integration** - Ollama LLM for intelligent responses
- 🏠 **Fully Local** - Works offline (after initial setup)

## 🚀 Quick Start

```bash
# Navigate to project
cd jarvis-assistant

# Install server dependencies
cd apps/server
npm install

# Start the backend server
npm run dev

# In another terminal, start the frontend
cd apps/web
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Requirements

- **macOS** (for system controls)
- **Node.js 18+**
- **sox** (for server-side audio): `brew install sox`
- **Ollama** (optional, for AI): `brew install ollama`
- **Piper voices** (for TTS): Run `make voices` to download

## 🏗️ Project Structure

```
jarvis-assistant/
├── apps/
│   ├── server/                 # 🖥️ Backend (Express + Socket.io)
│   │   ├── src/
│   │   │   ├── audio/          # Recording, playback, wake word
│   │   │   ├── brain/          # LLM, intent parsing, memory
│   │   │   ├── commands/       # System, apps, media, utilities
│   │   │   ├── core/           # Types, config
│   │   │   ├── routes/         # REST API
│   │   │   ├── services/       # Assistant, metrics
│   │   │   ├── socket/         # WebSocket handlers
│   │   │   ├── speech/         # STT, TTS
│   │   │   ├── utils/          # Logger, macOS, sounds
│   │   │   └── index.ts        # Entry point
│   │   └── config/
│   │       └── default.json    # Configuration
│   │
│   └── web/                    # 🌐 Frontend (Next.js + React)
│       ├── app/                # Next.js app router
│       ├── components/         # UI components
│       │   ├── assistant/      # Assistant panel
│       │   ├── camera/         # Camera feed
│       │   ├── chat/           # Chat interface
│       │   ├── metrics/        # System metrics
│       │   ├── settings/       # Settings dialog
│       │   └── ui/             # Base UI components
│       ├── hooks/              # Custom React hooks
│       ├── stores/             # Zustand state stores
│       └── lib/                # Utilities
│
└── README.md
```

## 🎯 Available Commands

### System
| Command | Description |
|---------|-------------|
| `set volume to 50` | Set system volume |
| `volume up/down` | Adjust volume |
| `mute/unmute` | Toggle mute |
| `what's the battery` | Battery status |

### Apps
| Command | Description |
|---------|-------------|
| `open Safari` | Open an application |
| `close Spotify` | Close an application |
| `list running apps` | Show open apps |

### Media
| Command | Description |
|---------|-------------|
| `play/pause` | Control music |
| `next/previous track` | Skip tracks |
| `what's playing` | Current song info |

### Utilities
| Command | Description |
|---------|-------------|
| `what time is it` | Current time |
| `what's the date` | Current date |
| `search for documents` | File search |
| `calculate 15 * 8` | Math operations |
| `help` | Show all commands |

## ⚙️ Configuration

Edit `apps/server/config/default.json`:

```json
{
  "assistant": {
    "name": "Jarvis",
    "wakeWord": "jarvis"
  },
  "ollama": {
    "host": "http://localhost:11434",
    "model": "llama3.2:3b"
  },
  "tts": {
    "provider": "auto",
    "voice": "en_GB-alan-medium",
    "rate": 1.0,
    "enabled": true
  }
}
```

## 🎙️ Text-to-Speech (TTS)

Jarvis supports two TTS providers:

### Piper TTS (Neural Voices) - Recommended
High-quality neural voices that run locally. Perfect for a Jarvis-like experience.

```bash
# Install Piper
brew install piper

# Download neural voice models
cd apps/server
./scripts/download-piper-voices.sh
```

**Available voices:**
| Voice | ID | Description |
|-------|-----|-------------|
| Alan 🎯 | `en_GB-alan-medium` | British male (default) |
| Amy | `en_GB-amy-medium` | British female |
| Ryan | `en_US-ryan-medium` | American male |
| Lessac | `en_US-lessac-medium` | American female |

### TTS Configuration
```json
{
  "tts": {
    "voice": "en_GB-alan-medium",
    "rate": 1.0,           // 0.5-2.0 speed scale
    "enabled": true
  }
}
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |
| `/api/status` | GET | Assistant status |
| `/api/metrics` | GET | System metrics |
| `/api/message` | POST | Send message |
| `/api/history` | GET | Message history |
| `/api/voices` | GET | Get all available voices |
| `/api/voices/piper` | GET | Get Piper voices only |
| `/api/voices/macos` | GET | Get macOS voices only |
| `/api/voices/test` | POST | Test a voice |
| `/api/settings/voice` | GET/POST | Get/update voice settings |
| `/api/settings/provider` | POST | Switch TTS provider |

## 🔄 Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `message` | Client → Server | Send user message |
| `assistant:message` | Server → Client | Receive response |
| `assistant:state` | Server → Client | State updates |
| `metrics:update` | Server → Client | System metrics |

## 🎨 Themes

The UI supports multiple themes:
- **Dark** (default) - Sleek dark mode
- **Light** - Clean light mode  
- **Midnight** - Deep blue dark
- **Cyberpunk** - Neon accents

## 🛠️ Development

```bash
# Server (backend)
cd apps/server
npm run dev          # Watch mode
npm run build        # Build for production
npm start            # Run production build

# Web (frontend)
cd apps/web
npm run dev          # Development server
npm run build        # Build for production
npm start            # Run production build
```

## 📝 Roadmap

- [x] Web UI with real-time updates
- [x] System commands (volume, apps, media)
- [x] Socket.io communication
- [x] System metrics monitoring
- [x] Command registry
- [x] LLM integration (Ollama)
- [x] Neural TTS (Piper) with British voice
- [ ] Voice input in browser
- [ ] Camera processing/analysis
- [ ] Smart home integration
- [ ] Mobile companion app

## 📄 License

MIT
