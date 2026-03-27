from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import get_supabase
from app.services.interview_service import (
    generate_first_question,
    generate_interviewer_response,
    generate_feedback_report,
)
from app.auth import get_current_user

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/sessions", tags=["mock_interview"])


def _verify_session_owner(session_id: str, user_id: str) -> dict:
    db = get_supabase()
    result = db.table("sessions").select("*").eq("id", session_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")
    if result.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    return result.data


class MockInterviewCreate(BaseModel):
    topics: str = Field(..., max_length=2_000)
    duration: int = Field(..., ge=5, le=90)  # minutes
    difficulty: str = Field(..., max_length=50)  # beginner, intermediate, senior, staff


class CandidateMessage(BaseModel):
    content: str = Field(..., max_length=10_000)


class EyeTrackingStats(BaseModel):
    totalLookAways: int = 0
    readingPatterns: int = 0
    suspiciousEvents: list = []


class EndInterviewRequest(BaseModel):
    eye_tracking: Optional[EyeTrackingStats] = None


@router.post("/{session_id}/mock-interview")
@limiter.limit("5/hour")
async def create_mock_interview(request: Request, session_id: str, body: MockInterviewCreate, user_id: str = Depends(get_current_user)):
    db = get_supabase()
    s = _verify_session_owner(session_id, user_id)

    # Get prep sources
    prep_result = (
        db.table("prep_sources")
        .select("content")
        .eq("session_id", session_id)
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
    )
    prep_sources = prep_result.data[0]["content"] if prep_result.data else {}

    # Generate opening question
    opening = await generate_first_question(
        resume_text=s["resume_text"],
        jd_text=s["jd_text"],
        company_name=s["company_name"],
        round_description=s["round_description"],
        prep_sources=prep_sources,
        topics=body.topics,
        duration=body.duration,
        difficulty=body.difficulty,
    )

    transcript = [
        {
            "role": "interviewer",
            "content": opening,
            "timestamp": datetime.utcnow().isoformat(),
        }
    ]

    # Save mock interview
    result = (
        db.table("mock_interviews")
        .insert(
            {
                "session_id": session_id,
                "topics": body.topics,
                "duration": body.duration,
                "difficulty": body.difficulty,
                "transcript": transcript,
                "status": "in_progress",
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=500, detail="Failed to create mock interview"
        )

    return result.data[0]


@router.post("/{session_id}/mock-interview/{mock_id}/message")
@limiter.limit("60/hour")
async def send_candidate_message(
    request: Request, session_id: str, mock_id: str, body: CandidateMessage, user_id: str = Depends(get_current_user)
):
    db = get_supabase()
    s = _verify_session_owner(session_id, user_id)

    # Get mock interview
    mock = (
        db.table("mock_interviews").select("*").eq("id", mock_id).single().execute()
    )
    if not mock.data:
        raise HTTPException(status_code=404, detail="Mock interview not found")

    m = mock.data

    # Add candidate message to transcript
    transcript = m["transcript"]
    transcript.append(
        {
            "role": "candidate",
            "content": body.content,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )

    # Calculate elapsed time
    start_time = datetime.fromisoformat(transcript[0]["timestamp"])
    elapsed = (datetime.utcnow() - start_time).total_seconds() / 60

    # Generate interviewer response
    response = await generate_interviewer_response(
        transcript=transcript,
        resume_text=s["resume_text"],
        jd_text=s["jd_text"],
        topics=m["topics"],
        duration=m["duration"],
        difficulty=m["difficulty"],
        elapsed_minutes=elapsed,
    )

    # Add interviewer response to transcript
    transcript.append(
        {
            "role": "interviewer",
            "content": response["content"],
            "timestamp": datetime.utcnow().isoformat(),
        }
    )

    # Update transcript
    update_data = {"transcript": transcript}

    # If interview is complete, generate feedback
    if response["is_complete"]:
        feedback = await generate_feedback_report(
            transcript=transcript,
            resume_text=s["resume_text"],
            jd_text=s["jd_text"],
            topics=m["topics"],
            difficulty=m["difficulty"],
        )
        update_data["feedback_report"] = feedback
        update_data["status"] = "completed"

    db.table("mock_interviews").update(update_data).eq("id", mock_id).execute()

    return {
        "interviewer_message": response["content"],
        "is_complete": response["is_complete"],
        "transcript": transcript,
    }


@router.post("/{session_id}/mock-interview/{mock_id}/end")
@limiter.limit("10/hour")
async def end_mock_interview(
    request: Request, session_id: str, mock_id: str, body: Optional[EndInterviewRequest] = None, user_id: str = Depends(get_current_user)
):
    """Manually end a mock interview and generate feedback."""
    db = get_supabase()
    s = _verify_session_owner(session_id, user_id)

    mock = (
        db.table("mock_interviews").select("*").eq("id", mock_id).single().execute()
    )
    if not mock.data:
        raise HTTPException(status_code=404, detail="Mock interview not found")

    m = mock.data

    # Build eye tracking context for feedback
    eye_tracking_context = None
    if body and body.eye_tracking:
        et = body.eye_tracking
        eye_tracking_context = {
            "total_look_aways": et.totalLookAways,
            "reading_patterns_detected": et.readingPatterns,
            "suspicious_events_count": len(et.suspiciousEvents),
        }

    # Generate feedback if not already generated
    if not m.get("feedback_report"):
        feedback = await generate_feedback_report(
            transcript=m["transcript"],
            resume_text=s["resume_text"],
            jd_text=s["jd_text"],
            topics=m["topics"],
            difficulty=m["difficulty"],
            eye_tracking=eye_tracking_context,
        )
        db.table("mock_interviews").update({"feedback_report": feedback, "status": "completed"}).eq(
            "id", mock_id
        ).execute()
        m["feedback_report"] = feedback

    return m


@router.get("/{session_id}/mock-interview")
async def list_mock_interviews(session_id: str, user_id: str = Depends(get_current_user)):
    _verify_session_owner(session_id, user_id)

    db = get_supabase()
    result = (
        db.table("mock_interviews")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/{session_id}/mock-interview/{mock_id}")
async def get_mock_interview(session_id: str, mock_id: str, user_id: str = Depends(get_current_user)):
    _verify_session_owner(session_id, user_id)

    db = get_supabase()
    result = (
        db.table("mock_interviews").select("*").eq("id", mock_id).single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Mock interview not found")
    return result.data
