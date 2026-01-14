# 🤖 Jarvis Assistant

A personal AI assistant with a modern web UI, inspired by Iron Man's Jarvis.

## ✨ Features

- 🌐 **Web UI** - Beautiful dark-mode dashboard with real-time updates
- 🎤 **Voice Input** - Browser-based voice commands
- ⌨️ **Text Input** - Chat interface for typing commands
- 🔊 **OpenAI TTS** - High-quality cloud-based text-to-speech (6 voices)
- 📊 **System Metrics** - Real-time CPU, RAM, disk, battery monitoring
- 📹 **Camera Feed** - Live camera display
- 🤖 **AI Integration** - Ollama LLM for intelligent responses

## 🚀 Quick Start

```bash
# 1. Setup environment
make setup-env

# 2. Add your OpenAI API key to .env
# Edit .env and replace sk-proj-your-key-here with your actual key

# 3. Start the assistant
make
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Requirements

- **Node.js 18+**
- **OpenAI API Key** (for TTS) - [Get one here](https://platform.openai.com/api-keys)
- **Ollama** (optional, for AI responses): `brew install ollama`

## 🔑 Setup OpenAI API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your `.env` file:

```bash
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

## 🏗️ Project Structure

```
jarvis-assistant/
├── apps/
│   ├── server/                 # 🖥️ Backend (Express + Socket.io)
│   │   ├── src/
│   │   │   ├── brain/          # LLM, intent parsing
│   │   │   ├── commands/       # System, apps, media, utilities
│   │   │   ├── core/           # Types, config
│   │   │   ├── routes/         # REST API
│   │   │   ├── services/       # Assistant, metrics
│   │   │   ├── socket/         # WebSocket handlers
│   │   │   ├── speech/         # OpenAI TTS
│   │   │   ├── utils/          # Logger, macOS helpers
│   │   │   └── index.ts        # Entry point
│   │   └── config/
│   │       └── default.json    # Configuration
│   │
│   └── web/                    # 🌐 Frontend (Next.js + React)
│       ├── app/                # Next.js app router
│       ├── components/         # UI components
│       ├── hooks/              # Custom React hooks
│       ├── stores/             # Zustand state stores
│       └── lib/                # Utilities
│
├── .env                        # Environment variables (API keys)
├── Makefile                    # Development commands
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
| `calculate 15 * 8` | Math operations |
| `help` | Show all commands |

## 🎙️ OpenAI TTS Voices

Jarvis uses OpenAI's text-to-speech API with 6 available voices:

| Voice | Gender | Description |
|-------|--------|-------------|
| **nova** ⭐ | Female | Friendly and upbeat (default) |
| alloy | Female | Neutral and balanced |
| echo | Male | Warm and conversational |
| fable | Male | Expressive and dramatic |
| onyx | Male | Deep and authoritative |
| shimmer | Female | Clear and gentle |

### TTS Configuration

Edit `.env` to change voice settings:

```bash
TTS_VOICE=nova          # Voice: alloy, echo, fable, onyx, nova, shimmer
TTS_MODEL=tts-1         # Model: tts-1 (faster) or tts-1-hd (higher quality)
TTS_RATE=1.0            # Speed: 0.25 to 4.0
```

### TTS Pricing

| Model | Cost |
|-------|------|
| tts-1 (Standard) | $0.015 / 1,000 characters |
| tts-1-hd (HD) | $0.030 / 1,000 characters |

**Example**: 1000 assistant responses averaging 100 characters = ~$1.50

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
    "voice": "nova",
    "rate": 1.0,
    "enabled": true,
    "openai": {
      "model": "tts-1",
      "defaultVoice": "nova"
    }
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
| `/api/voices` | GET | Available TTS voices |
| `/api/voices/test` | POST | Test a voice |
| `/api/settings/voice` | GET/POST | Voice settings |

## 🔄 Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `message` | Client → Server | Send user message |
| `assistant:message` | Server → Client | Receive response |
| `assistant:state` | Server → Client | State updates |
| `metrics:update` | Server → Client | System metrics |

## 🛠️ Makefile Commands

```bash
make              # Start both server and web
make server       # Start backend only
make web          # Start frontend only
make stop         # Stop all services
make status       # Check running services
make setup-env    # Create .env file
make check        # Check requirements
make build        # Production build
make clean        # Clean node_modules
```

## 📝 Roadmap

- [x] Web UI with real-time updates
- [x] System commands (volume, apps, media)
- [x] Socket.io communication
- [x] System metrics monitoring
- [x] LLM integration (Ollama)
- [x] OpenAI TTS
- [ ] Voice input in browser
- [ ] Camera processing/analysis
- [ ] Smart home integration

## 📄 License

MIT
