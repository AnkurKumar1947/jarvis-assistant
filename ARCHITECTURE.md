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
│   │   • Microphone      │                              │  • OpenAI TTS   │  │
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
              │  │     (OpenAI TTS)       │  │
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

## Frontend Architecture (apps/web)

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + Tailwind CSS + shadcn/ui
- **State**: Zustand stores
- **Real-time**: Socket.io client
- **Styling**: CSS Variables for theming

### Component Structure

```
apps/web/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Main dashboard (entry point)
│   ├── globals.css             # Global styles + theme variables
│   └── providers.tsx           # Context providers wrapper
│
├── components/
│   ├── assistant/              # 🤖 Assistant Panel
│   │   ├── AssistantAvatar.tsx    # Animated avatar
│   │   ├── AssistantView.tsx      # Main assistant display
│   │   ├── ControlButtons.tsx     # Voice/mute controls
│   │   └── StateIndicator.tsx     # Current state badge
│   │
│   ├── chat/                   # 💬 Chat Interface
│   │   ├── ChatPanel.tsx          # Main chat container
│   │   ├── ChatInput.tsx          # Message input
│   │   └── MessageList.tsx        # Message history
│   │
│   ├── metrics/                # 📊 System Metrics
│   │   ├── SystemMetrics.tsx      # Metrics grid
│   │   └── MetricCard.tsx         # Individual metric
│   │
│   └── ui/                     # 🎨 Base Components (shadcn)
│
├── hooks/                      # Custom React Hooks
│   ├── useSocket.ts               # WebSocket connection
│   ├── useAssistant.ts            # Assistant state
│   └── useMetrics.ts              # System metrics
│
└── stores/                     # Zustand State Stores
    ├── assistantStore.ts
    └── chatStore.ts
```

---

## Backend Architecture (apps/server)

### Tech Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Real-time**: Socket.io
- **TTS**: OpenAI TTS API
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
│   │       └── openaiProvider.ts  # OpenAI TTS
│   │
│   └── utils/                  # 🔧 Utilities
│       ├── logger.ts              # Console logging
│       └── macOS.ts               # AppleScript helpers
│
└── config/
    └── default.json            # Default configuration
```

---

## TTS Architecture (OpenAI)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPEECH SYNTHESIZER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Configuration (.env)                                          │
│   ├─ OPENAI_API_KEY: string                                    │
│   ├─ TTS_VOICE: alloy|echo|fable|onyx|nova|shimmer             │
│   ├─ TTS_MODEL: tts-1|tts-1-hd                                 │
│   └─ TTS_RATE: 0.25-4.0                                        │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              OpenAI TTS Provider                        │   │
│   │                                                         │   │
│   │   Input: Text string                                    │   │
│   │          │                                              │   │
│   │          ▼                                              │   │
│   │   ┌─────────────────┐                                   │   │
│   │   │  OpenAI API     │  POST /v1/audio/speech           │   │
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
│   ├─ alloy    - Neutral, balanced (female)                     │
│   ├─ echo     - Warm, conversational (male)                    │
│   ├─ fable    - Expressive, dramatic (male)                    │
│   ├─ onyx     - Deep, authoritative (male)                     │
│   ├─ nova     - Friendly, upbeat (female) ⭐ default           │
│   └─ shimmer  - Clear, gentle (female)                         │
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
OPENAI_API_KEY=sk-proj-...     # Required for TTS
TTS_VOICE=nova                  # Voice selection
TTS_MODEL=tts-1                 # tts-1 or tts-1-hd
TTS_RATE=1.0                    # Speed (0.25-4.0)
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
| OpenAI API Key | TTS | [platform.openai.com](https://platform.openai.com) |

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
| TTS Provider | `apps/server/src/speech/providers/openaiProvider.ts` |
| WebSocket handlers | `apps/server/src/socket/handlers.ts` |
| Frontend entry | `apps/web/app/page.tsx` |
| Type definitions | `apps/server/src/core/types.ts` |
| Environment | `.env` |
