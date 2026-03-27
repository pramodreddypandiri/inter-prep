from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "")  # Comma-separated extra origins
CORS_ALLOW_VERCEL_PREVIEWS = os.getenv("CORS_ALLOW_VERCEL_PREVIEWS", "false").lower() == "true"

# SMTP (Brevo)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp-relay.brevo.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_LOGIN = os.getenv("SMTP_LOGIN", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "pramodreddypandiri010@gmail.com")
