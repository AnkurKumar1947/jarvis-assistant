# 🤖 Jarvis Assistant

A personal AI assistant with a modern web UI, inspired by Iron Man's Jarvis.

## ✨ Features

- 🌐 **Web UI** - Beautiful dark-mode dashboard with real-time updates
- 🎤 **Voice Input** - Browser-based voice commands
- ⌨️ **Text Input** - Chat interface for typing commands
- 🔊 **ElevenLabs TTS** - High-quality cloud-based text-to-speech (8 voices)
- 📊 **System Metrics** - Real-time CPU, RAM, disk, battery monitoring
- 📹 **Camera Feed** - Live camera display
- 🤖 **AI Integration** - Ollama LLM for intelligent responses

## 🚀 Quick Start

```bash
# 1. Setup environment
make setup-env

# 2. Add your ElevenLabs API key to .env
# Edit .env and replace your-elevenlabs-api-key with your actual key

# 3. Start the assistant
make
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Requirements

- **Node.js 18+**
- **ElevenLabs API Key** (free tier: 10K chars/month) - [Get one here](https://elevenlabs.io)
- **Ollama** (optional, for AI responses): `brew install ollama`

## 🔑 Setup ElevenLabs API Key

1. Go to [elevenlabs.io](https://elevenlabs.io) and sign up (free)
2. Click your profile icon → **Profile**
3. Copy your **API Key**
4. Add it to your `.env` file:

```bash
ELEVENLABS_API_KEY=your-actual-api-key-here
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
│   │   │   ├── speech/         # ElevenLabs TTS
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

## 🎙️ ElevenLabs TTS Voices

Jarvis uses ElevenLabs' text-to-speech API with 8 available voices:

| Voice | Gender | Style |
|-------|--------|-------|
| **adam** ⭐ | Male | Deep, authoritative (default - Jarvis-like) |
| rachel | Female | Calm, narrative |
| antoni | Male | Warm, friendly |
| elli | Female | Young, cheerful |
| josh | Male | Energetic |
| arnold | Male | Crisp, clear |
| domi | Female | Strong, confident |
| bella | Female | Soft, gentle |

### TTS Configuration

Edit `.env` to change voice settings:

```bash
TTS_VOICE=adam                    # Voice name
TTS_STABILITY=0.5                 # 0-1 (lower = more expressive)
TTS_SIMILARITY_BOOST=0.75         # 0-1 (higher = more consistent)
```

### Free Tier

- **10,000 characters/month** free
- ~100 short assistant responses
- Upgrade for more at [elevenlabs.io/pricing](https://elevenlabs.io/pricing)

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
    "voice": "adam",
    "rate": 1.0,
    "enabled": true,
    "elevenlabs": {
      "voiceId": "pNInz6obpgDQGcFmaJgB",
      "modelId": "eleven_monolingual_v1",
      "stability": 0.5,
      "similarityBoost": 0.75
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
- [x] ElevenLabs TTS
- [ ] Voice input in browser
- [ ] Camera processing/analysis
- [ ] Smart home integration

## 📄 License

MIT
