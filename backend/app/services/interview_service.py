import json

from app.services.ai_service import _call_claude, _call_claude_json, _cap

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
{_cap(resume_text)}

## Job Description:
{_cap(jd_text)}

## Company: {_cap(company_name, 500)}
## Round Description: {_cap(round_description, 5000)}
## Focus Topics: {_cap(topics, 2000)}
## Duration: {duration} minutes
## Difficulty: {difficulty}

## Preparation Context:
{json.dumps(prep_sources)[:5000] if prep_sources else "No prep sources available."}

Start the interview. Briefly introduce yourself as the interviewer, mention the format, and ask your first question. Keep the introduction concise (2-3 sentences max before the question)."""

    return _call_claude(
        max_tokens=1024,
        system=INTERVIEWER_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )


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
- Resume summary: {_cap(resume_text, 300)}
- JD summary: {_cap(jd_text, 300)}
- Topics to cover: {_cap(topics, 500)}
- Difficulty: {difficulty}
- Time remaining: {time_remaining:.0f} minutes out of {duration}
- {"WRAP UP the interview now — thank the candidate and end." if should_wrap_up else "Continue with the next question or follow-up."}]"""

    messages.append({"role": "user", "content": context_note})

    response_text = _call_claude(
        max_tokens=1024,
        system=INTERVIEWER_SYSTEM_PROMPT,
        messages=messages,
    )

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
- Resume: {_cap(resume_text, 500)}
- JD: {_cap(jd_text, 500)}
- Topics covered: {_cap(topics, 500)}
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

    return _call_claude_json(max_tokens=4096, messages=[{"role": "user", "content": prompt}])
