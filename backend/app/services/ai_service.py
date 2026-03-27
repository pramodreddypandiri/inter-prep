from __future__ import annotations

import base64
import logging

import anthropic
from fastapi import HTTPException
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.config import ANTHROPIC_API_KEY
from app.services.json_utils import extract_json

logger = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY, timeout=120.0)

MAX_TEXT_CHARS = 30_000  # Safety cap for text sent to Claude prompts


def _cap(text: str, limit: int = MAX_TEXT_CHARS) -> str:
    return text[:limit] if len(text) > limit else text


# Retry on transient errors (rate limit, server errors) — not on bad requests
_retry_decorator = retry(
    retry=retry_if_exception_type((anthropic.RateLimitError, anthropic.APIConnectionError, anthropic.InternalServerError)),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(3),
    reraise=True,
)


def _call_claude(*, model: str = "claude-sonnet-4-20250514", max_tokens: int = 4096, messages: list, system: str | None = None):
    """Central wrapper for all Claude API calls with retry and error handling."""
    kwargs = {"model": model, "max_tokens": max_tokens, "messages": messages}
    if system:
        kwargs["system"] = system

    try:
        message = _retry_decorator(client.messages.create)(**kwargs)
        return message.content[0].text
    except anthropic.RateLimitError:
        logger.error("Claude API rate limit exceeded after retries")
        raise HTTPException(status_code=429, detail="AI service is temporarily overloaded. Please try again in a few minutes.")
    except anthropic.APIConnectionError:
        logger.error("Failed to connect to Claude API")
        raise HTTPException(status_code=502, detail="Unable to reach AI service. Please try again shortly.")
    except anthropic.InternalServerError:
        logger.error("Claude API internal server error")
        raise HTTPException(status_code=502, detail="AI service encountered an error. Please try again.")
    except anthropic.BadRequestError as e:
        logger.error(f"Claude API bad request: {e}")
        raise HTTPException(status_code=400, detail="The request could not be processed. Input may be too large or invalid.")
    except Exception as e:
        logger.error(f"Unexpected Claude API error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while generating content.")


def _call_claude_json(*, model: str = "claude-sonnet-4-20250514", max_tokens: int = 4096, messages: list, system: str | None = None):
    """Call Claude and parse JSON from response, with structured error on parse failure."""
    text = _call_claude(model=model, max_tokens=max_tokens, messages=messages, system=system)
    try:
        return extract_json(text)
    except ValueError:
        logger.error(f"Failed to parse JSON from Claude response: {text[:200]}")
        raise HTTPException(status_code=502, detail="AI returned an invalid response. Please try again.")


SECTION_DESCRIPTIONS = {
    "company_snapshot": "Culture, values, recent news, team context, and what makes this company unique. Include any known engineering culture aspects.",
    "interview_process": "Known interview rounds, common question themes for this role/company, what to expect in each round, and tips from common patterns.",
    "technical_topics": "Key technical skills from the JD mapped to specific study areas. For each topic, explain what depth of knowledge is expected and how it relates to the candidate's background.",
    "preparation_checklist": "A step-by-step action plan the candidate should follow before the interview. Be specific and actionable.",
    "resource_links": "Curated list of documentation, courses, papers, books, and practice resources relevant to the topics identified. Every resource MUST include an actual URL as a markdown hyperlink in the format [Resource Name](https://actual-url). Group by category.",
}


async def generate_prep_sources(
    resume_text: str,
    jd_text: str,
    company_name: str,
    round_description: str,
) -> dict:
    """Generate preparation sources using Claude API."""

    prompt = f"""You are an expert interview preparation coach. Based on the following information about a candidate and their target role, generate a comprehensive preparation guide.

## Candidate's Resume:
{_cap(resume_text)}

## Job Description:
{_cap(jd_text)}

## Target Company:
{_cap(company_name, 500)}

## Interview Round Description:
{_cap(round_description, 5000)}

Generate a structured preparation guide with the following sections. Use markdown formatting within each section for readability.

Respond in the following JSON format exactly:
{{
  "company_snapshot": "Culture, values, recent news, team context, and what makes this company unique. Include any known engineering culture aspects.",
  "interview_process": "Known interview rounds, common question themes for this role/company, what to expect in each round, and tips from common patterns.",
  "technical_topics": "Key technical skills from the JD mapped to specific study areas. For each topic, explain what depth of knowledge is expected and how it relates to the candidate's background.",
  "preparation_checklist": "A step-by-step action plan the candidate should follow before the interview. Be specific and actionable.",
  "resource_links": "Curated list of documentation, courses, papers, books, and practice resources relevant to the topics identified. For EVERY resource you must include a working clickable markdown hyperlink in the format [Resource Name](https://actual-url). Group resources by category (Documentation, Courses, Books, Practice, etc). Each item should have the markdown link followed by a brief description."
}}

Important: Return ONLY valid JSON. No markdown code fences. Each value should be a markdown-formatted string. For the resource_links section, every single resource MUST include an actual URL as a markdown link — do not just list names without URLs."""

    return _call_claude_json(max_tokens=4096, messages=[{"role": "user", "content": prompt}])


async def regenerate_prep_section(
    section_key: str,
    resume_text: str,
    jd_text: str,
    company_name: str,
    round_description: str,
) -> str:
    """Regenerate a single prep source section."""

    section_desc = SECTION_DESCRIPTIONS.get(section_key, section_key)
    section_label = section_key.replace("_", " ").title()

    prompt = f"""You are an expert interview preparation coach. Regenerate ONLY the "{section_label}" section of an interview preparation guide.

## Candidate's Resume:
{_cap(resume_text)}

## Job Description:
{_cap(jd_text)}

## Target Company:
{_cap(company_name, 500)}

## Interview Round Description:
{_cap(round_description, 5000)}

Generate content for: **{section_label}**
Description: {section_desc}

Provide a fresh, detailed, and comprehensive version of this section. Use markdown formatting for readability (headers, bullet points, bold text etc).

If this is the Resource Links section: every single resource MUST include an actual working URL as a markdown hyperlink in the format [Resource Name](https://actual-url). Do not list resources without URLs.

Return ONLY the markdown content for this section. No JSON wrapping, no code fences — just the raw markdown text."""

    return _call_claude(max_tokens=2048, messages=[{"role": "user", "content": prompt}])


async def parse_resume_text(file_content: bytes, filename: str) -> str:
    """Extract text from a resume file using Claude's vision or text capabilities."""

    # For text-based files, decode directly
    if filename.endswith((".txt", ".md")):
        return file_content.decode("utf-8", errors="ignore")

    # For PDF and other documents, use Claude's vision capability
    media_type = "application/pdf"
    if filename.endswith((".png", ".jpg", ".jpeg")):
        ext = filename.rsplit(".", 1)[-1].lower()
        media_type = f"image/{'jpeg' if ext == 'jpg' else ext}"
    elif filename.endswith(".pdf"):
        media_type = "application/pdf"

    encoded = base64.b64encode(file_content).decode("utf-8")

    return _call_claude(
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document" if filename.endswith(".pdf") else "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": encoded,
                        },
                    },
                    {
                        "type": "text",
                        "text": "Extract all text content from this resume. Return only the extracted text, preserving the structure and formatting as much as possible. Do not add any commentary.",
                    },
                ],
            }
        ],
    )
