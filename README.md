# InterviewAce

**AI-Powered Interview Preparation Platform**

Personalized research, adaptive quizzes, and realistic mock interviews — all tailored to your target role.

**Live Demo:** [https://myinterviewprep.vercel.app/](https://myinterviewprep.vercel.app/)

---

## Features

### AI-Powered Prep Sources
Create a session with your resume, job description, and target company — InterviewAce generates comprehensive preparation materials including company insights, technical topics, interview process breakdowns, and curated resource links.

### Adaptive Quizzes
- **Text Mode** — Read questions and type answers
- **Voice Mode** — Speak your answers with real-time transcription
- **MCQ Mode** — Multiple choice questions for quick practice
- AI evaluation with per-question feedback, strong areas, gaps, and topics to revisit

### Mock Interviews
- Conversational AI interviewer powered by Claude
- Configurable difficulty (beginner → staff), duration, and topics
- Real-time transcript with Google Meet-style UI
- Eye tracking to monitor engagement and detect screen reading
- Comprehensive post-interview feedback: answer quality, structure, communication, and question-by-question scoring

### Resume Upload
Upload a PDF resume for automatic text extraction and session creation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python, Pydantic |
| Database | Supabase (PostgreSQL) with Row Level Security |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| Auth | Supabase Auth |
| Deployment | Vercel (frontend), Render/Railway (backend) |

---

## Project Structure

```
inter-prep/
├── frontend/
│   └── src/
│       ├── app/                 # Next.js App Router pages
│       │   ├── auth/            # Login, signup, callback
│       │   ├── dashboard/       # User sessions list
│       │   └── sessions/        # Session detail, prep, quiz, mock
│       ├── components/          # React components
│       │   ├── mock/            # InterviewerAvatar, MockConfig
│       │   ├── quiz/            # QuizConfig
│       │   ├── voice/           # VoiceRecorder
│       │   └── video/           # EyeTracker, WebcamMonitor
│       ├── lib/                 # API client, Supabase utilities
│       └── types/               # TypeScript interfaces
│
├── backend/
│   └── app/
│       ├── main.py              # FastAPI entry point
│       ├── config.py            # Environment configuration
│       ├── database.py          # Supabase client
│       ├── routers/             # API route handlers
│       │   ├── sessions.py
│       │   ├── prep_sources.py
│       │   ├── quiz.py
│       │   ├── mock_interview.py
│       │   └── upload.py
│       └── services/            # Business logic + Claude integration
│           ├── ai_service.py
│           ├── quiz_service.py
│           └── interview_service.py
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- A [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com)

### 1. Database Setup

Create a Supabase project and run the migration in the SQL Editor:

```sql
-- Copy and run the contents of supabase/migrations/001_initial_schema.sql
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key
FRONTEND_URL=http://localhost:3000
```

Start the server:

```bash
python run.py
```

Backend runs at `http://localhost:8000`.

### 3. Frontend

```bash
cd frontend
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

Frontend runs at `http://localhost:3000`.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sessions` | Create a prep session |
| `GET` | `/api/sessions?user_id=` | List user sessions |
| `GET` | `/api/sessions/{id}` | Get session details |
| `DELETE` | `/api/sessions/{id}` | Delete session |
| `POST` | `/api/sessions/{id}/prep-sources` | Generate AI prep sources |
| `GET` | `/api/sessions/{id}/prep-sources` | Get prep sources |
| `POST` | `/api/sessions/{id}/quiz` | Create quiz |
| `POST` | `/api/sessions/{id}/quiz/{qid}/submit` | Submit quiz answers |
| `POST` | `/api/sessions/{id}/mock-interview` | Start mock interview |
| `POST` | `/api/sessions/{id}/mock-interview/{mid}/message` | Send candidate message |
| `POST` | `/api/sessions/{id}/mock-interview/{mid}/end` | End interview + get feedback |
| `POST` | `/api/upload-resume` | Upload and parse resume |
| `GET` | `/health` | Health check |

---


