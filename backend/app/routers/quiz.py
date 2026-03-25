from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_supabase
from app.services.quiz_service import generate_quiz_questions, evaluate_quiz_answers

router = APIRouter(prefix="/api/sessions", tags=["quiz"])


class QuizCreate(BaseModel):
    topics: str = ""
    num_questions: int = 10


class QuizAnswer(BaseModel):
    question_id: int
    answer: str


class QuizSubmit(BaseModel):
    answers: List[QuizAnswer]


@router.post("/{session_id}/quiz")
async def create_quiz_session(session_id: str, body: QuizCreate):
    db = get_supabase()

    # Get session
    session = db.table("sessions").select("*").eq("id", session_id).single().execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")

    s = session.data

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

    # Save quiz session — mode column still required by DB, store as "open"
    result = (
        db.table("quiz_sessions")
        .insert(
            {
                "session_id": session_id,
                "mode": "open",
                "questions": questions,
                "answers": [],
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create quiz session")

    return result.data[0]


@router.post("/{session_id}/quiz/{quiz_id}/submit")
async def submit_quiz_answers(session_id: str, quiz_id: str, body: QuizSubmit):
    db = get_supabase()

    # Get quiz session
    quiz = db.table("quiz_sessions").select("*").eq("id", quiz_id).single().execute()
    if not quiz.data:
        raise HTTPException(status_code=404, detail="Quiz session not found")

    # Get session for context
    session = db.table("sessions").select("*").eq("id", session_id).single().execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")

    s = session.data
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
        .update({"answers": answers_data, "feedback": feedback})
        .eq("id", quiz_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save quiz results")

    return result.data[0]


@router.get("/{session_id}/quiz")
async def list_quiz_sessions(session_id: str):
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
async def get_quiz_session(session_id: str, quiz_id: str):
    db = get_supabase()
    result = db.table("quiz_sessions").select("*").eq("id", quiz_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Quiz session not found")
    return result.data
