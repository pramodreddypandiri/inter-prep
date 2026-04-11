"""AI service for elevator pitch generation and analysis.

Elevator pitch evaluation criteria (research-based):
  An effective elevator pitch covers 7 dimensions (total 100 pts):
    1. Opening Hook         (0-15): Grabs attention in first 5-10 seconds
    2. Identity Clarity     (0-15): Clear who-you-are statement
    3. Value Proposition    (0-20): What skills/expertise you bring
    4. Unique Differentiator(0-20): What sets you apart from other candidates
    5. Role Fit             (0-15): Tailored to target role/company
    6. Call to Action       (0-10): Clear next step or ask
    7. Delivery             (0-5):  Timing (<=60s), fluency, minimal fillers
"""

from __future__ import annotations

from app.services.ai_service import _call_claude, _call_claude_json, _cap
from app.utils.prompt_guard import sanitize, wrap, SYSTEM_GUARD


async def generate_pitch_text(
    target_role: str,
    company_name: str,
    resume_text: str,
    key_strengths: str,
) -> str:
    """Generate a 45-60 second elevator pitch tailored to the role and candidate."""

    company_section = f"## Target Company:\n{wrap('company', sanitize(company_name, 200))}\n\n" if company_name.strip() else ""
    strengths_section = f"## Key Strengths to Highlight:\n{wrap('strengths', sanitize(key_strengths, 2000))}\n\n" if key_strengths.strip() else ""

    prompt = f"""{SYSTEM_GUARD}

You are an expert career coach. Write a compelling 45-60 second elevator pitch for a job seeker.

## Target Role:
{wrap("target_role", sanitize(target_role, 200))}

{company_section}## Resume / Background:
{wrap("resume", sanitize(resume_text)) if resume_text.strip() else "No resume provided — write a generic but strong pitch structure."}

{strengths_section}## Elevator Pitch Requirements:
- **Duration**: Designed to be spoken in 45-60 seconds (~120-150 words)
- **Structure**: Opening hook → Who you are + background → Core value proposition → Unique differentiator → Fit for role → Clear ask/CTA
- **Tone**: Confident, conversational, authentic — not stiff or over-rehearsed
- **Opening**: Start with a strong hook (not "Hi, my name is..."). Lead with impact: a result, a problem you solve, or a compelling statement.
- **Tailored**: Specifically written for the target role{f' at {company_name}' if company_name.strip() else ''}
- **End**: Close with a clear, natural call-to-action

Return ONLY the pitch text — no labels, headings, or commentary. Write it as the candidate would actually speak it."""

    return _call_claude(
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )


async def analyze_pitch_recording(
    transcript: str,
    pitch_text: str,
    duration_seconds: int,
    resume_text: str,
    target_role: str,
    company_name: str,
) -> dict:
    """Analyze a recorded elevator pitch and return a structured score + feedback.

    Scoring dimensions:
      opening_hook (0-15), identity_clarity (0-15), value_proposition (0-20),
      unique_differentiator (0-20), role_fit (0-15), call_to_action (0-10),
      delivery (0-5). Total: 100.
    """

    timing_comment = ""
    if duration_seconds > 0:
        if duration_seconds <= 60:
            timing_comment = f"The candidate delivered the pitch in {duration_seconds} seconds — within the 60-second target."
        else:
            over = duration_seconds - 60
            timing_comment = f"The candidate went {over} seconds over the 60-second limit ({duration_seconds}s total). Penalize delivery."

    company_ctx = f" at {company_name}" if company_name.strip() else ""
    # pitch_text is AI-generated (trusted); transcript is live speech (user-controlled).
    pitch_ref = f"\n\n## Prepared Pitch Text (what they planned to say):\n{_cap(pitch_text, 5000)}" if pitch_text.strip() else ""

    prompt = f"""{SYSTEM_GUARD}

You are an expert career coach evaluating an elevator pitch recording.

## Target Role:
{wrap("target_role", sanitize(target_role, 200))}{company_ctx}

## Candidate Resume / Background:
{wrap("resume", sanitize(resume_text, 3000)) if resume_text.strip() else "Not provided."}
{pitch_ref}

## Spoken Transcript (what they actually said):
{wrap("spoken_transcript", sanitize(transcript, 5000)) if transcript.strip() else "No transcript available — evaluate based on prepared pitch text only."}

## Timing:
{timing_comment if timing_comment else "Duration not recorded."}

## Scoring Rubric:
Evaluate the pitch on these 7 dimensions. Score each based on the SPOKEN transcript (not the prepared text):

1. **opening_hook** (0-15): Does the opening grab attention immediately? Is it compelling and non-generic?
2. **identity_clarity** (0-15): Is the candidate's professional identity clearly communicated?
3. **value_proposition** (0-20): Does it clearly articulate what value and skills the candidate brings?
4. **unique_differentiator** (0-20): What makes this candidate stand out vs others? Is a differentiator communicated?
5. **role_fit** (0-15): Is the pitch specifically tailored to the target role{company_ctx}? Does it speak to what the role needs?
6. **call_to_action** (0-10): Does it end with a clear, natural next step or ask?
7. **delivery** (0-5): Was timing appropriate (<=60s)? Was speech fluent with minimal fillers? Was tone confident?

Respond in this exact JSON format:
{{
  "overall_score": <sum of all dimensions 0-100>,
  "dimensions": {{
    "opening_hook": <0-15>,
    "identity_clarity": <0-15>,
    "value_proposition": <0-20>,
    "unique_differentiator": <0-20>,
    "role_fit": <0-15>,
    "call_to_action": <0-10>,
    "delivery": <0-5>
  }},
  "strengths": ["Specific strength 1 with example from transcript", "Specific strength 2", "Specific strength 3"],
  "improvements": ["Specific improvement 1 with example", "Specific improvement 2", "Specific improvement 3"],
  "tailored_suggestions": ["Suggestion specific to {_cap(target_role, 100)} role and their background", "Another role-specific suggestion"],
  "timing_note": "Brief note on timing and delivery pace"
}}

Return ONLY valid JSON."""

    return _call_claude_json(
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
