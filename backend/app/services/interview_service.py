import json
import anthropic
from app.config import ANTHROPIC_API_KEY
from app.services.json_utils import extract_json

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

INTERVIEWER_SYSTEM_PROMPT = """You are a professional interviewer conducting a real interview. Follow these rules strictly:

1. NEVER give feedback, hints, or corrections during the interview.
2. Act as a neutral, professional interviewer — no encouragement or discouragement.
3. Ask one question at a time. Wait for the candidate's response before proceeding.
4. You may ask follow-up questions based on the candidate's answers to dig deeper.
5. Keep track of time — pace questions according to the total interview duration.
6. If the candidate's answer is too vague, ask a clarifying follow-up, just like a real interviewer would.
7. Cover the specified topics and difficulty level appropriately.
8. When the interview time is up or you've covered enough ground, thank the candidate and end the session.

Respond with ONLY your interviewer dialogue. No meta-commentary."""


async def generate_first_question(
    resume_text: str,
    jd_text: str,
    company_name: str,
    round_description: str,
    prep_sources: dict,
    topics: str,
    duration: int,
    difficulty: str,
) -> str:
    """Generate the opening of the mock interview."""

    prompt = f"""You are about to start a mock interview. Here is the context:

## Candidate's Resume:
{resume_text}

## Job Description:
{jd_text}

## Company: {company_name}
## Round Description: {round_description}
## Focus Topics: {topics}
## Duration: {duration} minutes
## Difficulty: {difficulty}

## Preparation Context:
{json.dumps(prep_sources) if prep_sources else "No prep sources available."}

Start the interview. Briefly introduce yourself as the interviewer, mention the format, and ask your first question. Keep the introduction concise (2-3 sentences max before the question)."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=INTERVIEWER_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    return message.content[0].text


async def generate_interviewer_response(
    transcript: list,
    resume_text: str,
    jd_text: str,
    topics: str,
    duration: int,
    difficulty: str,
    elapsed_minutes: float,
) -> dict:
    """Generate the next interviewer response based on the conversation so far."""

    # Build conversation messages for Claude
    messages = []
    for entry in transcript:
        if entry["role"] == "interviewer":
            messages.append({"role": "assistant", "content": entry["content"]})
        else:
            messages.append({"role": "user", "content": entry["content"]})

    time_remaining = duration - elapsed_minutes
    should_wrap_up = time_remaining <= 3

    context_note = f"""[CONTEXT FOR INTERVIEWER - NOT TO BE SPOKEN:
- Resume summary: {resume_text[:300]}
- JD summary: {jd_text[:300]}
- Topics to cover: {topics}
- Difficulty: {difficulty}
- Time remaining: {time_remaining:.0f} minutes out of {duration}
- {"WRAP UP the interview now — thank the candidate and end." if should_wrap_up else "Continue with the next question or follow-up."}]"""

    messages.append({"role": "user", "content": context_note})

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=INTERVIEWER_SYSTEM_PROMPT,
        messages=messages,
    )

    response_text = message.content[0].text
    is_complete = should_wrap_up or any(
        phrase in response_text.lower()
        for phrase in ["thank you for your time", "that concludes", "end of the interview", "wraps up our interview"]
    )

    return {"content": response_text, "is_complete": is_complete}


async def generate_feedback_report(
    transcript: list,
    resume_text: str,
    jd_text: str,
    topics: str,
    difficulty: str,
    eye_tracking: dict = None,
) -> dict:
    """Generate comprehensive post-interview feedback."""

    eye_tracking_section = ""
    if eye_tracking:
        eye_tracking_section = f"""
## Eye Tracking Data:
- Total look-away events: {eye_tracking.get('total_look_aways', 0)}
- Reading pattern detections (possible screen reading): {eye_tracking.get('reading_patterns_detected', 0)}
- Total suspicious events: {eye_tracking.get('suspicious_events_count', 0)}

If reading_patterns_detected > 0, this strongly suggests the candidate was reading answers from their screen. Flag this clearly in the eye_tracking_notes field. Be direct — this is a serious integrity concern in a real interview.
If the numbers are 0 or very low, note positively that the candidate maintained good eye contact."""

    prompt = f"""You are an expert interview coach analyzing a completed mock interview. Generate a comprehensive feedback report.

## Interview Transcript:
{json.dumps(transcript)}

## Context:
- Resume: {resume_text[:500]}
- JD: {jd_text[:500]}
- Topics covered: {topics}
- Difficulty level: {difficulty}
{eye_tracking_section}

Analyze the candidate's performance and provide feedback in this exact JSON format:
{{
  "answer_quality": "Detailed assessment of accuracy, depth, and relevance of answers. Cite specific examples from the transcript.",
  "answer_structure": "Assessment of how well-structured the answers were. Did they use STAR for behavioral? Were technical answers organized logically?",
  "communication": "Assessment of clarity, conciseness, and professional communication. Note any patterns like excessive hedging, rambling, or strong articulation.",
  "eye_tracking_notes": "Assessment of eye contact and camera behavior. If reading patterns were detected, flag it clearly as a potential integrity issue. If clean, note good eye contact.",
  "areas_to_improve": ["Specific actionable improvement 1 with example", "Specific actionable improvement 2 with example", "Specific actionable improvement 3 with example"],
  "overall_rating": "Overall assessment: Needs Work / Developing / Solid / Strong / Exceptional — with a 1-2 sentence justification.",
  "question_by_question": [
    {{
      "question": "The question that was asked",
      "assessment": "What was good and what could be improved",
      "score": 7
    }}
  ]
}}

Return ONLY valid JSON."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    return extract_json(message.content[0].text)
