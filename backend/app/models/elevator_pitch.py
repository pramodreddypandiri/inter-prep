"""Pydantic models for the elevator pitch feature."""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


# ── Request models ────────────────────────────────────────────────────────────

class GeneratePitchRequest(BaseModel):
    target_role: str = Field(..., min_length=1, max_length=200)
    company_name: str = Field(default="", max_length=200)
    resume_text: str = Field(default="", max_length=50_000)
    key_strengths: str = Field(default="", max_length=2_000)


class CreatePitchRequest(BaseModel):
    pitch_text: str = Field(..., min_length=1, max_length=10_000)
    target_role: str = Field(..., min_length=1, max_length=200)
    company_name: str = Field(default="", max_length=200)
    resume_text: str = Field(default="", max_length=50_000)


class UpdatePitchRequest(BaseModel):
    pitch_text: str = Field(..., min_length=1, max_length=10_000)
    target_role: Optional[str] = Field(default=None, max_length=200)
    company_name: Optional[str] = Field(default=None, max_length=200)


# ── Response models ───────────────────────────────────────────────────────────

class PitchDimensionScore(BaseModel):
    opening_hook: int = Field(ge=0, le=15)
    identity_clarity: int = Field(ge=0, le=15)
    value_proposition: int = Field(ge=0, le=20)
    unique_differentiator: int = Field(ge=0, le=20)
    role_fit: int = Field(ge=0, le=15)
    call_to_action: int = Field(ge=0, le=10)
    delivery: int = Field(ge=0, le=5)


class PitchFeedback(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    dimensions: dict
    strengths: list[str]
    improvements: list[str]
    tailored_suggestions: list[str]
    timing_note: str


class PitchRecordingResponse(BaseModel):
    id: str
    pitch_id: str
    user_id: str
    video_url: Optional[str]
    duration_seconds: int
    transcript: str
    score: Optional[int]
    feedback: Optional[dict]
    share_token: str
    created_at: str


class ElevatorPitchResponse(BaseModel):
    id: str
    user_id: str
    pitch_text: str
    target_role: str
    company_name: str
    resume_text: str
    created_at: str
    updated_at: str
    recordings: Optional[list[dict]] = None
