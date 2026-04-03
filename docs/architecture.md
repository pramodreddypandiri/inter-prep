# InterviewAce — Architecture

## System Overview

```
Browser (Next.js)  ←→  FastAPI Backend  ←→  Supabase (Postgres + Auth)
                              ↕
                      Anthropic Claude API
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, recharts |
| Backend | FastAPI, Python 3.9+, Pydantic |
| Database | Supabase (PostgreSQL) with Row Level Security |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Auth | Supabase Auth (email/password + magic link) |
| Deployment | Vercel (frontend), Render/Railway (backend) |

---

## Frontend Structure

```
frontend/src/
├── app/                         # Next.js App Router
│   ├── page.tsx                 # Landing page
│   ├── layout.tsx               # Root layout
│   ├── robots.ts                # robots.txt
│   ├── sitemap.ts               # sitemap.xml
│   ├── auth/
│   │   ├── login/               # Login page
│   │   ├── signup/              # Signup page + email confirm message
│   │   └── callback/route.ts    # Supabase OAuth callback
│   ├── contact/                 # Contact page
│   ├── dashboard/               # User sessions list
│   ├── elevator-pitch/          # Elevator pitch hub (generate + list)
│   │   └── [pitchId]/           # Pitch detail (editor + recorder + history)
│   ├── share/
│   │   └── pitch/[token]/       # Public share page (no auth required)
│   └── sessions/
│       └── [id]/
│           ├── page.tsx         # Session detail
│           ├── prepare/         # Prep sources view
│           ├── quiz/[quizId]/   # Quiz taking
│           └── mock/
│               ├── page.tsx     # Mock config
│               └── [mockId]/    # Live mock interview
├── components/
│   ├── Navbar.tsx
│   ├── mock/
│   │   ├── MockConfig.tsx       # Interview setup form
│   │   └── InterviewerAvatar.tsx
│   ├── quiz/
│   │   └── QuizConfig.tsx
│   ├── voice/
│   │   └── VoiceRecorder.tsx    # Web Speech API recording
│   └── video/
│       ├── EyeTracker.tsx       # Integrity monitoring (see below)
│       └── WebcamMonitor.tsx
├── lib/
│   ├── api.ts                   # Typed fetch wrappers for backend
│   ├── elevator-pitch/
│   │   └── pitch-utils.ts       # Pure utilities: duration estimate, score colors, MIME detection
│   ├── detection/               # Integrity detection system (see below)
│   └── supabase/
│       ├── client.ts            # Browser Supabase client
│       ├── server.ts            # Server-side Supabase client
│       └── middleware.ts        # Session refresh middleware
├── middleware.ts                # Auth guard for protected routes
└── types/
    ├── index.ts                 # Shared TypeScript interfaces
    └── speech.d.ts              # Web Speech API type shims
```

---

## Backend Structure

```
backend/app/
├── main.py              # FastAPI entry point, CORS config, lifespan handler
├── config.py            # Env vars (SUPABASE_URL, ANTHROPIC_API_KEY, CORS, etc.)
├── auth.py              # JWT verification dependency (get_current_user)
├── database.py          # Supabase service-role client
├── routers/
│   ├── sessions.py      # CRUD for prep sessions
│   ├── prep_sources.py  # AI-generated prep material
│   ├── quiz.py          # Quiz creation + answer submission
│   ├── mock_interview.py    # Mock interview lifecycle + messaging
│   ├── elevator_pitch.py    # Pitch CRUD, recording upload, public share
│   └── upload.py            # PDF resume parsing
└── services/
    ├── ai_service.py              # Claude API integration
    ├── quiz_service.py            # Question generation + grading
    ├── interview_service.py       # Conversational interview logic
    └── elevator_pitch_service.py  # Pitch generation + 7-dimension analysis
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions` | Create session |
| `GET` | `/api/sessions?user_id=` | List user sessions |
| `GET` | `/api/sessions/{id}` | Get session |
| `DELETE` | `/api/sessions/{id}` | Delete session |
| `POST` | `/api/sessions/{id}/prep-sources` | Generate AI prep sources |
| `GET` | `/api/sessions/{id}/prep-sources` | Get prep sources |
| `POST` | `/api/sessions/{id}/quiz` | Create quiz |
| `POST` | `/api/sessions/{id}/quiz/{qid}/submit` | Submit answers |
| `POST` | `/api/sessions/{id}/mock-interview` | Start mock interview |
| `POST` | `/api/sessions/{id}/mock-interview/{mid}/message` | Send message |
| `POST` | `/api/sessions/{id}/mock-interview/{mid}/end` | End + get feedback |
| `POST` | `/api/upload-resume` | Upload PDF resume |
| `GET` | `/health` | Health check |
| `POST` | `/api/elevator-pitch/generate` | AI-generate pitch text (stateless) |
| `POST` | `/api/elevator-pitch` | Save a new pitch |
| `GET` | `/api/elevator-pitch` | List user's pitches |
| `GET` | `/api/elevator-pitch/{id}` | Get pitch + recordings |
| `PUT` | `/api/elevator-pitch/{id}` | Update pitch text/meta |
| `DELETE` | `/api/elevator-pitch/{id}` | Delete pitch (cascades recordings) |
| `POST` | `/api/elevator-pitch/{id}/recordings` | Upload recording + run AI analysis |
| `GET` | `/api/elevator-pitch/{id}/recordings` | List recordings for a pitch |
| `GET` | `/api/elevator-pitch/share/{token}` | **Public** — get shared recording (no auth) |

---

## Integrity Detection System

Located at `frontend/src/lib/detection/`. Runs entirely client-side during mock interviews.

### Signal pipeline

```
Webcam + Mic stream
        │
        ├── GazeAnalyzer      → GazeSignal  ─┐
        ├── AudioAnalyzer     → AudioSignal  ─┤→ RiskEngine → RiskSnapshot (0–100)
        └── TimingAnalyzer    → TimingSignal ─┘         ↓
                                                   IntegrityStats
                                                 (sent to backend on interview end)
```

### GazeAnalyzer (`gaze-analyzer.ts`)

Uses **MediaPipe FaceLandmarker** (iris landmarks 468 + 473) to track gaze in real time.

Every 5 seconds emits a `GazeSignal`:
- **entropy** — Shannon entropy of yaw distribution across 12 bins (0 = reading, 1 = natural)
- **saccadeRate** — rapid horizontal eye movements per second (≥3°, ≥30°/s)
- **gazeAngleOffset** — average degrees off camera axis
- **readingPatternDetected** — low pitch variance + high yaw variance + ≥3 direction changes

**Fallback**: if FaceMesh fails (no GPU / WASM blocked), `EyeTracker` switches to brightness-based frame sampling at 2 fps to detect face absence and horizontal movement.

### AudioAnalyzer (`audio-analyzer.ts`)

Uses **Web Audio API** (`AnalyserNode`, FFT 2048).

Every 5 seconds emits an `AudioSignal`:
- **pitchVariance** — Hz² variance of detected speech pitch (85–400 Hz range)
- **typingDetected** — high broadband energy in 200–800 Hz with low voice energy (keyboard click signature)
- **secondSpeakerDetected** — two distinct pitch peaks > 50 Hz apart in voice range

### RiskEngine (`risk-engine.ts`)

Aggregates all signals into a weighted risk score (0–100):

| Component | Weight |
|---|---|
| Gaze entropy | 20% |
| Reading pattern | 20% |
| Onset delay | 15% |
| Fluency score | 10% |
| Tab switches | 10% |
| Typing detected | 10% |
| Second speaker | 8% |
| Screen share | 7% |

Also tracks **tab switches** via `document.visibilitychange`. Maintains a full `suspiciousEvents` timeline with timestamps and detail strings.

### EyeTracker component (`components/video/EyeTracker.tsx`)

React component that composes the detection modules. Exposes an imperative ref:

```ts
interface EyeTrackerRef {
  getStats: () => IntegrityStats;
  getRiskScore: () => number;
  getMediaStream: () => MediaStream | null;
}
```

Props: `autoStart`, `onWarning`, `onGazeSignal`, `onAudioSignal`, `onRiskUpdate`.

---

## Design System ("Apex")

Dark-first premium coaching aesthetic defined in `globals.css`:

- **Colors**: Monochromatic emerald (`#10b981` dark / `#059669` light), with full light mode via `prefers-color-scheme`
- **Typography**: Syne (display/headings) + Plus Jakarta Sans (body)
- **Utility classes**: `.btn-primary`, `.btn-ghost`, `.input-base`, `.gradient-border`, `.tag-primary`, `.tag-accent`, `.accent-badge`, `.orb`, `.step-active/.step-complete/.step-inactive`
- **Coaching reframe**: Detection signals are presented as coaching insights — "Focus Score" (inverted from risk), "Interview Presence" (not integrity), "Focus Tips" (not suspicious events)

---

## Authentication Flow

1. User signs up → Supabase sends confirmation email
2. User clicks link → redirects to `/auth/callback` → session cookie set
3. `middleware.ts` refreshes session on every request; redirects unauthenticated users away from protected routes
4. Backend routes verify JWT via `Depends(get_current_user)` — extracts `user_id` from the Supabase access token

---

## Database Schema

Migrations in `supabase/migrations/`.

Key tables:
- `sessions` — prep sessions (user_id, role, company, jd, resume text)
- `prep_sources` — AI-generated prep material per session
- `quiz_sessions` — quiz state, questions, answers, feedback; `status` column tracks lifecycle (`in_progress` → `completed` / `abandoned`)
- `mock_interviews` — interview transcripts, feedback; `status` column tracks lifecycle (`in_progress` → `completed` / `abandoned`)
