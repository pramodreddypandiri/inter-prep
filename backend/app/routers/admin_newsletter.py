import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from app.config import (
    ADMIN_SECRET,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_LOGIN,
    SMTP_PASSWORD,
    FROM_EMAIL,
    FRONTEND_URL,
)
from app.database import get_supabase

router = APIRouter(prefix="/api/admin", tags=["admin"])


class NewsletterRequest(BaseModel):
    subject: str
    feature_title: str
    feature_description: str
    cta_text: str = "Try it now"
    cta_url: str = ""


def _build_html(payload: NewsletterRequest) -> str:
    cta_url = payload.cta_url or FRONTEND_URL
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{payload.subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#111111;border-radius:16px;border:1px solid #1f2937;overflow:hidden;max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 40px 20px;border-bottom:1px solid #1f2937;">
              <p style="margin:0;font-size:22px;font-weight:800;color:#10b981;letter-spacing:-0.5px;">InterviewAce</p>
              <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;">What&rsquo;s New</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <h1 style="margin:0 0 14px;font-size:24px;font-weight:800;color:#f9fafb;line-height:1.25;">
                {payload.feature_title}
              </h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.75;color:#9ca3af;">
                {payload.feature_description}
              </p>
              <a href="{cta_url}"
                 style="display:inline-block;padding:13px 30px;background:#10b981;color:#ffffff;
                        font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">
                {payload.cta_text}
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1f2937;">
              <p style="margin:0;font-size:12px;color:#4b5563;">
                You&rsquo;re receiving this because you have an InterviewAce account.
                &copy; 2026 InterviewAce.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


@router.post("/send-newsletter")
async def send_newsletter(
    payload: NewsletterRequest,
    x_admin_key: str = Header(...),
):
    if not ADMIN_SECRET or x_admin_key != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin key")

    if not SMTP_LOGIN or not SMTP_PASSWORD:
        raise HTTPException(status_code=503, detail="SMTP not configured")

    sender = FROM_EMAIL or SMTP_LOGIN

    # Collect all user emails via Supabase auth admin (paginated)
    db = get_supabase()
    emails: list[str] = []
    page = 1
    while True:
        users = db.auth.admin.list_users(page=page, per_page=1000)
        if not users:
            break
        emails.extend(u.email for u in users if u.email)
        if len(users) < 1000:
            break
        page += 1

    if not emails:
        return {"sent": 0, "failed": 0, "total_users": 0}

    html_body = _build_html(payload)
    sent = 0
    failed = 0

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_LOGIN, SMTP_PASSWORD)
        for email in emails:
            try:
                msg = MIMEMultipart("alternative")
                msg["From"] = f"InterviewAce <{sender}>"
                msg["To"] = email
                msg["Subject"] = payload.subject
                msg.attach(MIMEText(html_body, "html"))
                server.send_message(msg)
                sent += 1
            except Exception:
                failed += 1

    return {"sent": sent, "failed": failed, "total_users": len(emails)}
