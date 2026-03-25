from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SessionCreate(BaseModel):
    name: str
    company_name: str
    jd_text: str
    resume_text: str
    round_description: str
    user_id: str


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
