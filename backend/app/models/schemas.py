from pydantic import BaseModel, Field
from typing import Optional


class SessionCreate(BaseModel):
    name: str = Field(..., max_length=200)
    company_name: str = Field(..., max_length=200)
    jd_text: str = Field(..., max_length=50_000)
    resume_text: str = Field(..., max_length=50_000)
    round_description: str = Field(..., max_length=5_000)


class SessionResponse(BaseModel):
    id: str
    user_id: str
    name: str
    company_name: str
    jd_text: str
    resume_text: str
    round_description: str
    created_at: str


class PrepSourceContent(BaseModel):
    company_snapshot: str
    interview_process: str
    technical_topics: str
    preparation_checklist: str
    resource_links: str


class PrepSourceResponse(BaseModel):
    id: str
    session_id: str
    content: PrepSourceContent
    generated_at: str


class ResumeUploadResponse(BaseModel):
    text: str
    file_url: Optional[str] = None
