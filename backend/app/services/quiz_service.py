import json

from app.services.ai_service import _call_claude_json, _cap


async def generate_quiz_questions(
    resume_text: str,
    jd_text: str,
    company_name: str,
    round_description: str,
    prep_sources: dict,
    topics: str,
    num_questions: int,
) -> list:
    """Generate open-ended quiz questions based on session context and optional topics."""

    if topics.strip():
        topics_source = topics
    else:
        # Extract topics from JD and round description
        topics_source = f"Topics extracted from JD: {_cap(jd_text, 300)}\nRound: {_cap(round_description, 300)}"

    prompt = f"""You are a technical interviewer generating short, focused quiz questions to test a candidate's understanding of core concepts.

## Topics to quiz on:
{_cap(topics_source, 2000)}

Generate exactly {num_questions} short, direct technical questions. Follow these rules strictly:

1. Questions must be SHORT — one sentence, max two. Like a flashcard.
2. Questions must test CONCEPTS, not company-specific knowledge.
3. Expect CONCISE answers — 2-4 sentences, not essays.
4. Focus purely on technical understanding of the topic.
5. Progress from basics to deeper understanding within each topic.
6. Do NOT ask behavioral, situational, or STAR-format questions.
7. Do NOT reference the company, JD, or candidate's resume.

Example for topic "REST APIs":
- "What is a REST API and why use REST over other styles?"
- "How does a REST API handle statelessness?"
- "How do you secure a REST API?"
- "What are key design considerations for a REST API?"

Each question object must have: "id" (integer starting at 1), "question" (the question text).

Respond with a JSON array of {num_questions} question objects. Return ONLY valid JSON."""

    return _call_claude_json(max_tokens=4096, messages=[{"role": "user", "content": prompt}])


async def evaluate_quiz_answers(
    questions: list,
    answers: list,
    resume_text: str,
    jd_text: str,
    round_description: str,
) -> dict:
    """Evaluate all quiz answers and generate comprehensive feedback."""

    prompt = f"""You are a technical interviewer evaluating concise answers to concept-focused questions.

## Questions and Answers:
{json.dumps([{"question": q, "answer": a} for q, a in zip(questions, answers)])}

Evaluate each answer for:
- Technical accuracy — is the core concept correct?
- Completeness — did they cover the key points in a concise way?
- Clarity — is the explanation clear and to the point?
- Score each answer 1-10

Keep feedback short and actionable — 1-2 sentences per question.
The "ideal_answer" should be a concise model answer (3-5 sentences max), not an essay.

Respond in this exact JSON format:
{{
  "per_question": [
    {{
      "question_id": 1,
      "feedback": "Short feedback — what was right, what was missing",
      "ideal_answer": "Concise model answer covering the key points",
      "score": 7
    }}
  ],
  "overall_summary": "1-2 sentence summary of overall understanding",
  "strong_areas": ["concept1", "concept2"],
  "gaps": ["concept1", "concept2"],
  "topics_to_revisit": ["topic1", "topic2"]
}}

Return ONLY valid JSON."""

    return _call_claude_json(max_tokens=4096, messages=[{"role": "user", "content": prompt}])
