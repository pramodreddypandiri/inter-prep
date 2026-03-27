from fastapi import APIRouter, HTTPException, Depends
from app.database import get_supabase
from app.models.schemas import SessionCreate, SessionResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse)
async def create_session(session: SessionCreate, user_id: str = Depends(get_current_user)):
    db = get_supabase()
    result = (
        db.table("sessions")
        .insert(
            {
                "user_id": user_id,
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
async def list_sessions(user_id: str = Depends(get_current_user)):
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
async def get_session(session_id: str, user_id: str = Depends(get_current_user)):
    db = get_supabase()
    result = db.table("sessions").select("*").eq("id", session_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    if result.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")

    return result.data


@router.delete("/{session_id}")
async def delete_session(session_id: str, user_id: str = Depends(get_current_user)):
    db = get_supabase()

    # Verify ownership
    session = db.table("sessions").select("user_id").eq("id", session_id).single().execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this session")

    # Delete related prep sources first
    db.table("prep_sources").delete().eq("session_id", session_id).execute()

    # Delete the session
    db.table("sessions").delete().eq("id", session_id).execute()

    return {"message": "Session deleted"}
