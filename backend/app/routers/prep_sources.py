from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import get_supabase
from app.models.schemas import PrepSourceResponse
from app.services.ai_service import generate_prep_sources, regenerate_prep_section
from app.auth import get_current_user

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/sessions", tags=["prep_sources"])


def _verify_session_owner(session_id: str, user_id: str) -> dict:
    """Fetch session and verify the authenticated user owns it."""
    db = get_supabase()
    result = db.table("sessions").select("*").eq("id", session_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")
    if result.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    return result.data


@router.post("/{session_id}/prep-sources", response_model=PrepSourceResponse)
@limiter.limit("10/hour")
async def create_prep_sources(request: Request, session_id: str, user_id: str = Depends(get_current_user)):
    db = get_supabase()
    session = _verify_session_owner(session_id, user_id)

    # Generate prep sources using AI
    content = await generate_prep_sources(
        resume_text=session["resume_text"],
        jd_text=session["jd_text"],
        company_name=session["company_name"],
        round_description=session["round_description"],
    )

    # Delete existing prep sources for this session
    db.table("prep_sources").delete().eq("session_id", session_id).execute()

    # Insert new prep sources
    result = (
        db.table("prep_sources")
        .insert(
            {
                "session_id": session_id,
                "content": content,
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save prep sources")

    return result.data[0]


@router.get("/{session_id}/prep-sources")
async def get_prep_sources(session_id: str, user_id: str = Depends(get_current_user)):
    _verify_session_owner(session_id, user_id)

    db = get_supabase()
    result = (
        db.table("prep_sources")
        .select("*")
        .eq("session_id", session_id)
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
    )

    if not result.data:
        return None

    return result.data[0]


VALID_SECTIONS = {"company_snapshot", "interview_process", "technical_topics", "preparation_checklist", "resource_links"}


class RegenerateSectionRequest(BaseModel):
    section: str = Field(..., max_length=50)  # e.g. "company_snapshot", "technical_topics"


@router.post("/{session_id}/prep-sources/section")
@limiter.limit("20/hour")
async def regenerate_section(request: Request, session_id: str, body: RegenerateSectionRequest, user_id: str = Depends(get_current_user)):
    if body.section not in VALID_SECTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid section. Must be one of: {', '.join(VALID_SECTIONS)}")

    db = get_supabase()
    session = _verify_session_owner(session_id, user_id)

    # Get existing prep sources
    prep_result = (
        db.table("prep_sources")
        .select("*")
        .eq("session_id", session_id)
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
    )
    if not prep_result.data:
        raise HTTPException(status_code=404, detail="Prep sources not found. Generate full prep sources first.")

    existing = prep_result.data[0]

    # Regenerate just this section
    new_content = await regenerate_prep_section(
        section_key=body.section,
        resume_text=session["resume_text"],
        jd_text=session["jd_text"],
        company_name=session["company_name"],
        round_description=session["round_description"],
    )

    # Update the content with the new section
    updated_content = existing["content"]
    updated_content[body.section] = new_content

    db.table("prep_sources").update({"content": updated_content}).eq("id", existing["id"]).execute()

    return {"section": body.section, "content": new_content}
