from fastapi import APIRouter, HTTPException, Query
from app.database import get_supabase
from app.models.schemas import SessionCreate, SessionResponse

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse)
async def create_session(session: SessionCreate):
    db = get_supabase()
    result = (
        db.table("sessions")
        .insert(
            {
                "user_id": session.user_id,
                "name": session.name,
                "company_name": session.company_name,
                "jd_text": session.jd_text,
                "resume_text": session.resume_text,
                "round_description": session.round_description,
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create session")

    return result.data[0]


@router.get("")
async def list_sessions(user_id: str = Query(...)):
    db = get_supabase()
    result = (
        db.table("sessions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    db = get_supabase()
    result = db.table("sessions").select("*").eq("id", session_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    return result.data


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    db = get_supabase()

    # Delete related prep sources first
    db.table("prep_sources").delete().eq("session_id", session_id).execute()

    # Delete the session
    result = db.table("sessions").delete().eq("id", session_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"message": "Session deleted"}
