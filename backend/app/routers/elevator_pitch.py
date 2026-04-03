"""Elevator Pitch API router.

Routes:
  POST   /api/elevator-pitch/generate              — AI generate pitch text (stateless)
  POST   /api/elevator-pitch                        — Save a new pitch
  GET    /api/elevator-pitch                        — List user's pitches
  GET    /api/elevator-pitch/{pitch_id}             — Get pitch + recordings
  PUT    /api/elevator-pitch/{pitch_id}             — Update pitch text / meta
  DELETE /api/elevator-pitch/{pitch_id}             — Delete pitch (cascades recordings)
  POST   /api/elevator-pitch/{pitch_id}/recordings  — Upload recording + run AI analysis
  GET    /api/elevator-pitch/{pitch_id}/recordings  — List recordings for a pitch
  GET    /api/elevator-pitch/share/{token}          — Public share endpoint (no auth)
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth import get_current_user
from app.database import get_supabase
from app.models.elevator_pitch import (
    CreatePitchRequest,
    GeneratePitchRequest,
    UpdatePitchRequest,
)
from app.services.elevator_pitch_service import (
    analyze_pitch_recording,
    generate_pitch_text,
)

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/elevator-pitch", tags=["elevator_pitch"])

MAX_VIDEO_BYTES = 50 * 1024 * 1024  # 50 MB


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_pitch_owned_by(pitch_id: str, user_id: str) -> dict:
    db = get_supabase()
    result = (
        db.table("elevator_pitches")
        .select("*")
        .eq("id", pitch_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Pitch not found")
    if result.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this pitch")
    return result.data


def _upload_video_to_storage(
    db,
    pitch_id: str,
    recording_id: str,
    video_bytes: bytes,
    content_type: str,
) -> Optional[str]:
    """Upload video to Supabase Storage. Returns public URL or None on failure."""
    ext = "webm"
    if "mp4" in content_type:
        ext = "mp4"
    elif "ogg" in content_type:
        ext = "ogg"

    path = f"{pitch_id}/{recording_id}.{ext}"
    try:
        db.storage.from_("pitch-recordings").upload(
            path,
            video_bytes,
            {"content-type": content_type, "upsert": "true"},
        )
        url = db.storage.from_("pitch-recordings").get_public_url(path)
        return url
    except Exception as e:
        logger.warning(f"Video upload to storage failed (non-fatal): {e}")
        return None


# ── stateless generation ──────────────────────────────────────────────────────

@router.post("/generate")
@limiter.limit("20/hour")
async def generate_pitch(
    request: Request,
    body: GeneratePitchRequest,
    user_id: str = Depends(get_current_user),
):
    """Generate elevator pitch text with Claude. Does not persist anything."""
    pitch_text = await generate_pitch_text(
        target_role=body.target_role,
        company_name=body.company_name,
        resume_text=body.resume_text,
        key_strengths=body.key_strengths,
    )
    return {"pitch_text": pitch_text}


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("")
async def create_pitch(
    body: CreatePitchRequest,
    user_id: str = Depends(get_current_user),
):
    """Persist a new elevator pitch for the current user."""
    db = get_supabase()
    result = (
        db.table("elevator_pitches")
        .insert(
            {
                "user_id": user_id,
                "pitch_text": body.pitch_text,
                "target_role": body.target_role,
                "company_name": body.company_name,
                "resume_text": body.resume_text,
            }
        )
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create pitch")
    return result.data[0]


@router.get("")
async def list_pitches(user_id: str = Depends(get_current_user)):
    """Return all pitches owned by the current user, newest first."""
    db = get_supabase()
    result = (
        db.table("elevator_pitches")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/share/{token}")
async def get_shared_recording(token: str):
    """Public endpoint — returns recording data for a share link. No auth required."""
    db = get_supabase()
    result = (
        db.table("pitch_recordings")
        .select("id, duration_seconds, transcript, score, feedback, video_url, share_token, created_at, pitch_id")
        .eq("share_token", token)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Shared recording not found")

    recording = result.data

    # Attach pitch metadata (role / company) for display — exclude private resume
    pitch_result = (
        db.table("elevator_pitches")
        .select("target_role, company_name")
        .eq("id", recording["pitch_id"])
        .single()
        .execute()
    )
    if pitch_result.data:
        recording["target_role"] = pitch_result.data["target_role"]
        recording["company_name"] = pitch_result.data["company_name"]

    return recording


@router.get("/{pitch_id}")
async def get_pitch(pitch_id: str, user_id: str = Depends(get_current_user)):
    """Return a single pitch with its recordings."""
    pitch = _get_pitch_owned_by(pitch_id, user_id)

    db = get_supabase()
    recordings_result = (
        db.table("pitch_recordings")
        .select("id, duration_seconds, transcript, score, feedback, video_url, share_token, created_at")
        .eq("pitch_id", pitch_id)
        .order("created_at", desc=True)
        .execute()
    )
    pitch["recordings"] = recordings_result.data
    return pitch


@router.put("/{pitch_id}")
async def update_pitch(
    pitch_id: str,
    body: UpdatePitchRequest,
    user_id: str = Depends(get_current_user),
):
    """Update the pitch text and optional meta fields."""
    _get_pitch_owned_by(pitch_id, user_id)

    update_data: dict = {"pitch_text": body.pitch_text}
    if body.target_role is not None:
        update_data["target_role"] = body.target_role
    if body.company_name is not None:
        update_data["company_name"] = body.company_name

    db = get_supabase()
    result = (
        db.table("elevator_pitches")
        .update(update_data)
        .eq("id", pitch_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update pitch")
    return result.data[0]


@router.delete("/{pitch_id}")
async def delete_pitch(pitch_id: str, user_id: str = Depends(get_current_user)):
    """Delete a pitch and all its recordings."""
    _get_pitch_owned_by(pitch_id, user_id)
    db = get_supabase()
    db.table("elevator_pitches").delete().eq("id", pitch_id).execute()
    return {"deleted": pitch_id}


# ── recordings ────────────────────────────────────────────────────────────────

@router.post("/{pitch_id}/recordings")
@limiter.limit("30/hour")
async def create_recording(
    request: Request,
    pitch_id: str,
    transcript: str = Form(default=""),
    duration_seconds: int = Form(default=0, ge=0, le=300),
    video: Optional[UploadFile] = File(default=None),
    user_id: str = Depends(get_current_user),
):
    """Save a practice recording and run AI analysis.

    Accepts multipart/form-data:
      - transcript: str (Web Speech API result)
      - duration_seconds: int
      - video: optional video file (webm/mp4)
    """
    pitch = _get_pitch_owned_by(pitch_id, user_id)

    db = get_supabase()

    # Validate video size if provided
    video_bytes: Optional[bytes] = None
    video_content_type = "video/webm"
    if video and video.filename:
        video_bytes = await video.read()
        if len(video_bytes) > MAX_VIDEO_BYTES:
            raise HTTPException(status_code=413, detail="Video file exceeds 50 MB limit")
        video_content_type = video.content_type or "video/webm"

    # Run AI analysis
    feedback: Optional[dict] = None
    score: Optional[int] = None
    try:
        feedback = await analyze_pitch_recording(
            transcript=transcript,
            pitch_text=pitch["pitch_text"],
            duration_seconds=duration_seconds,
            resume_text=pitch["resume_text"],
            target_role=pitch["target_role"],
            company_name=pitch["company_name"],
        )
        score = feedback.get("overall_score")
    except Exception as e:
        logger.warning(f"Pitch analysis failed (non-fatal): {e}")

    # Insert recording row first (to get the id for storage path)
    insert_result = (
        db.table("pitch_recordings")
        .insert(
            {
                "pitch_id": pitch_id,
                "user_id": user_id,
                "duration_seconds": duration_seconds,
                "transcript": transcript,
                "score": score,
                "feedback": feedback,
                "video_url": None,
            }
        )
        .execute()
    )
    if not insert_result.data:
        raise HTTPException(status_code=500, detail="Failed to save recording")

    recording = insert_result.data[0]
    recording_id = recording["id"]

    # Upload video to Supabase Storage if provided
    if video_bytes:
        video_url = _upload_video_to_storage(
            db, pitch_id, recording_id, video_bytes, video_content_type
        )
        if video_url:
            update_result = (
                db.table("pitch_recordings")
                .update({"video_url": video_url})
                .eq("id", recording_id)
                .execute()
            )
            if update_result.data:
                recording = update_result.data[0]

    return recording


@router.get("/{pitch_id}/recordings")
async def list_recordings(pitch_id: str, user_id: str = Depends(get_current_user)):
    """List all recordings for a pitch, newest first."""
    _get_pitch_owned_by(pitch_id, user_id)

    db = get_supabase()
    result = (
        db.table("pitch_recordings")
        .select("id, duration_seconds, transcript, score, feedback, video_url, share_token, created_at")
        .eq("pitch_id", pitch_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data
