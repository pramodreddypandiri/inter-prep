from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import List
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import get_supabase
from app.services.quiz_service import generate_quiz_questions, evaluate_quiz_answers
from app.auth import get_current_user

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/sessions", tags=["quiz"])


def _verify_session_owner(session_id: str, user_id: str) -> dict:
    db = get_supabase()
    result = db.table("sessions").select("*").eq("id", session_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")
    if result.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    return result.data


class QuizCreate(BaseModel):
    topics: str = Field(default="", max_length=2_000)
    num_questions: int = Field(default=10, ge=1, le=30)


class QuizAnswer(BaseModel):
    question_id: int
    answer: str = Field(..., max_length=10_000)


class QuizSubmit(BaseModel):
    answers: List[QuizAnswer]


@router.post("/{session_id}/quiz")
@limiter.limit("10/hour")
async def create_quiz_session(request: Request, session_id: str, body: QuizCreate, user_id: str = Depends(get_current_user)):
    db = get_supabase()
    s = _verify_session_owner(session_id, user_id)

    # Get prep sources if available
    prep_result = (
        db.table("prep_sources")
        .select("content")
        .eq("session_id", session_id)
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
    )
    prep_sources = prep_result.data[0]["content"] if prep_result.data else {}

    # Generate questions
    questions = await generate_quiz_questions(
        resume_text=s["resume_text"],
        jd_text=s["jd_text"],
        company_name=s["company_name"],
        round_description=s["round_description"],
        prep_sources=prep_sources,
        topics=body.topics,
        num_questions=body.num_questions,
    )

    # Save quiz session
    result = (
        db.table("quiz_sessions")
        .insert(
            {
                "session_id": session_id,
                "mode": "open",
                "questions": questions,
                "answers": [],
                "status": "in_progress",
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create quiz session")

    return result.data[0]


@router.post("/{session_id}/quiz/{quiz_id}/submit")
@limiter.limit("20/hour")
async def submit_quiz_answers(request: Request, session_id: str, quiz_id: str, body: QuizSubmit, user_id: str = Depends(get_current_user)):
    db = get_supabase()
    s = _verify_session_owner(session_id, user_id)

    # Get quiz session
    quiz = db.table("quiz_sessions").select("*").eq("id", quiz_id).single().execute()
    if not quiz.data:
        raise HTTPException(status_code=404, detail="Quiz session not found")

    q = quiz.data
    answers_data = [a.dict() for a in body.answers]

    # Evaluate answers
    feedback = await evaluate_quiz_answers(
        questions=q["questions"],
        answers=answers_data,
        resume_text=s["resume_text"],
        jd_text=s["jd_text"],
        round_description=s["round_description"],
    )

    # Update quiz session with answers and feedback
    result = (
        db.table("quiz_sessions")
        .update({"answers": answers_data, "feedback": feedback, "status": "completed"})
        .eq("id", quiz_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save quiz results")

    return result.data[0]


@router.get("/{session_id}/quiz")
async def list_quiz_sessions(session_id: str, user_id: str = Depends(get_current_user)):
    _verify_session_owner(session_id, user_id)

    db = get_supabase()
    result = (
        db.table("quiz_sessions")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/{session_id}/quiz/{quiz_id}")
async def get_quiz_session(session_id: str, quiz_id: str, user_id: str = Depends(get_current_user)):
    _verify_session_owner(session_id, user_id)

    db = get_supabase()
    result = db.table("quiz_sessions").select("*").eq("id", quiz_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Quiz session not found")
    return result.data
