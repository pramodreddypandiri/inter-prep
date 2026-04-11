# Changelog

All notable changes to InterviewAce are recorded here.

---

## [Unreleased] — 2026-04-11

### Added — Editable Sessions

Users can now edit an existing session after creation: session name, company, job description, round description, and resume (via re-upload).

**Frontend:**
- New `EditSessionModal` component ([frontend/src/components/EditSessionModal.tsx](frontend/src/components/EditSessionModal.tsx)) — controlled form seeded from the current session, resume re-upload reuses `api.uploadResume` to parse the new file into `resume_text` before saving.
- Session detail page ([frontend/src/app/sessions/[id]/page.tsx](frontend/src/app/sessions/[id]/page.tsx)) gained an "Edit Session" button in the header that opens the modal and applies the returned session on save.
- Prepare page ([frontend/src/app/sessions/[id]/prepare/page.tsx](frontend/src/app/sessions/[id]/prepare/page.tsx)) now loads the session alongside prep sources and shows a "Session inputs changed" warning banner when `session.updated_at > prep_source.generated_at`, with a one-click Regenerate All action.

**Backend:**
- New `PATCH /api/sessions/{session_id}` route ([backend/app/routers/sessions.py](backend/app/routers/sessions.py)) that accepts a partial `SessionUpdate` payload, verifies ownership, and applies only provided fields. The router explicitly stamps `updated_at = now()` in the payload so the stale-prep comparison works regardless of trigger state.
- New `SessionUpdate` Pydantic schema in [backend/app/models/schemas.py](backend/app/models/schemas.py); `SessionResponse` now surfaces `updated_at`.
- `Session` frontend type already carried `updated_at`; no type change required.

**Database:**
- New idempotent migration [supabase/migrations/004_sessions_updated_at.sql](supabase/migrations/004_sessions_updated_at.sql) — adds the `updated_at` column + auto-bump trigger to `sessions` for environments provisioned before migration 001's definition. Also issues `NOTIFY pgrst, 'reload schema'` so PostgREST picks up the new column without a server restart. **Run this migration in any environment whose `sessions` table is missing `updated_at`.**

**Stale-data policy:** Prep sources, quizzes, mock interviews, and derived content are **not** auto-invalidated on edit — the banner warns the user and lets them choose when to regenerate.

---

## [Unreleased] — 2026-04-03

### Added — Elevator Pitch Feature

**What it is:** Users can generate a 45–60 second AI elevator pitch tailored to their target role and resume, edit it, record themselves delivering it (video + speech-to-text), receive a scored AI analysis (0–100 across 7 dimensions), replay previous attempts, and share any recording via a public link viewable by anyone.

**Scoring dimensions (7 criteria, 100 pts total):**
- Opening Hook (15) — grabs attention in first 5–10 seconds
- Identity Clarity (15) — clear who-you-are statement
- Value Proposition (20) — what skills/expertise you bring
- Unique Differentiator (20) — what sets you apart
- Role Fit (15) — tailored to target role + company
- Call to Action (10) — clear next step
- Delivery (5) — timing (≤60s), fluency, minimal fillers

**Frontend:**
- `/elevator-pitch` — hub page: generate form (target role, company, resume, key strengths), saved pitches list, scoring criteria card
- `/elevator-pitch/[pitchId]` — pitch detail: editable script with word count + duration estimate; 60s video recorder (MediaRecorder API + Web Speech API transcription, live countdown); analyze button POSTs to backend; FeedbackPanel with score ring + dimension bars; RecordingRow list (replay video, show transcript + feedback, copy share link)
- `/share/pitch/[token]` — **public page, no auth required** — shows video player, score ring, dimension bars, strengths/improvements

**Backend:**
- `routers/elevator_pitch.py` — 9 routes: generate (stateless), CRUD for pitches, record upload + AI analysis, list recordings, public share endpoint
- `services/elevator_pitch_service.py` — `generate_pitch_text()` + `analyze_pitch_recording()` using Claude Sonnet 4
- `models/elevator_pitch.py` — Pydantic request/response schemas

**Database (migration 003):**
- `elevator_pitches` table — user_id, pitch_text, target_role, company_name, resume_text
- `pitch_recordings` table — pitch_id, user_id, video_url, duration_seconds, transcript, score, feedback JSONB, share_token (unique UUID-derived hex token)
- RLS: users own their pitches/recordings; share endpoint served via service_role key

**Video storage:** Backend uploads recordings to Supabase Storage bucket `pitch-recordings` (must be created as public). Requires no extra frontend changes.

**Tests:** 12 backend service tests, 25 backend router tests, 22 frontend utility tests (`pitch-utils.ts`).

---

## [Unreleased] — 2026-03-28

### Changed — "Apex" UI Redesign (full frontend)
Complete visual redesign of the InterviewAce frontend on the `new_ui` branch.

**Design system:**
- Monochromatic emerald palette: primary `#10b981` (dark) / `#059669` (light) with full light-mode support via `prefers-color-scheme`
- Typography: Syne (headings) + Plus Jakarta Sans (body), replacing Playfair Display + DM Sans
- New CSS utility classes: `.btn-primary`, `.btn-ghost`, `.input-base`, `.gradient-border`, `.tag-primary`, `.tag-accent`, `.accent-badge`, `.orb`, step indicators
- New animations: `slide-in-left`, `pulse-ring`, `border-flow`, `spin-slow`

**Page changes:**
- **Landing** — feature cards grid, animated gradient headline, accent badge, floating orbs
- **Dashboard** — time-based greeting, stats row (sessions/preparing/active), "continue where you left off" card
- **Session creation** — 4-step wizard (Basics → Job Details → Round Info → Resume) with step indicator
- **Navbar** — mobile hamburger menu with dropdown, glass-morphism background
- **Auth pages** — updated to new design tokens and typography
- **Session detail / prepare / mock list** — gradient-border cards, accent-glow highlights
- **Quiz** — gradient progress bar (primary→accent), amber focus areas instead of red
- **Mock interview feedback** — coaching reframe: "Risk Score" → "Focus Score" (inverted), "Integrity Analysis" → "Interview Presence", "Suspicious Events" → "Focus Tips"; new `SkillsRadar` component using recharts `RadarChart` for 5-dimension skills visualization
- **Contact** — updated form styling

**New dependency:** `recharts` (for SkillsRadar radar chart)

---

## [Unreleased] — 2026-03-26

### Fixed — Graceful shutdown & in-flight operation tracking (#11)
- Added FastAPI `lifespan` context manager to `backend/app/main.py`
- On startup: marks any stale `in_progress` mock interviews and quiz sessions as `abandoned` (covers container restarts mid-request)
- Added `status` column (`in_progress` / `completed` / `abandoned`) to `mock_interviews` and `quiz_sessions` tables via `002_add_status_columns.sql`
- Routers now set `status: "in_progress"` on creation and `status: "completed"` when feedback is generated

### Fixed — CORS supports multiple origins + Vercel previews (#12)
- `FRONTEND_URL` remains the primary origin; new `ALLOWED_ORIGINS` env var accepts comma-separated extra origins
- New `CORS_ALLOW_VERCEL_PREVIEWS` env var (set `true` in staging) adds `allow_origin_regex` for `*.vercel.app`
- CORS no longer breaks silently when a single env var is wrong — multiple origins provide resilience

### Added — Interview Integrity Detection System
New module at `frontend/src/lib/detection/` providing real-time cheating-risk analysis during mock interviews.

**Modules:**
- `types.ts` — Signal interfaces (`GazeSignal`, `AudioSignal`, `TimingSignal`, `IntegrityStats`, `RiskSnapshot`)
- `gaze-analyzer.ts` — MediaPipe FaceLandmarker gaze tracking; computes Shannon entropy, saccade rate, avg gaze offset, and reading-pattern detection (low pitch variance + high yaw variance + direction changes)
- `audio-analyzer.ts` — Web Audio API analysis; detects keyboard typing (broadband 200–800 Hz bursts) and second speaker (two distinct pitch peaks > 50 Hz apart)
- `timing-analyzer.ts` — Response onset delay and fluency scoring
- `risk-engine.ts` — Weighted risk score (0–100) combining all signals; tracks tab switches via `visibilitychange`; emits `RiskSnapshot` timeline and `IntegrityStats`
- `index.ts` — Barrel export

**Risk weight breakdown:**
| Signal | Weight |
|---|---|
| Gaze entropy | 20% |
| Reading pattern | 20% |
| Onset delay | 15% |
| Fluency score | 10% |
| Tab switches | 10% |
| Typing detected | 10% |
| Second speaker | 8% |
| Screen share | 7% |

### Changed — EyeTracker component refactored
`frontend/src/components/video/EyeTracker.tsx` restructured to use the new detection modules instead of inline logic:
- Now composes `GazeAnalyzer`, `AudioAnalyzer`, and `RiskEngine`
- Exposes `EyeTrackerRef` handle (`getStats`, `getRiskScore`, `getMediaStream`)
- Graceful fallback: if MediaPipe FaceMesh fails to load (no GPU / WASM blocked), falls back to brightness-based frame analysis at 2 fps

### Changed — Mock interview page updated
`frontend/src/app/sessions/[id]/mock/[mockId]/page.tsx` updated to wire the refactored `EyeTracker` and integrity stats into the post-interview feedback payload.

---

## 2025-XX-XX — Working MVP (`30edd83`)

Initial working release:
- Session creation with resume upload, job description, and target company
- AI prep sources generation (company insights, technical topics, process breakdown, resource links)
- Adaptive quizzes: text, voice, and MCQ modes with per-question AI feedback
- Mock interviews: conversational Claude-powered interviewer, configurable difficulty/duration/topics
- Google Meet-style interview UI with real-time transcript
- Basic webcam monitoring during interviews
- Supabase auth (login, signup, email confirmation)
- Dashboard listing user sessions

---

## 2025-XX-XX — Contact page (`e9af27d`)

Added `/contact` page with layout.

---

## 2025-XX-XX — SEO (`deb5ed0` / `4e232f5`)

Added `robots.ts` and `sitemap.ts` to frontend App Router for search engine indexing.

---

## 2025-XX-XX — Email confirmation UX (`8e0c0c4`)

Added confirmation message shown to users after sign-up, prompting them to verify their email before logging in.
