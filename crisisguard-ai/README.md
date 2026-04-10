# 🛡️ CrisisGuard AI

**AI-Powered Emergency Response & Crisis Coordination Platform for Hospitality Ecosystems**

CrisisGuard AI is a production-grade, real-time emergency management platform that combines AI-driven threat detection, dynamic evacuation routing, and multi-channel notification dispatch to protect guests and staff in hospitality environments.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard (Next.js 14)             │
│  Command Center │ Incidents │ Analytics │ Evacuation        │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket + REST
┌────────────────────────┼────────────────────────────────────┐
│                 API Gateway (Express/TS)                    │
│  Auth/RBAC │ Incidents │ Location │ Chat │ Rate Limiting    │
└──────┬─────────┬──────────┬───────────┬─────────────────────┘
       │         │          │           │
┌──────┴───┐ ┌───┴────┐ ┌──┴────┐ ┌────┴─────────────────┐
│WebSocket │ │  AI    │ │Alert  │ │  Notification        │
│Service   │ │Gateway │ │Service│ │  Service             │
│(Socket.IO)│ │(Gemini)│ │(Py)  │ │  (FCM/SMS/WebSocket) │
└──────────┘ └───┬────┘ └───────┘ └──────────────────────┘
                 │
       ┌─────────┴──────────┐
       │                    │
┌──────┴──────┐ ┌───────────┴──────────┐
│ Evacuation  │ │  Emergency Services  │
│ Engine      │ │  Gateway             │
│ (NetworkX)  │ │  (CAD/NG911/Voice)   │
└─────────────┘ └──────────────────────┘
```

## 📁 Project Structure

```
crisisguard-ai/
├── admin-dashboard/          # Next.js 14 Command Center
│   └── src/
│       ├── app/              # Pages (command, incidents, analytics, evacuation)
│       ├── components/       # Sidebar, dashboard widgets
│       ├── hooks/            # useWebSocket
│       ├── lib/              # Firebase client, API client
│       └── stores/           # Zustand (incidents, staff)
│
├── backend/
│   ├── api-gateway/          # Express + TypeScript
│   │   └── src/
│   │       ├── config/       # Firebase, environment
│   │       ├── controllers/  # Incident lifecycle controller
│   │       ├── middleware/    # Auth, RBAC, rate limiting, error handling
│   │       ├── routes/       # Health, auth, location, chat
│   │       ├── services/     # Lifecycle state machine
│   │       └── utils/        # Logger, errors
│   │
│   ├── websocket-service/    # Socket.IO real-time hub
│   ├── ai-gateway/           # FastAPI + Gemini 2.0
│   │   └── app/
│   │       ├── routers/      # Analysis, chat, summarization
│   │       └── services/     # Gemini service
│   │
│   ├── alert-service/        # FastAPI severity classifier
│   ├── notification-service/ # Multi-channel dispatch (FCM/SMS/WS)
│   ├── evacuation-engine/    # NetworkX graph routing + assembly
│   │   └── app/
│   │       ├── graph_builder.py
│   │       ├── route_calculator.py
│   │       ├── assembly_manager.py
│   │       └── routers/
│   │
│   └── emergency-services-gateway/ # CAD, NG911, telephony
│       └── src/integrations/
│
├── docker-compose.yml        # Full service orchestration
└── .env                      # Master configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.12+
- Docker & Docker Compose (optional)
- Redis (via Docker or installed)

### 1. Environment Setup
```bash
cp .env.example .env
# Edit .env with your Firebase, Gemini, and Twilio credentials
```

### 2. Start Backend Services

**API Gateway (port 3000):**
```bash
cd backend/api-gateway && npm install && npm run dev
```

**WebSocket Service (port 3003):**
```bash
cd backend/websocket-service && npm install && npm run dev
```

**AI Gateway (port 8001):**
```bash
cd backend/ai-gateway && pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**Evacuation Engine (port 8002):**
```bash
cd backend/evacuation-engine && pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

**Emergency Services Gateway (port 3005):**
```bash
cd backend/emergency-services-gateway && npm install && npm run dev
```

### 3. Start Admin Dashboard
```bash
cd admin-dashboard && npm install && npm run dev
# Opens at http://localhost:3001
```

### 4. Docker Compose (All Services)
```bash
docker-compose up --build
```

## 🧠 AI Capabilities

| Feature | Model | Endpoint |
|---------|-------|----------|
| CCTV Threat Analysis | Gemini 2.0 Vision | `POST /api/ai/analyze/image` |
| Text Classification | Gemini 2.0 Flash | `POST /api/ai/analyze/text` |
| Multilingual NLP | Gemini 2.0 Flash | `POST /api/ai/analyze/translate` |
| Emergency Chat | Gemini 2.0 + Crisis Prompt | `POST /api/ai/chat` |
| Rolling SITREP | Gemini 2.0 Flash | `POST /api/ai/sitrep` |
| After-Action Report | Gemini 2.0 Flash | `POST /api/ai/after-action` |

All AI endpoints include keyword-based fallback heuristics when the Gemini API is unavailable.

## 🚪 Evacuation Engine

- **Graph-based routing** using NetworkX (weighted directed graph)
- **Dynamic hazard avoidance** — block/unblock paths in real-time
- **Multi-origin batch routing** — 5 routes in ~2ms
- **Assembly point tracking** — check-in via app, QR scan, or staff manual entry
- **Exit load balancing** — optimal assignment across all exits

### Sample API Call
```bash
# Calculate evacuation route from room F3-east-02
curl -X POST http://localhost:8002/api/evacuation/route \
  -H "Content-Type: application/json" \
  -d '{"origin": "F3-room-east-02"}'

# Block a hazardous path
curl -X POST http://localhost:8002/api/evacuation/hazard/block \
  -H "Content-Type: application/json" \
  -d '{"from_node": "F1-corridor-east", "to_node": "exit-east"}'
```

## 🚨 Incident Lifecycle

```
detected → confirmed → responding → resolved
    ↓          ↓           ↓
 false_alarm  false_alarm  false_alarm

Auto-escalation timers:
  Critical: 15s → escalate, 60s → voice call
  High:     30s → escalate, 120s → voice call
  Medium:   60s → escalate, 300s → voice call
```

## 📡 External Integrations

| System | Protocol | Service |
|--------|----------|---------|
| CAD Dispatch | NIEM-compliant REST | Emergency Services Gateway |
| NG911 PSAP | Rich Data Package | Emergency Services Gateway |
| Twilio Voice | TTS + DTMF | Emergency Services Gateway |
| Twilio SMS | REST | Notification Service |
| Firebase Auth | Admin SDK | API Gateway |
| Firebase FCM | Push Notification | Notification Service |
| Firestore | Real-time | Location/Chat Services |

## 🔐 Security

- Firebase Authentication with JWT verification
- Role-based access control (`admin`, `staff`, `guest`)
- Helmet security headers
- CORS whitelisting
- Rate limiting (100 req/15min global, 20 req/15min auth)
- Non-root Docker containers
- mTLS-ready for CAD integration

## 📊 Admin Dashboard Pages

| Page | Description |
|------|-------------|
| **Command Center** | Real-time metrics, incident feed, staff dispatch, SITREP |
| **Incidents** | Filterable incident list with timeline detail view |
| **Analytics** | KPIs, hourly charts, incident types, zone risk heatmap |
| **Evacuation** | Route visualization, assembly tracking, blocked paths |

## 🧪 Testing

```bash
# TypeScript type checking (all services)
cd backend/api-gateway && npx tsc --noEmit
cd backend/emergency-services-gateway && npx tsc --noEmit
cd admin-dashboard && npx tsc --noEmit

# Python services
cd backend/ai-gateway && python -m pytest
cd backend/evacuation-engine && python -m pytest
```

## 📋 Environment Variables

See `.env` for the complete list. Key variables:

| Variable | Service | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | AI Gateway | Google Gemini API key |
| `GOOGLE_APPLICATION_CREDENTIALS` | API Gateway | Firebase service account path |
| `TWILIO_ACCOUNT_SID` | Notification/Emergency | Twilio Account SID |
| `REDIS_URL` | WebSocket/API Gateway | Redis connection string |

---

**Built with:** Node.js, Express, FastAPI, Next.js 14, TypeScript, Python, NetworkX, Socket.IO, Zustand, Firebase, Gemini 2.0, Twilio, Docker
