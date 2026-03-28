# InterviewAce — Claude Code Instructions
## Instructons - MUST DO
 - run '/compact' when context window is 50% full. 
## Docs Policy

**After every major change, update the files in `docs/`.**

What counts as a major change:
- New feature or component (new page, new API route, new detection module, etc.)
- Significant refactor of existing feature
- New dependency or tech stack addition
- Schema or API contract change
- Bug fix that changes observable behavior

Files to update:
- `docs/changelog.md` — add a dated entry summarizing what changed and why
- `docs/architecture.md` — update any section whose description is now stale
- Update `README.md` for any major change
Do not update docs for:
- Minor copy tweaks, style/CSS changes, or typo fixes
- Dependency version bumps with no behavior change
- Comment-only edits

## Project Overview

InterviewAce is a Next.js + FastAPI interview preparation platform.

- **Frontend**: `frontend/` — Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: `backend/` — FastAPI, Python, Pydantic
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Auth**: Supabase Auth

