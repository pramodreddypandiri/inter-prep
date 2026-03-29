# Changelog

All notable changes to InterviewAce are recorded here.

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
