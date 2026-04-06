# InterviewAce — UI/UX Design Review Report

**Reviewer Role:** Senior UI/UX Designer
**Date:** 2026-04-06
**Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
**Design System:** "Apex"
**Scope:** Full product — 16 pages, 7 components, 1 design system

---

## Executive Summary

InterviewAce is a well-crafted product with a strong visual identity. The "Apex" design system is coherent, the emerald monochromatic palette is distinctive, and the Syne + Plus Jakarta Sans pairing is premium. The dark-first approach is executed well. However, the product has **12 significant design problems** that create inconsistency, accessibility gaps, and friction across core user flows. This report documents every problem with root cause and a concrete fix for each.

**Overall Rating:** 7.5 / 10
**Critical issues:** 3
**High severity:** 5
**Medium severity:** 4

---

## Problem Index

| # | Problem | Severity | Page(s) Affected |
|---|---|---|---|
| 1 | Public share page abandons the design system entirely | Critical | `/share/pitch/[token]` |
| 2 | `btn-secondary` is used but never defined | Critical | Dashboard, Pitch Hub, Pitch Detail |
| 3 | No `prefers-reduced-motion` support | Critical | Global |
| 4 | Inconsistent input styling across the product | High | Pitch Hub, Pitch Detail, Contact |
| 5 | Icon-only buttons missing accessible labels | High | Navbar, Dashboard, Pitch Detail |
| 6 | Typography scale is inconsistent | High | Quiz, Prepare, Mock, Pitch Detail |
| 7 | No onboarding / empty-first-run path | High | Dashboard |
| 8 | Live mock interview layout is overwhelming | High | `/sessions/[id]/mock/[mockId]` |
| 9 | Hardcoded colors bypass the token system | Medium | Avatar, Share page, Pitch Detail |
| 10 | Loading and skeleton states are incomplete | Medium | Prepare, Pitch Hub, Mock list |
| 11 | Mobile layout breaks on complex pages | Medium | Pitch Detail, Quiz, Prepare |
| 12 | Light mode parity gaps | Medium | Global |

---

## Problem 1 — Public Share Page Abandons the Design System

**Severity: Critical**

### What is happening

The `/share/pitch/[token]` page — the only page a non-user will ever see — is built with a completely separate visual language:

```
bg-gray-50 / bg-white / border-gray-200 / text-gray-900
text-gray-400 / text-gray-700 / text-gray-500
bg-emerald-600 / bg-emerald-50 / border-emerald-200
```

Not a single CSS variable is used. There is no dark mode support. The color values are hardcoded strings. The `ScoreRing` component on this page also uses hardcoded `rgb()` values for score colors rather than the score-color mapping used on the detail page.

### Why it matters

This is the product's public face and the primary growth surface — anyone a user shares their pitch with lands here. It looks like a different, cheaper product. It also means any design system change requires a double fix: once for the app, once manually for this page.

### Fix

Replace all hardcoded color references with CSS variables. Use `var(--background)`, `var(--card)`, `var(--card-border)`, `var(--foreground)`, `var(--muted)`, and `var(--primary)` throughout.

```tsx
// Before
<div className="min-h-screen bg-gray-50">
  <header className="bg-white border-b border-gray-200">

// After
<div className="min-h-screen bg-[var(--background)]">
  <header className="bg-[var(--card)] border-b border-[var(--card-border)]">
```

The `scoreColor()` function should use the same mapping as the pitch detail page (danger/amber/primary/success tokens), not raw `rgb()` strings.

The header logo should reuse the same markup pattern as the Navbar logo rather than a one-off inline implementation.

---

## Problem 2 — `btn-secondary` Is Used But Never Defined

**Severity: Critical**

### What is happening

`btn-secondary` is applied in three places:

- `dashboard/page.tsx` — "Elevator Pitch" button in the header
- `elevator-pitch/page.tsx` — "Cancel" and "Back" buttons in the create form
- `elevator-pitch/[pitchId]/page.tsx` — "Save", "Re-record" buttons in the editor

`globals.css` defines `btn-primary`, `btn-ghost`, and `btn-shine`, but has no `.btn-secondary` rule. The buttons render with no background, no border, and default browser text color — they look broken in both light and dark mode.

### Why it matters

Three prominent buttons across two high-traffic pages are visually broken. The "Save" button on the pitch editor is a primary action; when it renders with no styling, users may not recognize it as interactive.

### Fix

Add `btn-secondary` to `globals.css`. Based on the design system intent, it should be a bordered/outlined button that is visually lighter than `btn-primary` but heavier than `btn-ghost`:

```css
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 1.125rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 0.75rem;
  border: 1px solid var(--card-border);
  background: var(--surface);
  color: var(--foreground);
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
  cursor: pointer;
}

.btn-secondary:hover {
  border-color: var(--primary);
  background: var(--primary-glow);
  color: var(--primary);
  transform: translateY(-1px);
}

.btn-secondary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}
```

---

## Problem 3 — No `prefers-reduced-motion` Support

**Severity: Critical**

### What is happening

The design system defines 15+ keyframe animations including continuous loops (`gradient-shift` at 20 s, `glow-pulse`, `float`, `pulse-ring`). These run on every page regardless of the user's operating system accessibility preference. There is no `@media (prefers-reduced-motion: reduce)` block anywhere in `globals.css`.

### Why it matters

This is a WCAG 2.1 AA failure (criterion 2.3.3 for AAA, but broadly expected). Users with vestibular disorders, epilepsy, or motion sensitivity are affected. Some users configure reduced motion specifically to avoid these effects; ignoring that preference is considered an accessibility defect.

### Fix

Add a single block at the end of `globals.css` that disables or reduces non-essential motion:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .gradient-mesh {
    animation: none;
  }

  .orb,
  .orb-primary {
    animation: none;
  }

  .btn-shine::after {
    display: none;
  }

  .pulse-ring {
    animation: none;
  }
}
```

For the `InterviewerAvatar` speaking animation, gate the `pulse-ring` orbs behind a `window.matchMedia('(prefers-reduced-motion: reduce)')` check in the component.

---

## Problem 4 — Inconsistent Input Styling

**Severity: High**

### What is happening

The design system provides `.input-base` for all text inputs and textareas. It is correctly used on: Login, Signup, New Session wizard, Quiz config, Contact form. It is **not** used on:

- `elevator-pitch/page.tsx` — all form inputs use ad-hoc inline Tailwind: `px-3 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--background)] focus:outline-none focus:border-primary transition-colors`
- `elevator-pitch/[pitchId]/page.tsx` — the pitch editor textarea and the recording preview transcript both have custom inline class strings
- The inline variants are missing the focus-ring glow shadow that `.input-base` provides, making them feel less interactive on click

### Why it matters

Visual inconsistency across the product's main editing surface. When users switch between the session wizard and the pitch editor, inputs feel and behave differently. The glow shadow on focus is part of the brand feel; its absence is noticeable.

### Fix

Replace all inline input styling in `elevator-pitch/` pages with `.input-base`:

```tsx
// Before (elevator-pitch/page.tsx)
<input
  className="w-full px-3 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:border-primary transition-colors"

// After
<input
  className="input-base w-full"
```

Where the pitch editor textarea needs a different height, use:

```tsx
<textarea className="input-base w-full resize-y" rows={5} />
```

---

## Problem 5 — Icon-Only Buttons Missing Accessible Labels

**Severity: High**

### What is happening

Several icon-only buttons have no text or `aria-label`:

| Component | Button | Issue |
|---|---|---|
| `Navbar.tsx` | LogOut button (icon only) | No `aria-label` |
| `dashboard/page.tsx` | Delete session (Trash2 icon) | No `aria-label` (text "Delete" is tooltip-only) |
| `elevator-pitch/[pitchId]/page.tsx` | Delete recording (Trash2) | No `aria-label` |
| `elevator-pitch/page.tsx` | Delete pitch (Trash2) | No `aria-label` |
| `sessions/[id]/prepare/page.tsx` | Regenerate section (RefreshCw) | Text is visible but icon has no `aria-hidden` |

### Why it matters

Screen readers announce icon-only buttons as "button" with no context. A user navigating by keyboard or assistive technology cannot determine what the button does. This is a WCAG 2.1 AA failure (criterion 4.1.2).

### Fix

Add `aria-label` to all icon-only interactive elements. For decorative icons inside labeled buttons, add `aria-hidden="true"`:

```tsx
// Navbar logout
<button aria-label="Sign out" onClick={handleSignOut}>
  <LogOut size={16} />
</button>

// Delete session
<button aria-label={`Delete session ${session.name}`} onClick={() => handleDelete(session.id)}>
  <Trash2 size={14} />
</button>

// Icons inside labeled buttons
<button className="btn-primary">
  <Plus size={15} aria-hidden="true" />
  New Session
</button>
```

---

## Problem 6 — Typography Scale Is Inconsistent

**Severity: High**

### What is happening

The product uses a mix of font sizes that do not follow a consistent scale across pages. Observed irregularities:

**Heading hierarchy collapses in some pages:**
- Dashboard: Stats value uses `text-2xl` (Syne) — correct
- Quiz feedback: Per-question heading uses `text-sm font-semibold` — should be `text-base` or higher at minimum
- Prepare page: Section title uses `text-lg` (Syne) but subsection content labels are `text-xs uppercase` — the gap is too large, creating a hierarchy that skips levels

**Micro-copy is inconsistently sized:**
- Helper text oscillates between `text-xs`, `text-[10px]`, and `text-[11px]` (literal pixel values in Tailwind)
- `text-[10px]` on `sessions/new/page.tsx` step helpers is too small — 10px is below WCAG minimum for body text

**Label style is fragmented:**
- Some labels: `text-xs uppercase tracking-wide muted font-semibold` (New Session wizard)
- Some labels: `text-sm font-medium` (Contact form)
- Some labels: inline `text-xs font-bold` (Quiz cards)

### Why it matters

Inconsistent type scale undermines readability and makes the product feel unpolished on close inspection. The 10px helper text will fail contrast requirements on certain screen densities.

### Fix

Establish and document a type scale in `globals.css` as utility classes:

```css
/* Type scale utilities */
.label-sm   { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.label-base { font-size: 0.75rem;   font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
.helper     { font-size: 0.75rem;   color: var(--muted); line-height: 1.5; }
```

Replace all instances of `text-[10px]` and `text-[11px]` — these are below the 12px minimum for legible body copy. Replace with `text-xs` (12px) minimum.

---

## Problem 7 — No Onboarding / First-Run Path

**Severity: High**

### What is happening

When a user signs up and arrives on the dashboard for the first time, they see:

1. A greeting with "You have 0 sessions"
2. An empty state card (dashed border) with a "New Session" button

There is no guide, no tooltip sequence, no feature highlight, and no hint about what InterviewAce can do beyond the session flow. Features like the Elevator Pitch (`/elevator-pitch`) and Mock Interview are never surfaced to a first-time user. The dashboard header has an "Elevator Pitch" button, but its context — what it is, why they'd want it — is never established.

### Why it matters

The product has 5 distinct features (Prep, Quiz, Mock, Elevator Pitch, Contact). A first-time user who creates one session and explores "Prepare" may never discover Mock Interview or Elevator Pitch, leading to underutilization and early churn. The empty state communicates nothing about the product's range.

### Fix — Three-Part Solution

**1. Enrich the empty state** to communicate the full product:

The empty state card should show a 3-step visual summary:
```
[ 1. Create a session ] → [ 2. Prep + Practice ] → [ 3. Mock Interview & Score ]
```
With a secondary CTA: "Or try Elevator Pitch →"

**2. Add a welcome banner** for users with 0 sessions (dismissible, stored in localStorage):

```tsx
{sessions.length === 0 && !dismissed && (
  <div className="glass rounded-2xl p-5 border border-primary/20">
    <p className="text-sm font-semibold">👋 Welcome to InterviewAce</p>
    <p className="text-xs text-muted mt-1">
      Start by creating a session for the role you're interviewing for.
      We'll generate prep materials, quizzes, and mock interviews — all tailored to that role.
    </p>
    <button onClick={() => setDismissed(true)} className="text-xs text-muted mt-3">Dismiss</button>
  </div>
)}
```

**3. Add feature discovery cards** below the sessions grid for users with 1–2 sessions, pointing to Elevator Pitch and Mock Interview.

---

## Problem 8 — Live Mock Interview Layout Is Overwhelming

**Severity: High**

### What is happening

The live mock interview page (`/sessions/[id]/mock/[mockId]`) presents all of the following simultaneously:

- AI Avatar (speaking, animated, with breathing + blink + pulse rings)
- Webcam feed tile
- Live transcript panel
- Focus Score HUD badge (floating, with hover tooltip)
- Question/turn status indicator
- Chat sidebar (can be open simultaneously)
- Interview timer

On a standard 1280px viewport, this works. On a 768px viewport or a 13" laptop, these elements compete for attention with no clear visual hierarchy. The Focus Score badge floats over content with a fixed position that can obscure transcript text. The avatar and webcam tile have no defined size relationship — they can crowd each other.

### Why it matters

The mock interview is the product's most complex and highest-stakes feature. Cognitive overload at this exact moment — when a user is also trying to think about interview answers — directly degrades the product's core value. The design should minimize distraction and surface only what's needed.

### Fix — Hierarchical Layout

**During interview (candidate's turn):**
- Primary zone: Transcript (largest, user's active working area)
- Secondary zone: Avatar (present but visually receded, smaller)
- Tertiary: Webcam (picture-in-picture corner, small)
- Ambient: Focus Score (top-right corner, never overlapping content)

**During interviewer speaking:**
- Flip primary: Avatar becomes dominant
- Transcript becomes secondary (shows previous Q)

Concretely:
```tsx
// Two-column grid: 1/3 avatar side, 2/3 transcript side
<div className="grid lg:grid-cols-[1fr_2fr] gap-4 h-full">
  <div className="flex flex-col gap-4">
    <InterviewerAvatar />
    <WebcamMonitor className="aspect-video rounded-xl" />
  </div>
  <div className="flex flex-col gap-4">
    <TranscriptPanel />
    <ControlBar />
  </div>
</div>
```

Move the Focus Score badge to a non-overlapping position (top bar, not floating over content).

---

## Problem 9 — Hardcoded Colors Bypass the Token System

**Severity: Medium**

### What is happening

Several components use hardcoded hex/rgb values instead of CSS tokens:

**`InterviewerAvatar.tsx` — SVG element colors:**
```
Skin: #FCDCBD → #EFB88A → #D4906A
Hair: #3D2010 → #0E0604
Blazer: #1d2244 → #10142d
Mouth: #B84E70 / #C4607A
```
These are reasonable SVG defaults, but the speaking-state border (`border-primary/20`) inconsistently mixes token and hardcode.

**`sessions/[id]/mock/[mockId]/page.tsx` — Focus score colors:**
```tsx
focusScore >= 75 ? 'text-emerald-400'  // should be text-[var(--success)]
focusScore >= 50 ? 'text-amber-400'    // no token for amber
focusScore >= 25 ? 'text-orange-400'   // no token
               : 'text-rose-400'       // should be text-[var(--danger)]
```

**`share/pitch/[token]/page.tsx` — ScoreRing colors:**
```tsx
score >= 80 ? 'rgb(52,211,153)'    // --success value hardcoded
score >= 60 ? 'rgb(99,102,241)'    // accent, no token equivalent
score >= 40 ? 'rgb(251,191,36)'    // amber, no token
           : 'rgb(239,68,68)'      // --danger value hardcoded
```

### Why it matters

If the palette ever changes, these values will drift out of sync silently. The amber/orange tones used for warning states appear in four separate places as different values with no single source of truth.

### Fix

Add missing semantic tokens to `globals.css` for warning states:

```css
/* In :root and .dark */
--warning: #f59e0b;       /* amber for score 40-59 */
--warning-light: #fbbf24; /* lighter amber for score 60-79 threshold */
```

Replace all hardcoded amber/orange instances with `var(--warning)`. For the `InterviewerAvatar`, the SVG body colors are intentional art and can stay hardcoded, but the interactive speaking ring should consistently use `var(--primary)`.

---

## Problem 10 — Loading and Skeleton States Are Incomplete

**Severity: Medium**

### What is happening

Loading states across the product are inconsistent:

| Page | Loading State | Quality |
|---|---|---|
| Dashboard | Spinner centered, `py-20` | Acceptable |
| Prepare page | Spinner + "Generating..." text | Good |
| Quiz page | Spinner + "Evaluating..." | Good |
| **Pitch Hub** | No loading state while fetching pitch list | **Missing** |
| **Mock list** | No loading state while fetching past interviews | **Missing** |
| **Session detail** | Spinner but no error state beyond `text-danger` text | Weak |
| **Prepare sections** | No skeleton for individual section content | Missing |

The pitch hub and mock list pages render nothing (empty state) while data is loading — a user who loads slowly will briefly see "No pitches yet" before the list appears.

### Why it matters

Brief flashes of empty states while data loads are disorienting. They can feel like bugs. On slow connections (mobile, low-bandwidth), this is pronounced.

### Fix

Add a `loading` state check before showing the empty state, and add simple skeleton cards during load:

```tsx
// Pitch hub list
{loading ? (
  <div className="space-y-3">
    {[1,2,3].map(i => (
      <div key={i} className="h-20 rounded-2xl bg-card border border-card-border animate-pulse" />
    ))}
  </div>
) : pitches.length === 0 ? (
  <EmptyState />
) : (
  <PitchList pitches={pitches} />
)}
```

Add a `shimmer` animation class to `globals.css` if not already present (the keyframe exists but no utility class wraps it).

---

## Problem 11 — Mobile Layout Breaks on Complex Pages

**Severity: Medium**

### What is happening

Three pages have mobile-specific layout failures:

**Pitch Detail page (`/elevator-pitch/[pitchId]`):**
- Uses `grid lg:grid-cols-2` — correct for desktop
- On mobile (< 1024px), this stacks to single column
- The editor (left) and recorder (right) each have `min-h` values that push the recorder below the fold on a 375px screen
- A user must scroll past the entire editor (pitch text) to reach the recording controls
- This is the opposite of the intended UX — on mobile, the recording controls should appear first

**Prepare page (`/sessions/[id]/prepare`):**
- Section sub-tabs are `overflow-x-auto` — correct
- But there is no scroll indicator (fade gradient or scrollbar) to communicate that more tabs exist
- On 375px, only 2.5 tabs are visible; a user may not realize "Resources" and "Prep Checklist" exist

**Quiz page — question dot navigation:**
- Question dots are `flex justify-center gap-2 flex-wrap`
- For a 20-question quiz, this wraps into 3+ rows on mobile, taking up ~120px and pushing the question card down

### Fix

**Pitch Detail mobile fix:** Add `order` utilities to flip column order on mobile:

```tsx
// Recorder comes first on mobile
<div className="grid lg:grid-cols-2 gap-6">
  <div className="order-2 lg:order-1">
    {/* Script Editor */}
  </div>
  <div className="order-1 lg:order-2">
    {/* Recorder — appears first on mobile */}
  </div>
</div>
```

**Prepare tabs scroll indicator:** Add a fade-right gradient on the tab container:

```tsx
<div className="relative">
  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
    {sections.map(...)}
  </div>
  <div className="absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-[var(--background)] to-transparent pointer-events-none" />
</div>
```

**Quiz dot navigation:** Cap visible dots at 10 with a "X / Y" counter instead of wrapping:

```tsx
{questions.length > 10 ? (
  <p className="text-xs text-muted text-center">
    Question <span className="font-bold text-foreground">{currentIndex + 1}</span> / {questions.length}
  </p>
) : (
  <div className="flex justify-center gap-2">
    {questions.map(...)}
  </div>
)}
```

---

## Problem 12 — Light Mode Parity Gaps

**Severity: Medium**

### What is happening

The token system handles most light mode transitions correctly. However, several visual elements rely on layering/contrast that works in dark mode but flattens in light:

**Glass effect (`.glass`):**
```css
.glass {
  background: color-mix(in srgb, var(--card) 80%, transparent);
  backdrop-filter: blur(16px);
}
```
In dark mode: `#0f1a15` at 80% over `#090f0c` creates visible depth. In light mode: `#ffffff` at 80% over `#f8faf9` — nearly invisible separation. The Navbar loses its "frosted glass" character.

**Gradient border (`.gradient-border`):**
The hover glow uses `var(--primary-glow)` which is `rgba(5,150,105,0.12)` in light mode — almost invisible on white backgrounds. The effect exists but barely registers.

**Orb decorations:**
In dark mode, orbs at `opacity-0.06` on `#090f0c` are visible. In light mode, the same `opacity-0.06` on `#f8faf9` are invisible — the decorative background becomes entirely flat.

**Session/pitch card hover state:**
`card-hover` class changes background to `var(--card-hover)` which is `#152620` (dark only). There's no light mode equivalent defined for `--card-hover`, so hover is identical to default in light mode.

### Fix

**Glass — increase contrast in light mode:**
```css
@media (prefers-color-scheme: light) {
  .glass {
    background: color-mix(in srgb, var(--card) 85%, transparent);
    border-bottom: 1px solid var(--card-border);
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
}
```

**Add missing light mode token:**
```css
:root {
  --card-hover: #edf5f0; /* light mode hover */
}
```

**Orbs — increase opacity in light mode:**
```css
@media (prefers-color-scheme: light) {
  .orb { opacity: 0.12; }
  .orb-primary { opacity: 0.08; }
}
```

**Gradient border glow — increase in light mode:**
```css
@media (prefers-color-scheme: light) {
  :root {
    --primary-glow: rgba(5, 150, 105, 0.18);
  }
}
```

---

## Additional Observations (Non-Blocking)

### Typography — `divider-ornament` class referenced but not defined

`login/page.tsx` uses `divider-ornament` for the "or" divider between email sign-in and the sign-up link. This class is not in `globals.css`. The divider renders as plain text with no decorative lines. Low priority, but worth adding:

```css
.divider-ornament {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--muted);
}
.divider-ornament::before,
.divider-ornament::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--card-border);
}
```

### Session detail — JD text is `line-clamp-6` with no "expand" control

The job description card clamps to 6 lines. There's no "Read more" toggle. Users who paste long JDs may think content was truncated or lost. Add an expand toggle or increase the clamp limit.

### Elevator pitch editor — "Hide script" toggle has no label visible to screen readers

The toggle switch uses visual color state (green = hidden, gray = visible) with no programmatic `aria-checked` attribute. It should be a `<button role="switch" aria-checked={scriptHidden}>` element.

### Share page — video element has no captions track

The `<video>` on the public share page has no `<track kind="captions">`. For recordings with speech, this is an accessibility gap. At minimum, the transcript section below the video should be labeled as equivalent text content with `aria-label="Transcript"`.

### Feedback report (post-mock) — no visual page hierarchy

The post-interview feedback page (triggered from the mock interview `[mockId]` page) presents: Skills Radar, Presence Report, Q&A cards, and a full transcript in one long scroll. There are no sticky anchors, no table of contents, and no visual separation between sections. Adding a sticky nav with anchor links to each section would significantly improve navigability for a long report.

---

## Accessibility Summary

| Issue | WCAG Criterion | Current State |
|---|---|---|
| Icon-only buttons without labels | 4.1.2 (A) | Fail |
| No `prefers-reduced-motion` | 2.3.3 (AAA), best practice | Fail |
| Script toggle not a `role="switch"` | 4.1.2 (A) | Fail |
| `text-[10px]` body text | 1.4.4 (AA) | Marginal |
| Video without captions on share page | 1.2.2 (A) | Fail |
| Color-only state communication (score rings) | 1.4.1 (A) | Partial (text labels exist) |

All other interactive elements reviewed have proper focus states via `.focus-ring`, semantic HTML structure, and `aria-label` coverage where applicable.

---

## Priority Fix Order

For a sprint-scoped remediation:

**Sprint 1 — Critical (Ship blockers)**
1. Define `btn-secondary` in `globals.css`
2. Add `prefers-reduced-motion` media query block
3. Refactor share page to use design tokens

**Sprint 2 — High Impact**
4. Standardize all inputs on `.input-base`
5. Add `aria-label` to all icon-only buttons
6. Add missing `divider-ornament` and `--card-hover` light-mode token
7. Replace `text-[10px]` instances with `text-xs` minimum

**Sprint 3 — Polish**
8. Improve onboarding / empty-first-run state
9. Add `role="switch" aria-checked` to script hide toggle
10. Fix mobile column order on pitch detail page
11. Add scroll fade indicator on prepare section tabs
12. Improve light mode glass and orb contrast

---

*Reviewed by: Senior UI/UX Designer*
*Report generated: 2026-04-06*
