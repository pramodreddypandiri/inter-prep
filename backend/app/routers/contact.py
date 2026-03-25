import smtplib
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
from app.database import get_supabase
from app.config import SMTP_HOST, SMTP_PORT, SMTP_LOGIN, SMTP_PASSWORD, CONTACT_EMAIL

router = APIRouter(prefix="/api", tags=["contact"])

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/contact")
async def submit_contact(
    user_id: str = Form(...),
    user_name: str = Form(...),
    user_email: str = Form(...),
    type: str = Form(...),
    message: str = Form(...),
    screenshot: Optional[UploadFile] = File(None),
):
    screenshot_url = None
    screenshot_data = None
    screenshot_filename = None

    if screenshot and screenshot.filename:
        content = await screenshot.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Screenshot too large (max 5MB)")
        screenshot_filename = screenshot.filename
        screenshot_data = content

        # Store in Supabase Storage
        try:
            db = get_supabase()
            path = f"contact/{user_id}/{screenshot.filename}"
            db.storage.from_("screenshots").upload(path, content, {
                "content-type": screenshot.content_type or "image/png",
            })
            screenshot_url = db.storage.from_("screenshots").get_public_url(path)
        except Exception:
            # Storage may not be set up — continue without URL
            screenshot_url = None

    # Save to database
    db = get_supabase()
    try:
        db.table("contact_messages").insert({
            "user_id": user_id,
            "user_name": user_name,
            "user_email": user_email,
            "type": type,
            "message": message,
            "screenshot_url": screenshot_url,
        }).execute()
    except Exception:
        # Table may not exist — continue to send email anyway
        pass

    # Send email via SMTP
    if SMTP_LOGIN and SMTP_PASSWORD:
        try:
            msg = MIMEMultipart()
            msg["From"] = SMTP_LOGIN
            msg["To"] = CONTACT_EMAIL
            msg["Subject"] = f"[InterviewAce {type.capitalize()}] from {user_name}"

            body = f"""New {type} from InterviewAce:

From: {user_name} ({user_email})
Type: {type.capitalize()}

Message:
{message}

{"Screenshot attached." if screenshot_data else "No screenshot."}
"""
            msg.attach(MIMEText(body, "plain"))

            if screenshot_data and screenshot_filename:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(screenshot_data)
                encoders.encode_base64(part)
                part.add_header("Content-Disposition", f"attachment; filename={screenshot_filename}")
                msg.attach(part)

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_LOGIN, SMTP_PASSWORD)
                server.send_message(msg)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
    else:
        # No SMTP configured — just saved to DB
        pass

    return {"status": "sent", "message": "Your message has been sent successfully."}
