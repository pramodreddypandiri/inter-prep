from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.services.ai_service import parse_resume_text
from app.models.schemas import ResumeUploadResponse

router = APIRouter(prefix="/api", tags=["upload"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload-resume", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Form(...),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Parse resume text using AI
    text = await parse_resume_text(content, file.filename)

    return ResumeUploadResponse(text=text)
