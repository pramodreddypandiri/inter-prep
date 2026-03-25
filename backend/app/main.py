from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import FRONTEND_URL
from app.routers import sessions, prep_sources, upload, quiz, mock_interview

app = FastAPI(title="InterviewAce API", version="1.0.0")

# CORS - allow frontend origin (set FRONTEND_URL env var in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(sessions.router)
app.include_router(prep_sources.router)
app.include_router(upload.router)
app.include_router(quiz.router)
app.include_router(mock_interview.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
