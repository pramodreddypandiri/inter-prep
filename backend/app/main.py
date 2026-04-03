import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import FRONTEND_URL, ALLOWED_ORIGINS, CORS_ALLOW_VERCEL_PREVIEWS
from app.database import get_supabase
from app.routers import sessions, prep_sources, upload, quiz, mock_interview, contact, elevator_pitch

logger = logging.getLogger(__name__)

# Rate limiter keyed by client IP
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    logger.info("InterviewAce API starting up")
    try:
        db = get_supabase()
        # Mark any in-progress records from a previous crash as abandoned
        db.table("mock_interviews").update({"status": "abandoned"}).eq("status", "in_progress").execute()
        db.table("quiz_sessions").update({"status": "abandoned"}).eq("status", "in_progress").execute()
        logger.info("Marked stale in-progress records as abandoned")
    except Exception as e:
        logger.warning(f"Startup cleanup skipped: {e}")

    yield

    # --- Shutdown ---
    logger.info("InterviewAce API shutting down gracefully")


app = FastAPI(title="InterviewAce API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — support multiple origins + optional Vercel preview regex
origins = [FRONTEND_URL]
if ALLOWED_ORIGINS:
    origins.extend([o.strip() for o in ALLOWED_ORIGINS.split(",") if o.strip()])

cors_config: dict = {
    "allow_origins": origins,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if CORS_ALLOW_VERCEL_PREVIEWS:
    cors_config["allow_origin_regex"] = r"https://.*\.vercel\.app"

app.add_middleware(CORSMiddleware, **cors_config)

# Include routers
app.include_router(sessions.router)
app.include_router(prep_sources.router)
app.include_router(upload.router)
app.include_router(quiz.router)
app.include_router(mock_interview.router)
app.include_router(contact.router)
app.include_router(elevator_pitch.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
