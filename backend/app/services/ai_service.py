import anthropic
from app.config import ANTHROPIC_API_KEY
from app.services.json_utils import extract_json

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


async def generate_prep_sources(
    resume_text: str,
    jd_text: str,
    company_name: str,
    round_description: str,
) -> dict:
    """Generate preparation sources using Claude API."""

    prompt = f"""You are an expert interview preparation coach. Based on the following information about a candidate and their target role, generate a comprehensive preparation guide.

## Candidate's Resume:
{resume_text}

## Job Description:
{jd_text}

## Target Company:
{company_name}

## Interview Round Description:
{round_description}

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

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text
    return extract_json(response_text)


SECTION_DESCRIPTIONS = {
    "company_snapshot": "Culture, values, recent news, team context, and what makes this company unique. Include any known engineering culture aspects.",
    "interview_process": "Known interview rounds, common question themes for this role/company, what to expect in each round, and tips from common patterns.",
    "technical_topics": "Key technical skills from the JD mapped to specific study areas. For each topic, explain what depth of knowledge is expected and how it relates to the candidate's background.",
    "preparation_checklist": "A step-by-step action plan the candidate should follow before the interview. Be specific and actionable.",
    "resource_links": "Curated list of documentation, courses, papers, books, and practice resources relevant to the topics identified. Every resource MUST include an actual URL as a markdown hyperlink in the format [Resource Name](https://actual-url). Group by category.",
}


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
{resume_text}

## Job Description:
{jd_text}

## Target Company:
{company_name}

## Interview Round Description:
{round_description}

Generate content for: **{section_label}**
Description: {section_desc}

Provide a fresh, detailed, and comprehensive version of this section. Use markdown formatting for readability (headers, bullet points, bold text etc).

If this is the Resource Links section: every single resource MUST include an actual working URL as a markdown hyperlink in the format [Resource Name](https://actual-url). Do not list resources without URLs.

Return ONLY the markdown content for this section. No JSON wrapping, no code fences — just the raw markdown text."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    return message.content[0].text


async def parse_resume_text(file_content: bytes, filename: str) -> str:
    """Extract text from a resume file using Claude's vision or text capabilities."""

    # For text-based files, decode directly
    if filename.endswith((".txt", ".md")):
        return file_content.decode("utf-8", errors="ignore")

    # For PDF and other documents, use Claude's vision capability
    import base64

    media_type = "application/pdf"
    if filename.endswith((".png", ".jpg", ".jpeg")):
        ext = filename.rsplit(".", 1)[-1].lower()
        media_type = f"image/{'jpeg' if ext == 'jpg' else ext}"
    elif filename.endswith(".pdf"):
        media_type = "application/pdf"

    encoded = base64.b64encode(file_content).decode("utf-8")

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
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

    return message.content[0].text
