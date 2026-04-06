# InterviewAce — UI/UX Design Review Brief

**Product:** InterviewAce — AI-powered interview preparation platform
**Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
**Design System Name:** "Apex"
**Prepared for:** External UI/UX Reviewer
**Prepared by:** Maintainer
**Date:** 2026-04-06

---

## 1. Product Overview

InterviewAce helps job seekers prepare for interviews using AI. Core features:

| Feature | Description |
|---|---|
| **Sessions** | Create an interview prep session scoped to a role, company, and job description |
| **Prep Sources** | AI generates a 5-section study guide: company snapshot, interview process, technical topics, checklist, resources |
| **Quiz** | AI-generated questions in text, voice, or MCQ modes with per-question feedback |
| **Mock Interview** | Conversational AI interviewer with webcam, real-time transcription, integrity detection, and performance report |
| **Elevator Pitch** | AI-generates a 45–60s pitch; user records it, gets scored across 7 dimensions, can share via public link |
| **Contact** | In-app feedback/bug form with screenshot upload |
| **Admin Newsletter** | Internal-only email blast to all users (maintainer-only) |

**Target users:** Entry-level to mid-career job seekers preparing for technical and behavioral interviews.

---

## 2. Design System ("Apex")

### 2.1 Color Palette

The system is **dark-first with full light mode** via `prefers-color-scheme`.

**Dark mode (primary):**

| Token | Value | Usage |
|---|---|---|
| `--background` | `#090f0c` | Page background |
| `--foreground` | `#e8f0ec` | Body text |
| `--primary` | `#10b981` | CTA buttons, active states, links |
| `--primary-hover` | `#34d399` | Hover on primary |
| `--primary-glow` | `rgba(16,185,129,0.10)` | Button glow, highlight backgrounds |
| `--card` | `#0f1a15` | Card/panel backgrounds |
| `--card-border` | `#1a3028` | Card borders |
| `--card-hover` | `#152620` | Card hover fill |
| `--muted` | `#7a9b8c` | Labels, subtitles, helper text |
| `--danger` | `#fb3b5e` | Errors, destructive actions |
| `--success` | `#34d399` | Positive feedback, scores 80+ |
| `--surface` | `#0c1510` | Input backgrounds, nested surfaces |

**Light mode:**

| Token | Value |
|---|---|
| `--background` | `#f8faf9` |
| `--foreground` | `#111816` |
| `--primary` | `#059669` |
| `--card` | `#ffffff` |
| `--card-border` | `#d1e7dd` |
| `--muted` | `#5f7a6e` |
| `--danger` | `#e11d48` |
| `--success` | `#059669` |

**Accent colors used in-product (not in token system):**
- `#09090f` — mock interview background (near-black blue-grey)
- `#141420` — video tile backgrounds
- Amber `#f59e0b` / `#fbbf24` — score range 40–59, focus coaching
- Rose `#fb7185` / red `#e11d48` — score range 0–39, end-call button
- Navy `#1d2244` / `#10142d` — blazer in AI avatar

### 2.2 Typography

| Role | Font | Weight | Tracking |
|---|---|---|---|
| Display headings (h1–h4) | **Syne** | 700–800 | `-0.03em` |
| Body, labels, UI text | **Plus Jakarta Sans** | 400–600 | normal |
| Monospace (timers, scores) | system monospace | 700 | tabular-nums |

### 2.3 Utility Classes

| Class | Effect |
|---|---|
| `.btn-primary` | Emerald filled button, shadow, hover lift |
| `.btn-ghost` / `.btn-secondary` | Outline/ghost button |
| `.btn-shine` | Animated shine sweep on hover |
| `.input-base` | Standardised input (border, focus ring, bg) |
| `.gradient-border` | Border glows on hover via pseudo-element |
| `.glass` | Frosted glass: `backdrop-blur`, semi-opaque card |
| `.gradient-mesh` | Animated radial gradient hero background |
| `.card-hover` | Lifts card by 3px on hover with glow shadow |
| `.orb` / `.orb-primary` | Blurred decorative background circles |
| `.tag-primary` / `.tag-accent` | Pill tags with background tint |
| `.accent-badge` | Small glowing status badge |
| `.step-active` / `.step-complete` / `.step-inactive` | Step indicator states |
| `.fade-in-up.delay-1…6` | Staggered entrance animations |

### 2.4 Animations

| Name | Duration | Purpose |
|---|---|---|
| `fade-in` | 0.45s | Opacity + slide-up 10px |
| `fade-in-up` | 0.5s | Opacity + slide-up 20px |
| `fade-in-scale` | 0.35s | Scale 0.97 → 1 |
| `slide-in-right` | 0.35s | Chat sidebar open |
| `gradient-shift` | 20s loop | Hero background shimmer |
| `pulse-ring` | loop | Ripple ring on avatar |
| `glow-pulse` | loop | Box-shadow breathing |
| `float` | loop | Decorative orb hover |
| Stagger delays | 0.08s–0.48s | `.delay-1` through `.delay-6` |

---

## 3. Page Inventory

### Public / Auth

| Route | Page | Status |
|---|---|---|
| `/` | Landing page | Live |
| `/auth/login` | Login | Live |
| `/auth/signup` | Signup + email confirm | Live |
| `/auth/callback` | Supabase OAuth callback | Live |
| `/contact` | Contact / feedback form | Live |
| `/share/pitch/[token]` | Public elevator pitch share | Live — **no auth** |

### Authenticated App

| Route | Page | Notes |
|---|---|---|
| `/dashboard` | Sessions dashboard | Time-based greeting, stats, session cards |
| `/sessions/new` | New session wizard | 4-step: Basics → Job Details → Round Info → Resume |
| `/sessions/[id]` | Session detail | Round overview, nav to prepare/mock |
| `/sessions/[id]/prepare` | Prep sources | Tab: Materials vs Quiz; sidebar for sections |
| `/sessions/[id]/quiz/[quizId]` | Quiz | Text / voice / MCQ; per-question AI feedback |
| `/sessions/[id]/mock` | Mock config | Difficulty, duration, topics |
| `/sessions/[id]/mock/[mockId]` | Live mock interview | Google Meet-style; eye tracker; focus score; AI avatar |
| `/elevator-pitch` | Pitch hub | Generate form, saved pitches list, criteria card |
| `/elevator-pitch/[pitchId]` | Pitch detail | Editor + recorder + history + feedback |

### Internal

| Route | Page | Notes |
|---|---|---|
| `/admin/newsletter` | Newsletter sender | Protected by `ADMIN_SECRET` header, not linked in UI |

---

## 4. Key UI Flows

### Flow 1 — New Session → Prep
1. Dashboard → "New Session" → 4-step wizard (role, company, JD, resume upload)
2. Session detail → "Prepare" tab → AI generates 5 sections
3. User navigates sidebar sections, then starts quiz

### Flow 2 — Mock Interview
1. Session → "Mock Interview" → Config (difficulty, duration, focus areas)
2. Live interview: AI avatar speaks, user responds via voice or text
3. Eye/gaze tracking runs in webcam tile (framed as "Focus Score", not surveillance)
4. User ends interview → Full feedback report (radar chart, presence score, Q&A breakdown)

### Flow 3 — Elevator Pitch
1. `/elevator-pitch` → Fill form (role, company, resume text, key strengths) → AI generates pitch
2. Edit pitch in editor → toggle "Hide script" switch to practice from memory
3. Click "Start 60s Recording" → records video + speech transcription simultaneously
4. "Analyze & Score" → AI scores across 7 dimensions, shows feedback panel
5. Share button copies a public URL (no auth required to view)

---

## 5. Components

| Component | Location | Description |
|---|---|---|
| `Navbar` | `components/Navbar.tsx` | Sticky top nav, glass morphism, mobile hamburger |
| `InterviewerAvatar` | `components/mock/InterviewerAvatar.tsx` | SVG woman avatar; blinks, breathes, mouth opens when speaking |
| `MockConfig` | `components/mock/MockConfig.tsx` | Mock interview setup form |
| `QuizConfig` | `components/quiz/QuizConfig.tsx` | Quiz mode/difficulty selector |
| `EyeTracker` | `components/video/EyeTracker.tsx` | Webcam + MediaPipe FaceLandmarker; emits gaze/audio signals |
| `WebcamMonitor` | `components/video/WebcamMonitor.tsx` | Basic webcam feed display |
| `VoiceRecorder` | `components/voice/VoiceRecorder.tsx` | Web Speech API recording wrapper |

Inline sub-components (not extracted to separate files):
- `ScoreRing` — SVG arc ring used in elevator pitch feedback
- `DimensionBar` — horizontal progress bar for each scoring dimension
- `FeedbackPanel` — expandable strengths/improvements/suggestions
- `RecordingRow` — collapsible recording history item
- `FocusIndicator` — floating HUD badge during mock interview
- `PresenceReport` — post-interview engagement breakdown
- `SkillsRadar` — recharts RadarChart for 5 skill dimensions

---

## 6. Scoring Systems

### 6.1 Elevator Pitch Score (100 pts)

| Dimension | Max pts |
|---|---|
| Opening Hook | 15 |
| Identity Clarity | 15 |
| Value Proposition | 20 |
| Unique Differentiator | 20 |
| Role Fit | 15 |
| Call to Action | 10 |
| Delivery (timing, fluency) | 5 |

Score color: ≥80 → success green, ≥60 → accent, ≥40 → amber, <40 → danger.

### 6.2 Mock Interview Focus Score (0–100)

Displayed as `100 - riskScore` (higher = better focus). Combines:
- Gaze entropy (20%), reading pattern (20%), onset delay (15%), fluency (10%), tab switches (10%), typing (10%), second speaker (8%), screen share (7%).

---

## 7. Known Design Decisions / Context

- **Coaching framing:** Integrity/surveillance language is fully replaced with coaching language throughout — "Focus Score" (not Risk), "Interview Presence" (not Integrity), "Focus Tips" (not Suspicious Events).
- **Dark interview room:** The live mock interview uses a near-black `#09090f` background intentionally (Google Meet aesthetic). This differs from the rest of the app which uses `var(--background)`.
- **Script hide toggle:** The elevator pitch script panel has a pill toggle switch to hide the text so users practice from memory.
- **Non-fatal AI:** If Claude fails to score a pitch recording, the recording is still saved (score shown as `—`).
- **Public share pages:** `/share/pitch/[token]` has no Navbar, no auth, and is fully standalone. It is exempt from the auth middleware.
- **Video upload cap:** 50 MB, duration cap 300 s. Recordings stored in Supabase Storage bucket `pitch-recordings` (public).
- **Admin newsletter:** Entirely separate from the app UX; only accessible at `/admin/newsletter` with knowledge of the admin key.
- **AI Avatar name:** "Alex" — uses Web Speech API with a preference for female voices (Samantha, Victoria, Karen, Zira).

---

## 8. Potential Areas for Design Review Focus

These are suggested focus areas — the reviewer should also surface any issues not listed here.

1. **Consistency across surfaces** — The mock interview page (`#09090f` dark room) has a different design language from the rest of the app (`var(--background)` light/dark). Is the context-switch jarring?
2. **Light mode parity** — The product was primarily designed in dark mode. Light mode uses the same token system but needs verification that all components look equally polished.
3. **Typography scale** — Several pages mix `text-xs`, `text-sm`, `text-base` without a consistent scale. Does the hierarchy hold up?
4. **Mobile experience** — The elevator pitch detail page, mock interview page, and quiz page are complex multi-column layouts. How do they behave on small screens?
5. **Empty states** — Dashboard, pitch list, recordings history. Are they informative and encouraging?
6. **Error states** — Form validation, failed AI calls, network errors. Are they visible and helpful?
7. **Onboarding / first-run experience** — There is no guided onboarding. A first-time user lands on the dashboard with no sessions. Is the path forward clear?
8. **Elevator pitch hub page** — The generate form, pitch list, and scoring criteria info card share one scrollable page. Is the information architecture clear?
9. **Recording UX** — The 60-second countdown, live transcript, and camera feed are all on screen simultaneously. Is the layout overwhelming?
10. **Share page** (`/share/pitch/[token]`) — This is the only page a non-user will ever see. Does it represent the product well?
11. **Navbar** — Mobile hamburger, auth state changes, active route highlighting.
12. **Step wizard** (New Session) — 4 steps with back/forward navigation. Is progress clear?
13. **Feedback report** — Post-mock-interview report includes radar chart, presence score, Q&A cards, full transcript. Long page — is there a hierarchy?
14. **AI Avatar** — The SVG woman avatar on the mock interview page. Does she feel premium and realistic enough?
15. **Accessibility** — Color contrast on dark backgrounds, focus states, keyboard navigation, screen reader labels.

---

## 9. Running the App Locally

### Prerequisites
- Node.js 18+, Python 3.9+
- Supabase project with migrations applied (`supabase/migrations/`)
- `.env` files for both frontend and backend

### Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload   # http://localhost:8000
```

### Required env vars (backend `.env`)
```
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
ANTHROPIC_API_KEY=...
FRONTEND_URL=http://localhost:3000
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_LOGIN=...
SMTP_PASSWORD=...
FROM_EMAIL=...
CONTACT_EMAIL=...
ADMIN_SECRET=...
```

### Required env vars (frontend `.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 10. Repository Structure (Relevant to Design Review)

```
frontend/src/
├── app/                   # All pages (Next.js App Router)
├── components/
│   ├── Navbar.tsx
│   ├── mock/
│   │   ├── InterviewerAvatar.tsx   ← SVG animated avatar
│   │   └── MockConfig.tsx
│   ├── quiz/QuizConfig.tsx
│   ├── voice/VoiceRecorder.tsx
│   └── video/
│       ├── EyeTracker.tsx
│       └── WebcamMonitor.tsx
├── lib/
│   ├── api.ts
│   └── elevator-pitch/pitch-utils.ts
└── app/globals.css        ← Full design system
```

---

*Any questions about design intent, feature context, or technical constraints — contact the maintainer.*
