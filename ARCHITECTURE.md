# 🏗️ Jarvis Assistant - Architecture

## Overview

Jarvis is an AI voice assistant built with a modern monorepo structure. It consists of two main applications communicating via WebSocket:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           JARVIS ASSISTANT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────┐          WebSocket           ┌─────────────────┐  │
│   │                     │◄───────────────────────────►│                 │  │
│   │    Next.js Web UI   │         (Socket.io)          │  Express Server │  │
│   │    (Port 3000)      │                              │   (Port 3001)   │  │
│   │                     │          REST API            │                 │  │
│   │                     │◄────────────────────────────►│                 │  │
│   └─────────────────────┘                              └─────────────────┘  │
│            │                                                    │           │
│            │                                                    │           │
│            ▼                                                    ▼           │
│   ┌─────────────────────┐                              ┌─────────────────┐  │
│   │   Browser APIs      │                              │  External APIs  │  │
│   │   • Camera          │                              │  • Ollama LLM   │  │
│   │   • Microphone      │                              │  • ElevenLabs   │  │
│   │   • Web Audio       │                              │  • macOS System │  │
│   └─────────────────────┘                              └─────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## System Architecture

### High-Level Data Flow

```
                              USER INPUT
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
            ┌──────────────┐           ┌──────────────┐
            │  Voice Input │           │  Text Input  │
            │  (Browser)   │           │  (Chat Box)  │
            └──────┬───────┘           └──────┬───────┘
                   │                          │
                   └───────────┬──────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │   WebSocket Msg  │
                    │   'send_message' │
                    └────────┬─────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │     ASSISTANT SERVICE        │
              │  ┌────────────────────────┐  │
              │  │   Intent Parser        │  │
              │  │   (Pattern Matching)   │  │
              │  └───────────┬────────────┘  │
              │              │               │
              │   ┌──────────┴──────────┐    │
              │   │                     │    │
              │   ▼                     ▼    │
              │ ┌─────────┐      ┌──────────┐│
              │ │Commands │      │   LLM    ││
              │ │Registry │      │ (Ollama) ││
              │ └────┬────┘      └────┬─────┘│
              │      │                │      │
              │      └───────┬────────┘      │
              │              │               │
              │              ▼               │
              │  ┌────────────────────────┐  │
              │  │   Speech Synthesizer   │  │
              │  │    (ElevenLabs TTS)    │  │
              │  └────────────────────────┘  │
              └──────────────┬───────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   WebSocket Msg  │
                    │    'message'     │
                    └────────┬─────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │   Web UI    │
                      │  (Display)  │
                      └─────────────┘
```

---

## Backend Architecture (apps/server)

### Tech Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Real-time**: Socket.io
- **TTS**: ElevenLabs API
- **LLM**: Ollama (local)

### Module Structure

```
apps/server/
├── src/
│   ├── index.ts                # 🚀 Entry point
│   │
│   ├── core/                   # ⚙️ Core Configuration
│   │   ├── config.ts              # Config loader
│   │   └── types.ts               # TypeScript interfaces
│   │
│   ├── socket/                 # 🔌 WebSocket Layer
│   │   ├── index.ts               # Socket.io init
│   │   ├── handlers.ts            # Event handlers
│   │   └── events.ts              # Event constants
│   │
│   ├── routes/                 # 🛤️ REST API
│   │   └── api.ts                 # HTTP endpoints
│   │
│   ├── services/               # 🧠 Business Logic
│   │   ├── assistantService.ts    # Main orchestrator
│   │   └── metricsService.ts      # System metrics
│   │
│   ├── brain/                  # 🤖 Intelligence Layer
│   │   ├── llm.ts                 # Ollama LLM client
│   │   └── intentParser.ts        # Intent extraction
│   │
│   ├── commands/               # ⚡ Command Registry
│   │   ├── index.ts               # Command router
│   │   ├── system.ts              # Volume, brightness
│   │   ├── apps.ts                # Open/close apps
│   │   ├── media.ts               # Music control
│   │   └── utilities.ts           # Time, calculations
│   │
│   ├── speech/                 # 🔊 Speech Processing
│   │   ├── synthesizer.ts         # TTS orchestrator
│   │   └── providers/
│   │       └── elevenLabsProvider.ts  # ElevenLabs TTS
│   │
│   └── utils/                  # 🔧 Utilities
│       ├── logger.ts              # Console logging
│       └── macOS.ts               # AppleScript helpers
│
└── config/
    └── default.json            # Default configuration
```

---

## TTS Architecture (ElevenLabs)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPEECH SYNTHESIZER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Configuration (.env)                                          │
│   ├─ ELEVENLABS_API_KEY: string                                │
│   ├─ TTS_VOICE: rachel|adam|antoni|elli|josh|arnold|domi|bella │
│   ├─ TTS_STABILITY: 0-1 (lower = more expressive)              │
│   └─ TTS_SIMILARITY_BOOST: 0-1 (higher = more consistent)      │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              ElevenLabs TTS Provider                    │   │
│   │                                                         │   │
│   │   Input: Text string                                    │   │
│   │          │                                              │   │
│   │          ▼                                              │   │
│   │   ┌─────────────────┐                                   │   │
│   │   │  ElevenLabs API │  POST /v1/text-to-speech/{id}    │   │
│   │   │  (Cloud)        │  → Returns MP3 audio             │   │
│   │   └────────┬────────┘                                   │   │
│   │            │                                            │   │
│   │            ▼                                            │   │
│   │   ┌─────────────────┐                                   │   │
│   │   │  Audio Player   │  afplay (macOS)                  │   │
│   │   │                 │  mpv (Linux)                     │   │
│   │   └─────────────────┘                                   │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   Voices:                                                       │
│   ├─ rachel  - Calm, narrative (female)                        │
│   ├─ adam    - Deep, authoritative (male) ⭐ default           │
│   ├─ antoni  - Warm, friendly (male)                           │
│   ├─ elli    - Young, cheerful (female)                        │
│   ├─ josh    - Energetic (male)                                │
│   ├─ arnold  - Crisp, clear (male)                             │
│   ├─ domi    - Strong, confident (female)                      │
│   └─ bella   - Soft, gentle (female)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Communication Protocol

### WebSocket Events

#### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `send_message` | `{ content: string, source: 'voice' \| 'text' }` | Send user message |
| `get_metrics` | - | Request system metrics |
| `get_state` | - | Request assistant state |
| `get_history` | - | Request message history |
| `clear_history` | - | Clear conversation |

#### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `message` | `Message` object | New message |
| `assistant_state` | `AssistantState` string | State change |
| `metrics_update` | `SystemMetrics` object | System metrics |
| `error` | `{ code, message }` | Error notification |

### REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/status` | Assistant status |
| GET | `/api/metrics` | System metrics |
| POST | `/api/message` | Send message |
| GET | `/api/history` | Message history |
| GET | `/api/voices` | Available TTS voices |
| POST | `/api/voices/test` | Test a voice |
| GET/POST | `/api/settings/voice` | Voice settings |

---

## Environment Configuration

```bash
# .env file
ELEVENLABS_API_KEY=...         # Required for TTS
TTS_VOICE=adam                  # Voice name
TTS_STABILITY=0.5               # 0-1
TTS_SIMILARITY_BOOST=0.75       # 0-1
PORT=3001                       # Server port
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

---

## External Dependencies

### Required
| Dependency | Purpose | Installation |
|------------|---------|--------------|
| Node.js 18+ | Runtime | `brew install node` |
| npm | Package manager | (included with Node.js) |
| ElevenLabs API Key | TTS | [elevenlabs.io](https://elevenlabs.io) |

### Optional
| Dependency | Purpose | Installation |
|------------|---------|--------------|
| Ollama | Local LLM | `brew install ollama` |

---

## Quick Reference

### Start Development
```bash
make           # Start both server and web
# or
make server    # Backend only
make web       # Frontend only
```

### Key Files
| Purpose | File |
|---------|------|
| Server entry | `apps/server/src/index.ts` |
| Main orchestrator | `apps/server/src/services/assistantService.ts` |
| TTS Provider | `apps/server/src/speech/providers/elevenLabsProvider.ts` |
| WebSocket handlers | `apps/server/src/socket/handlers.ts` |
| Frontend entry | `apps/web/app/page.tsx` |
| Type definitions | `apps/server/src/core/types.ts` |
| Environment | `.env` |
