from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import get_supabase
from app.models.schemas import PrepSourceResponse
from app.services.ai_service import generate_prep_sources, regenerate_prep_section

router = APIRouter(prefix="/api/sessions", tags=["prep_sources"])


@router.post("/{session_id}/prep-sources", response_model=PrepSourceResponse)
async def create_prep_sources(session_id: str):
    db = get_supabase()

    # Get session data
    session_result = (
        db.table("sessions").select("*").eq("id", session_id).single().execute()
    )
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    session = session_result.data

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
async def get_prep_sources(session_id: str):
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


class RegenerateSectionRequest(BaseModel):
    section: str  # e.g. "company_snapshot", "technical_topics"


@router.post("/{session_id}/prep-sources/section")
async def regenerate_section(session_id: str, body: RegenerateSectionRequest):
    db = get_supabase()

    # Get session
    session_result = (
        db.table("sessions").select("*").eq("id", session_id).single().execute()
    )
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Session not found")

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
    session = session_result.data

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
