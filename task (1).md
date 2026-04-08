# CrisisGuard AI - Antigravity Development Task File

> **AI-Powered Emergency Response & Crisis Coordination System for Hospitality Ecosystems**
> Google Solution Challenge 2025-26

---

## Project Overview

CrisisGuard AI is a full-stack, cloud-native emergency response platform for hospitality venues (hotels, resorts, airports, cruise ships, convention centers). It detects emergencies via AI, alerts guests and staff instantly, coordinates response, and guides evacuations in real time.

**Three User Roles:** Guest | Staff/Security | Admin/Command Center

---

## Technology Stack

| Layer | Technology |
|---|---|
| Mobile Apps | Flutter 3.x + Dart (BLoC pattern) |
| Admin Dashboard | Next.js 14 + React 18 + TypeScript + Tailwind CSS |
| Backend API | Node.js 20 (Express) + FastAPI (Python) |
| Real-Time | Socket.IO + Firebase Realtime DB |
| Primary DB | Firebase Firestore |
| Analytics DB | PostgreSQL 16 (Cloud SQL) |
| Cache | Redis (Memorystore) |
| Message Queue | Google Cloud Pub/Sub |
| AI/ML | Google Vertex AI + Gemini 2.0 |
| Computer Vision | Vision AI + Custom TensorFlow/YOLOv8 |
| Speech | Google Speech-to-Text API |
| NLP/Chatbot | Gemini 2.0 + Vertex AI + RAG |
| Maps | Google Maps Platform (Indoor API, Directions, Places) |
| AR | ARCore (Android) / ARKit (iOS) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| SMS Fallback | Twilio API |
| Auth | Firebase Authentication |
| Wearable | Wear OS (Tiles API) |
| CI/CD | Cloud Build + Artifact Registry |
| Monitoring | Cloud Monitoring + Cloud Logging |
| Containers | Google Kubernetes Engine (GKE) |

---

## Signature Features (4 Major Features + 1 Dashboard)

### Feature 1: AI "Silent Sentry"
- Gemini AI listens for emergency sounds (glass breaking, screams, gunshots) from existing CCTV microphone feeds
- 3-stage pipeline: Detection (spectrogram CNN) -> Processing (Gemini multimodal) -> Alert & Action (FCM to staff)
- 96% classification accuracy, 2-second detection latency
- Zero additional hardware required - pure software on existing cameras
- **Google Stack:** Gemini AI, Vertex AI, Cloud Pub/Sub, FCM

### Feature 2: AR "Green Path" Navigation
- Augmented reality evacuation with neon-green chevron arrows overlaid on real floor via phone camera
- Dynamic hazard blocking: red "X" blocks paths toward fire/danger, auto-reroutes to safe exits
- Route recalculation every 5 seconds based on live CCTV fire detection + staff reports
- **Google Stack:** ARCore, Google Maps Indoor API, Vertex AI, Firebase WebSocket

### Feature 3: First Responder "X-Ray" Dashboard
- 3D transparent building model on firefighter tablets showing fire zones (orange/red) and guest locations (blue dots)
- Unresponsive devices flagged gray for search-and-rescue priority
- Real-time occupancy, evacuation %, unaccounted guests per floor
- **Google Stack:** Google Maps + WebGL, Firebase Realtime DB, Cloud Functions, Vertex AI

### Feature 4: Staff "Smart-Response" Wearables
- Smartwatch mini-map with fire location, directional arrows to nearest safety equipment
- Role-based mission assignments (security, medical, maintenance)
- Haptic silent mode, voice commands, one-tap acknowledgment
- **Google Stack:** FCM, Google Maps Indoor API, Wear OS Tiles API, Firebase Realtime DB

### Feature 5: Guest "Panic Triage" Dashboard
- Three oversized buttons: FIRE / MEDICAL / SECURITY on dark-mode high-contrast screen
- One tap = instant location capture + staff alert + 911 notification + AI instructions
- Sub-100ms sync via Firebase Data Connect
- **Google Stack:** Firebase Data Connect, FCM, Google Maps Indoor API, Gemini AI

---

## Module Breakdown

---

### MODULE 1: Authentication & User Management

**Priority:** P0 - Foundation (must be built first)
**Dependencies:** None
**Estimated Effort:** Week 1-2

#### 1.1 Firebase Auth Setup
- [ ] Create Firebase project and enable Authentication
- [ ] Configure auth providers: Email/Password, Phone OTP, Google Sign-In, Anonymous
- [ ] Set up Firebase Admin SDK in backend for server-side operations

#### 1.2 User Roles & RBAC
- [ ] Define three roles: `guest`, `staff`, `admin`
- [ ] Implement Firebase Custom Claims for role assignment
- [ ] Create middleware for JWT token validation on all API endpoints
- [ ] Build role-based route guards in Flutter and Next.js

#### 1.3 Firestore User Schema
```
Collection: users/{uid}
Fields:
  - uid: string (Firebase Auth UID)
  - role: string (guest | staff | admin)
  - displayName: string
  - email: string
  - phone: string (with country code)
  - propertyId: string (associated property)
  - locale: string (ISO 639-1 language code)
  - fcmTokens: array<string> (device push tokens)
  - lastLocation: geopoint
  - lastLocationFloor: number
  - status: string (active | evacuating | safe | sos)
  - staffRole: string (front_desk | housekeeping | security | maintenance | medical) [staff only]
  - certifications: array<string> (cpr | fire_warden | first_aid) [staff only]
  - zoneAssignment: string [staff only]
  - createdAt: timestamp
  - updatedAt: timestamp
```

#### 1.4 Flutter Auth Screens
- [ ] Login screen (email + phone + Google sign-in)
- [ ] Registration screen with role selection
- [ ] Profile setup screen (name, language, emergency contact)
- [ ] Guest anonymous check-in flow (no account required)
- [ ] Staff clock-in screen with zone selection

#### 1.5 API Endpoints
```
POST   /api/auth/register          - Create new user account
POST   /api/auth/login             - Login and return JWT
GET    /api/auth/profile           - Get current user profile
PUT    /api/auth/profile           - Update profile fields
POST   /api/auth/assign-role       - Assign role (admin only)
POST   /api/auth/refresh-token     - Refresh expired JWT
DELETE /api/auth/account           - Delete account (GDPR)
```

#### 1.6 Firestore Security Rules
- [ ] Write security rules: guests read own data only
- [ ] Staff read zone-level data + assigned incidents
- [ ] Admin read/write all property data
- [ ] Deny cross-property data access

#### 1.7 Deliverables
- [ ] Firebase project configured and tested
- [ ] Flutter auth flow working on Android + iOS
- [ ] Next.js admin login working
- [ ] API auth middleware tested with all 3 roles
- [ ] Firestore security rules deployed and tested

---

### MODULE 2: Emergency Alert System

**Priority:** P0 - Core System
**Dependencies:** Module 1
**Estimated Effort:** Week 3-5

#### 2.1 Guest SOS Interface (Flutter)

##### 2.1.1 SOS Button Component
- [ ] Fixed-position circular red button (72x72dp minimum) at bottom center of every screen
- [ ] Pulsing red glow animation (Flutter animation controller)
- [ ] Single tap = general emergency alert
- [ ] Long press (3 seconds) = silent alert mode
- [ ] Haptic feedback on press + confirmation vibration on success
- [ ] Works from lock screen via persistent notification widget

##### 2.1.2 Panic Triage Dashboard [SIGNATURE FEATURE]
- [ ] Full-screen dark-mode emergency interface
- [ ] Three oversized buttons: FIRE (red), MEDICAL (blue), SECURITY (dark)
- [ ] Each button: full-width, 72dp+ height, icon + label
- [ ] Mini-map at bottom showing guest's detected location ("YOU: ROOM 402")
- [ ] One-tap triggers: location capture + staff alert + 911 + AI instructions
- [ ] Countdown timer (0:04) confirming alert sent
- [ ] Voice-activated SOS option (microphone icon on each button)
- [ ] Firebase Data Connect integration for sub-100ms sync

##### 2.1.3 SOS Payload
```json
{
  "type": "fire | medical | security | general",
  "source": "guest_sos",
  "guestUid": "string",
  "location": {
    "coordinates": { "lat": 0.0, "lng": 0.0 },
    "floor": 4,
    "zone": "east_wing",
    "roomNumber": "402"
  },
  "timestamp": "ISO-8601",
  "deviceBattery": 78,
  "locale": "en",
  "silent": false,
  "attachments": ["photo_url"]
}
```

#### 2.2 Alert Ingestion Service (FastAPI)
- [ ] POST `/api/alerts/submit` endpoint
- [ ] Input validation (type, location, timestamp required)
- [ ] Rate limiting: max 3 alerts per user per 60 seconds
- [ ] Deduplication: ignore duplicate alerts from same user within 30 seconds
- [ ] Severity classification engine:
  - `critical`: fire, active_shooter, structural_collapse
  - `high`: medical_emergency, bomb_threat, severe_weather
  - `medium`: suspicious_package, minor_injury, elevator_entrapment
  - `low`: safety_hazard, noise_complaint, equipment_malfunction
- [ ] Generate unique incident ID
- [ ] Publish to Cloud Pub/Sub topic `confirmed-alerts`
- [ ] Write event to Firestore `emergencyEvents` collection

#### 2.3 Firestore Emergency Events Schema
```
Collection: emergencyEvents/{eventId}
Fields:
  - eventId: string (auto-generated)
  - propertyId: string
  - type: string (fire | medical | security | natural_disaster | hazard)
  - severity: string (critical | high | medium | low)
  - status: string (detected | confirmed | responding | resolved | false_alarm)
  - source: string (ai_cctv | ai_audio | ai_text | guest_sos | staff_report)
  - location: map { floor, zone, coordinates, description }
  - detectedAt: timestamp
  - confirmedAt: timestamp
  - resolvedAt: timestamp
  - assignedStaff: array<string> (UIDs)
  - guestCount: number
  - metadata: map (AI confidence, camera ID, etc.)
```

#### 2.4 Notification Dispatcher (Node.js)
- [ ] Subscribe to `confirmed-alerts` Pub/Sub topic
- [ ] Parallel dispatch across channels:
  - **FCM Push:** High-priority notifications to all affected guests + assigned staff
  - **WebSocket:** Real-time broadcast to admin dashboard
  - **SMS (Twilio):** Fallback for guests without app / low battery
  - **Email:** Property management + corporate contacts
- [ ] Priority-based notification logic:
  - P0 Critical: ALL channels simultaneously + external services
  - P1 High: Push + SMS + WebSocket + command center
  - P2 Medium: Push + WebSocket + assigned staff only
  - P3 Low: WebSocket + duty manager only
- [ ] Delivery tracking: sent, delivered, read, acknowledged
- [ ] Retry logic with exponential backoff for failed deliveries

#### 2.5 Incident Lifecycle Management
- [ ] State machine: `detected -> confirmed -> responding -> resolved | false_alarm`
- [ ] Auto-escalation: unacknowledged staff alerts escalate after 15 seconds
- [ ] Auto-phone-call: unacknowledged guest notifications trigger Twilio Voice call after 60 seconds
- [ ] Task assignment engine: dispatch to nearest qualified staff based on proximity + role + availability
- [ ] Incident communication channel: auto-create per incident for responder coordination
- [ ] Resolution workflow: require staff confirmation + optional incident report

#### 2.6 Staff Alert Interface (Flutter)
- [ ] Full-screen alert card overriding current screen
- [ ] Color-coded severity: red (critical), orange (high), yellow (medium)
- [ ] Display: emergency type, exact location, assigned tasks, distance estimate
- [ ] 15-second countdown with Accept/Decline buttons
- [ ] Maximum volume alarm tone via FCM high-priority channel
- [ ] Task status updates: en_route, on_scene, task_complete, escalated

#### 2.7 Deliverables
- [ ] SOS button working in Flutter app with Panic Triage dashboard
- [ ] Alert ingestion API deployed on Cloud Run
- [ ] Pub/Sub pipeline tested end-to-end
- [ ] FCM notifications delivered to Android + iOS
- [ ] SMS fallback working via Twilio
- [ ] Staff alert acknowledgment flow complete
- [ ] Incident lifecycle transitions tested

---

### MODULE 3: Real-Time Tracking & Communication

**Priority:** P1 - Critical Infrastructure
**Dependencies:** Module 1, Module 2
**Estimated Effort:** Week 5-7

#### 3.1 Indoor Positioning System
- [ ] BLE beacon triangulation integration (Flutter: flutter_blue_plus)
- [ ] Wi-Fi fingerprinting for building-level positioning
- [ ] Barometric pressure sensor for floor detection
- [ ] IMU dead reckoning between beacon readings
- [ ] Hybrid position calculation: 3-5 meter accuracy
- [ ] Location update frequency: 5 seconds (normal) / 1 second (active incident)
- [ ] Write location to Firestore `users/{uid}.lastLocation`

#### 3.2 WebSocket Server (Socket.IO + Node.js)
- [ ] Socket.IO server deployed on GKE with sticky sessions (Nginx Ingress)
- [ ] Redis Pub/Sub adapter for cross-instance message delivery
- [ ] Connection types:
  - Persistent: staff + admin (always-on)
  - On-demand: guests (connect during active incidents via FCM trigger)
  - Fallback: HTTP long-polling when WebSocket blocked
- [ ] Heartbeat: 25-second intervals with auto-reconnect (exponential backoff)

#### 3.3 Channel Architecture
- [ ] Property namespace: all connections for one property
- [ ] Incident rooms: auto-created per incident, staff auto-joined
- [ ] Zone rooms: guests auto-joined based on indoor location
- [ ] Direct channels: one-to-one staff-to-guest or command-to-responder

#### 3.4 Message Types
```
alert.new        Server -> Client    Incident details + instructions      Critical
alert.update     Server -> Client    Updated status + new instructions    High
location.update  Client -> Server    Coordinates, floor, timestamp        Normal
task.assign      Server -> Staff     Task details, location, deadline     High
task.status      Staff -> Server     Task ID, new status, notes           Normal
chat.message     Bidirectional       Text, media URL, sender info         Normal
evacuation.route Server -> Guest     Route waypoints, distance, ETA       Critical
heartbeat        Bidirectional       Timestamp, connection metadata       Low
```

#### 3.5 Communication Hub
- [ ] Broadcast channel: command center -> all staff
- [ ] Team channels: zone-specific or role-specific groups
- [ ] Direct messaging: private staff-to-staff or staff-to-command
- [ ] Support: text, voice notes, photo attachments, location sharing
- [ ] Push-to-talk voice messaging (walkie-talkie style)

#### 3.6 Guest Location Map (Staff App)
- [ ] Real-time map of all guests in assigned zone
- [ ] Color-coded dots: green (acknowledged), yellow (no response), red (SOS), gray (offline 60s+)
- [ ] Tap guest marker -> room number, name, last location time, navigation route

#### 3.7 Deliverables
- [ ] Indoor positioning working with BLE beacons on test floor
- [ ] Socket.IO server handling 1000+ connections
- [ ] Redis adapter enabling multi-instance message delivery
- [ ] Chat system functional with broadcast + team + direct channels
- [ ] Staff map showing live guest locations

---

### MODULE 4: Admin Command Center Dashboard

**Priority:** P1 - Management Interface
**Dependencies:** Module 1, Module 2, Module 3
**Estimated Effort:** Week 7-9

#### 4.1 Next.js Project Setup
- [ ] Initialize Next.js 14 with TypeScript + Tailwind CSS
- [ ] Configure Zustand for state management
- [ ] Socket.IO client integration for real-time updates
- [ ] Firebase Admin SDK for server-side auth verification
- [ ] Responsive grid layout: monitoring mode vs. crisis mode

#### 4.2 Crisis Monitoring Dashboard
- [ ] Multi-panel interface (optimized for large displays)
- [ ] Primary panel (60%): Interactive building floor plan with overlays:
  - Guest locations (anonymized color-coded dots)
  - Staff positions (labeled markers with role icons)
  - AI detection alerts (flashing icons at camera locations)
  - Incident zones (highlighted areas with severity shading)
  - Evacuation route status (green = clear, red = blocked)
- [ ] Multi-property view for portfolio operators

#### 4.3 Real-Time Incident Heatmap
- [ ] WebGL-accelerated visualization layer (30fps at 50,000+ points)
- [ ] Data layers (toggle on/off):
  - Guest density (blue-to-red gradient)
  - AI threat zones (pulsing red overlays)
  - Evacuation flow vectors (animated arrows)
  - Staff coverage gaps (amber zones)
  - Historical incident hotspots (semi-transparent rings)
- [ ] Time-range filter for incident replay
- [ ] Export heatmap snapshots as evidence

#### 4.4 Incident Analytics
- [ ] Real-time metrics: active incidents, avg response time, staff utilization, evacuation %
- [ ] Historical: monthly trends, response time distributions, staff performance rankings
- [ ] Chart.js visualizations: bar, line, pie, heatmap by time-of-day

#### 4.5 Staff Assignment & Deployment
- [ ] On-duty staff list with current assignment, zone, status
- [ ] AI-assisted dispatch recommendations (proximity + skill + workload)
- [ ] One-click accept or manual override
- [ ] Skills matrix per staff member

#### 4.6 Live Crisis Situation Updates
- [ ] Streaming incident feed (role-appropriate detail levels)
- [ ] AI-generated rolling SITREPs every 60 seconds via Gemini
- [ ] 3-5 sentence summary of last 60 seconds of all incident data

#### 4.7 Communication Logs & Audit Trail
- [ ] Immutable append-only log with millisecond timestamps
- [ ] Search, filter, export for incident reports / insurance / legal
- [ ] Automated incident summary reports within 15 minutes of resolution

#### 4.8 Deliverables
- [ ] Admin dashboard deployed and accessible via web
- [ ] Real-time building map with live location overlays
- [ ] Heatmap rendering at 30fps with 10,000+ points
- [ ] Staff dispatch panel working with AI recommendations
- [ ] SITREP engine generating readable summaries

---

### MODULE 5: AI Detection System

**Priority:** P0 - Core Differentiator
**Dependencies:** Module 1, Module 2
**Estimated Effort:** Week 8-12

#### 5.1 AI "Silent Sentry" - Sound Detection [SIGNATURE FEATURE]

##### 5.1.1 Audio Pipeline Setup
- [ ] RTSP stream audio extraction from existing CCTV cameras
- [ ] Audio sampling at configurable rate per camera
- [ ] Spectrogram generation (Mel-frequency cepstral coefficients)

##### 5.1.2 Sound Classification Model
- [ ] Train CNN classifier on spectrogram images (Vertex AI Training)
- [ ] 12 emergency sound categories: glass breaking, screams, gunshots, smoke alarm tones, explosion impacts, aggressive shouting, running/stampede, crashing/structural, water flooding, vehicle collision, alarm sirens, crowd panic vocalization
- [ ] Target: 96% accuracy, <2 second detection latency
- [ ] False positive reduction: venue-specific noise profiles (pool, restaurant, entertainment)

##### 5.1.3 Gemini Multimodal Correlation
- [ ] Send detected audio event + simultaneous CCTV frame to Gemini AI
- [ ] Contextual analysis: time of day, location type, recent activity
- [ ] Severity classification output
- [ ] Publish confirmed events to alert pipeline (Cloud Pub/Sub)

##### 5.1.4 Staff Alert Integration
- [ ] Alert format: "Glass break detected, Room 302" with confidence score
- [ ] One-tap Acknowledge button
- [ ] 15-second escalation if unacknowledged

#### 5.2 CCTV Emergency Detection (Computer Vision)
- [ ] RTSP stream frame sampling at 5 FPS per camera
- [ ] Stage 1: MobileNet-SSD scene classification (normal vs. anomaly)
- [ ] Stage 2 specialized models: YOLOv8 fire/smoke (94% target), crowd panic via optical flow, pose estimation for fallen persons, abandoned object detection
- [ ] Stage 3: Temporal analysis - 3+ consecutive frames (600ms) before alert
- [ ] Deploy on Vertex AI Endpoints with GPU acceleration
- [ ] A/B testing for gradual model updates

#### 5.3 Voice Distress Recognition
- [ ] On-device keyword spotting (TFLite): "Help", "Emergency", "SOS" in 40+ languages
- [ ] Whisper-based multilingual keyword detection
- [ ] Ambient distress classification (screams, glass, gunshots) - no raw audio stored
- [ ] 85% confidence threshold + contextual validation
- [ ] Works screen-off via low-power on-device model

#### 5.4 Generative AI Emergency Assistant (Gemini 2.0)
- [ ] Gemini 2.0 with crisis-specific system prompt + RAG
- [ ] RAG grounded in: property floor plans, emergency protocols, live incident data
- [ ] Multimodal input: text + voice (Whisper transcription) + image (scene classification)
- [ ] Outputs: personalized evacuation, first aid guidance, emotional de-escalation
- [ ] 40+ language support with auto-detection
- [ ] Safety-critical output validation for directional/medical terms
- [ ] Streaming token-by-token responses

#### 5.5 AI Panic Detection
- [ ] Visual: Video Swin Transformer for crowd stampede / mass movement
- [ ] Acoustic: Whisper-based spectrogram classifiers for collective screaming
- [ ] Behavioral: on-device accelerometer/gyroscope for mass running detection
- [ ] Bayesian fusion: require 2+ corroborating vectors before P0 alert
- [ ] Sub-3-second detection latency

#### 5.6 AI Incident Summarization
- [ ] Rolling SITREPs every 60 seconds during active incidents
- [ ] Post-incident after-action reports with timeline + bottleneck identification
- [ ] Export PDF + DOCX within 15 minutes of resolution

#### 5.7 Anomaly Detection Engine
- [ ] Isolation forest for unusual CCTV/access log patterns
- [ ] LSTM for behavioral baseline deviation
- [ ] Graph neural networks for multi-camera spatial correlation
- [ ] Three-tier: advisory -> warning -> critical

#### 5.8 AI Gateway API (FastAPI)
```
POST /api/ai/analyze-frame     - CCTV frame analysis
POST /api/ai/analyze-audio     - Audio event classification
POST /api/ai/chat              - Gemini emergency assistant
POST /api/ai/summarize         - Incident summarization
POST /api/ai/detect-anomaly    - Anomaly detection
POST /api/ai/classify-image    - Guest-submitted photo analysis
```

#### 5.9 Deliverables
- [ ] Silent Sentry detecting 12 sound categories at 96% accuracy
- [ ] CCTV fire/smoke detection deployed on Vertex AI
- [ ] Gemini assistant responding in 40+ languages with multimodal input
- [ ] Panic detection fusing visual + acoustic + behavioral signals
- [ ] Incident summarization generating readable SITREPs
- [ ] All AI outputs integrated with alert pipeline

---

### MODULE 6: Emergency Response Workflow

**Priority:** P0 - Life Safety
**Dependencies:** All previous modules (1-5)
**Estimated Effort:** Week 10-14

#### 6.1 Evacuation Routing Engine (Python + NetworkX)
- [ ] Property graph model: nodes = locations, edges = walkable paths
- [ ] Edge weights: distance, traversal time, accessibility rating, current status
- [ ] Modified Dijkstra's for shortest safe path
- [ ] Dynamic weights: emergency type, blocked routes, crowd density, accessibility

#### 6.2 Smart Evacuation Route Generation
- [ ] RL agent trained on simulated evacuation scenarios
- [ ] Predictive congestion avoidance (30-60 seconds ahead)
- [ ] Personalized routes: mobility, group size, floor location
- [ ] Multi-exit load balancing proportional to exit capacity
- [ ] 10,000 simultaneous routes in <500ms (GPU-accelerated)
- [ ] Push route updates via WebSocket every 5 seconds

#### 6.3 AR "Green Path" Navigation [SIGNATURE FEATURE]
- [ ] ARCore integration in Flutter (ar_flutter_plugin)
- [ ] Floor plane detection + neon-green chevron arrow rendering
- [ ] Animated path to nearest safe exit with EXIT sign highlight
- [ ] Dynamic red "X" for blocked/dangerous paths
- [ ] "EMERGENCY MODE ACTIVE" banner overlay
- [ ] Route recalculation every 5 seconds via WebSocket

#### 6.4 First Responder "X-Ray" Dashboard [SIGNATURE FEATURE]
- [ ] 3D WebGL building model with transparent floor layers
- [ ] Fire zones: pulsating orange-red shading with AI spread prediction
- [ ] Guest locations: blue pulse dots (live), gray (unresponsive = rescue priority)
- [ ] Staff positions: green markers with role icons
- [ ] Header: SIGNAL strength + POWER indicators
- [ ] Tap-to-zoom floor-level 2D plans
- [ ] Secure sharing with authorized first responder devices

#### 6.5 Assembly Point Management
- [ ] Configure assembly points with max capacity
- [ ] Check-in: app button, QR code scan, staff manual
- [ ] Real-time headcount: expected vs. arrived
- [ ] Flag unaccounted guests with last known location

#### 6.6 Staff "Smart-Response" Wearables [SIGNATURE FEATURE]
- [ ] Wear OS companion app
- [ ] Mini-map + fire location (red badge) + green arrow to safety equipment
- [ ] Blue-red border animation for critical alerts
- [ ] Three modes: haptic-only, voice commands, one-tap acknowledge
- [ ] Wear OS Tiles API for persistent emergency display
- [ ] Bi-directional sync with command center

#### 6.7 Emergency Services Integration
- [ ] CAD integration (NIEM format over HTTPS)
- [ ] NG911 compatibility (rich data: location, photos, video)
- [ ] REST API for bidirectional dispatcher communication
- [ ] Telephony fallback: Twilio Voice with TTS incident summary
- [ ] Data package: address, GPS, type, severity, occupancy, floor plans, CCTV snapshots

#### 6.8 Post-Incident Reporting
- [ ] Automated timeline reconstruction from all event logs
- [ ] AI after-action report (Gemini) with bottleneck identification
- [ ] Export PDF + DOCX for regulatory filing

#### 6.9 Drill Mode
- [ ] Simulate without triggering external services
- [ ] Configurable scenarios + scripted event sequences
- [ ] Performance measurement + automated drill reports

#### 6.10 Deliverables
- [ ] Evacuation routing: 10,000 routes in <500ms
- [ ] AR Green Path working on Android with ARCore
- [ ] X-Ray Dashboard rendering 3D building with live data
- [ ] Wearable app deployed on Wear OS
- [ ] Assembly point check-in functional
- [ ] Emergency services gateway tested
- [ ] Drill mode running complete simulations

---

## Cross-Module Tasks

### Security & Privacy
- [ ] AES-256 encryption at rest (Cloud KMS)
- [ ] TLS 1.3 for all API + WebSocket communications
- [ ] Application-level envelope encryption for sensitive fields
- [ ] Location data: explicit opt-in, 24h retention (normal), 90-day (incident)
- [ ] GDPR compliance: data access, erasure, portability
- [ ] OWASP compliance review + penetration testing

### Offline & Resilience
- [ ] Hive local DB for cached floor plans, routes, contacts
- [ ] SOS queuing when offline, auto-transmit on reconnect
- [ ] Mesh networking: Wi-Fi Direct + Bluetooth (Google Nearby Connections API)
- [ ] Device-to-device alert propagation within 30m radius
- [ ] Dedicated emergency Wi-Fi on separate VLAN with UPS-backed APs

### Scalability Targets
- [ ] 1,000+ properties, 1M+ users simultaneously
- [ ] 10,000+ alerts/second via Cloud Pub/Sub
- [ ] 500,000+ WebSocket connections
- [ ] Multi-region: us-central1, europe-west1, asia-southeast1

### Testing
- [ ] Unit tests: 80%+ coverage (Jest, Pytest, Flutter Test)
- [ ] Integration: end-to-end alert pipeline, WebSocket lifecycle, AI pipeline
- [ ] Stress (Locust): 10,000 simultaneous SOS, 50,000 WebSocket connections
- [ ] Performance: alert pipeline <3s P99, WebSocket <500ms P99, API <200ms P95
- [ ] Monthly emergency simulation drills per property

### CI/CD Pipeline
- [ ] GitHub -> Cloud Build on PR: unit tests + lint + SonarQube
- [ ] Docker build -> Artifact Registry -> staging GKE
- [ ] Integration + load tests on staging
- [ ] Manual approval -> production canary (10% for 30min)
- [ ] Auto-rollback if error >1% or latency exceeds P99

---

## Development Phases Timeline

| Phase | Weeks | Focus | Modules |
|---|---|---|---|
| Phase 1: Foundation | 1-2 | GCP + Firebase + Auth + Flutter scaffold | Module 1 |
| Phase 2: Core Alerts | 3-5 | SOS + Panic Triage + Alert pipeline + Notifications | Module 2 |
| Phase 3: Real-Time | 5-7 | Location tracking + WebSocket + Communication | Module 3 |
| Phase 4: Admin | 7-9 | Command center + Heatmap + Analytics + SITREP | Module 4 |
| Phase 5: AI Layer | 8-12 | Silent Sentry + CCTV + Gemini + Panic Detection | Module 5 |
| Phase 6: Response | 10-14 | Evacuation + AR Green Path + X-Ray + Wearables | Module 6 |
| Phase 7: Hardening | 15-17 | Security + Offline mode + Stress testing | Cross-module |
| Phase 8: Launch | 18-20 | Drill testing + Production deploy + Docs | All |

---

## File Structure

```
crisisguard-ai/
|
|-- mobile/                          # Flutter app (Guest + Staff)
|   |-- lib/
|   |   |-- main.dart
|   |   |-- app/
|   |   |   |-- app.dart
|   |   |   |-- router.dart
|   |   |-- features/
|   |   |   |-- auth/
|   |   |   |   |-- bloc/
|   |   |   |   |-- screens/
|   |   |   |   |-- widgets/
|   |   |   |-- sos/
|   |   |   |   |-- bloc/
|   |   |   |   |-- screens/
|   |   |   |   |   |-- sos_button_screen.dart
|   |   |   |   |   |-- panic_triage_screen.dart
|   |   |   |   |-- widgets/
|   |   |   |-- evacuation/
|   |   |   |   |-- bloc/
|   |   |   |   |-- screens/
|   |   |   |   |   |-- evacuation_map_screen.dart
|   |   |   |   |   |-- ar_greenpath_screen.dart
|   |   |   |-- chat/
|   |   |   |   |-- bloc/
|   |   |   |   |-- screens/
|   |   |   |   |   |-- emergency_chat_screen.dart
|   |   |   |-- tracking/
|   |   |   |   |-- bloc/
|   |   |   |   |-- services/
|   |   |   |   |   |-- indoor_positioning_service.dart
|   |   |   |   |   |-- ble_beacon_service.dart
|   |   |   |-- staff/
|   |   |   |   |-- bloc/
|   |   |   |   |-- screens/
|   |   |   |   |   |-- alert_dashboard_screen.dart
|   |   |   |   |   |-- guest_location_map_screen.dart
|   |   |   |   |   |-- task_management_screen.dart
|   |   |   |-- voice_sos/
|   |   |   |   |-- services/
|   |   |   |   |   |-- keyword_spotter.dart
|   |   |   |   |   |-- distress_detector.dart
|   |   |-- core/
|   |   |   |-- services/
|   |   |   |   |-- firebase_service.dart
|   |   |   |   |-- websocket_service.dart
|   |   |   |   |-- notification_service.dart
|   |   |   |   |-- location_service.dart
|   |   |   |   |-- offline_cache_service.dart
|   |   |   |-- models/
|   |   |   |-- utils/
|   |   |   |-- theme/
|   |-- pubspec.yaml
|
|-- wearable/                        # Wear OS companion app
|   |-- lib/
|   |   |-- main.dart
|   |   |-- screens/
|   |   |   |-- alert_screen.dart
|   |   |   |-- minimap_screen.dart
|   |   |-- services/
|   |   |   |-- fcm_service.dart
|   |   |   |-- location_service.dart
|
|-- admin-dashboard/                 # Next.js admin web app
|   |-- src/
|   |   |-- app/
|   |   |   |-- layout.tsx
|   |   |   |-- page.tsx
|   |   |   |-- dashboard/page.tsx
|   |   |   |-- incidents/page.tsx
|   |   |   |-- analytics/page.tsx
|   |   |   |-- staff/page.tsx
|   |   |-- components/
|   |   |   |-- BuildingMap.tsx
|   |   |   |-- IncidentHeatmap.tsx
|   |   |   |-- StaffDispatchPanel.tsx
|   |   |   |-- IncidentFeed.tsx
|   |   |   |-- SitrepDisplay.tsx
|   |   |   |-- XRayDashboard.tsx
|   |   |   |-- CommunicationHub.tsx
|   |   |-- hooks/
|   |   |   |-- useWebSocket.ts
|   |   |   |-- useIncidents.ts
|   |   |-- stores/
|   |   |   |-- incidentStore.ts
|   |   |   |-- staffStore.ts
|   |-- package.json
|   |-- tailwind.config.ts
|
|-- backend/
|   |-- api-gateway/                 # Node.js Express
|   |   |-- src/
|   |   |   |-- index.ts
|   |   |   |-- middleware/auth.ts
|   |   |   |-- middleware/rateLimiter.ts
|   |   |   |-- routes/auth.ts
|   |   |   |-- routes/alerts.ts
|   |   |   |-- routes/incidents.ts
|   |   |   |-- routes/users.ts
|   |   |-- Dockerfile
|   |
|   |-- alert-service/               # FastAPI Python
|   |   |-- app/
|   |   |   |-- main.py
|   |   |   |-- routers/alerts.py
|   |   |   |-- routers/incidents.py
|   |   |   |-- services/severity_classifier.py
|   |   |   |-- services/deduplication.py
|   |   |   |-- services/pubsub_publisher.py
|   |   |-- Dockerfile
|   |
|   |-- notification-service/        # Node.js
|   |   |-- src/
|   |   |   |-- index.ts
|   |   |   |-- dispatchers/fcm.ts
|   |   |   |-- dispatchers/sms.ts
|   |   |   |-- dispatchers/email.ts
|   |   |   |-- dispatchers/websocket.ts
|   |   |-- Dockerfile
|   |
|   |-- websocket-service/           # Socket.IO + Node.js
|   |   |-- src/
|   |   |   |-- index.ts
|   |   |   |-- namespaces/
|   |   |   |-- rooms/
|   |   |   |-- handlers/
|   |   |-- Dockerfile
|   |
|   |-- ai-gateway/                  # FastAPI Python
|   |   |-- app/
|   |   |   |-- main.py
|   |   |   |-- routers/vision.py
|   |   |   |-- routers/audio.py
|   |   |   |-- routers/chat.py
|   |   |   |-- routers/summarization.py
|   |   |   |-- routers/anomaly.py
|   |   |   |-- services/vertex_ai.py
|   |   |   |-- services/gemini_client.py
|   |   |   |-- services/silent_sentry.py
|   |   |   |-- services/panic_detector.py
|   |   |-- Dockerfile
|   |
|   |-- evacuation-engine/           # Python + NetworkX
|   |   |-- app/
|   |   |   |-- main.py
|   |   |   |-- graph_builder.py
|   |   |   |-- route_calculator.py
|   |   |   |-- smart_evacuation.py
|   |   |   |-- assembly_manager.py
|   |   |-- Dockerfile
|   |
|   |-- emergency-services-gateway/  # Node.js
|   |   |-- src/
|   |   |   |-- index.ts
|   |   |   |-- integrations/cad.ts
|   |   |   |-- integrations/ng911.ts
|   |   |   |-- integrations/telephony.ts
|   |   |-- Dockerfile
|
|-- ai-models/
|   |-- fire-smoke-detection/
|   |   |-- train.py
|   |   |-- model_config.yaml
|   |-- sound-classification/
|   |   |-- train.py
|   |   |-- spectrogram_generator.py
|   |-- panic-detection/
|   |   |-- visual_model.py
|   |   |-- acoustic_model.py
|   |   |-- fusion_engine.py
|   |-- voice-distress/
|   |   |-- keyword_spotter_tflite.py
|
|-- infrastructure/
|   |-- terraform/
|   |   |-- main.tf
|   |   |-- gke.tf
|   |   |-- cloudsql.tf
|   |   |-- pubsub.tf
|   |   |-- iam.tf
|   |   |-- monitoring.tf
|   |-- k8s/
|   |   |-- deployments/
|   |   |-- services/
|   |   |-- ingress/
|   |-- docker-compose.yml           # Local dev
|
|-- firebase/
|   |-- firestore.rules
|   |-- firestore.indexes.json
|   |-- firebase.json
|
|-- docs/
|   |-- PRD.md
|   |-- API.md
|   |-- architecture.md
|
|-- .github/workflows/
|   |-- ci.yml
|   |-- deploy-staging.yml
|   |-- deploy-production.yml
|
|-- README.md
|-- task.md
```

---

## Quick Start Commands

```bash
# 1. Clone and setup
git clone <repo-url> crisisguard-ai && cd crisisguard-ai

# 2. Firebase setup
npm install -g firebase-tools
firebase login
firebase init  # Select: Firestore, Auth, Functions, Hosting, Cloud Messaging

# 3. Flutter mobile app
cd mobile && flutter pub get && flutter run

# 4. Admin dashboard
cd admin-dashboard && npm install && npm run dev

# 5. Backend services (local)
docker-compose up -d

# 6. Deploy to GCP
cd infrastructure/terraform && terraform init && terraform plan && terraform apply
```

---

## Google APIs to Enable

```
Vertex AI API                    Cloud Vision API
Google Maps JavaScript API       Speech-to-Text API
Google Maps SDK (Android/iOS)    Cloud Pub/Sub API
Places API                       Cloud SQL Admin API
Directions API                   Cloud Build API
ARCore API                       Artifact Registry API
Firebase Cloud Messaging API     Cloud Run API
Firebase Authentication          Kubernetes Engine API
Firestore API                    Cloud Functions API
Cloud Monitoring API             Cloud Logging API
```

---

## Environment Variables

```env
# Firebase
FIREBASE_PROJECT_ID=crisisguard-ai
FIREBASE_API_KEY=xxx
FIREBASE_AUTH_DOMAIN=crisisguard-ai.firebaseapp.com

# GCP
GCP_PROJECT_ID=crisisguard-ai
GCP_REGION=us-central1
VERTEX_AI_ENDPOINT=xxx

# Gemini
GEMINI_API_KEY=xxx
GEMINI_MODEL=gemini-2.0-flash

# Database
POSTGRES_HOST=xxx
POSTGRES_DB=crisisguard
POSTGRES_USER=xxx
POSTGRES_PASSWORD=xxx
REDIS_URL=redis://xxx:6379

# Twilio
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

# Maps
GOOGLE_MAPS_API_KEY=xxx

# Socket.IO
SOCKETIO_REDIS_URL=redis://xxx:6379

# App Config
ALERT_ESCALATION_TIMEOUT_MS=15000
LOCATION_UPDATE_INTERVAL_NORMAL_MS=5000
LOCATION_UPDATE_INTERVAL_EMERGENCY_MS=1000
MAX_SOS_PER_USER_PER_MINUTE=3
```

---

*CrisisGuard AI - Building Safety Through Intelligent Technology*
*Google Solution Challenge 2025-26*
