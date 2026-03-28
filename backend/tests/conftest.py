"""Shared fixtures for all backend tests."""

from __future__ import annotations

import os
from unittest.mock import MagicMock, AsyncMock, patch

import pytest

# Set env vars BEFORE any app imports so config module reads them
os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "fake-service-key")
os.environ.setdefault("ANTHROPIC_API_KEY", "fake-anthropic-key")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")


# ── Sample data fixtures ────────────────────────────────────────────

@pytest.fixture
def sample_session():
    return {
        "id": "session-001",
        "user_id": "user-001",
        "name": "Google SWE Interview",
        "company_name": "Google",
        "jd_text": "We are looking for a Senior Software Engineer...",
        "resume_text": "Experienced software engineer with 5 years...",
        "round_description": "Technical phone screen with coding",
        "created_at": "2025-01-01T00:00:00Z",
    }


@pytest.fixture
def sample_prep_sources_content():
    return {
        "company_snapshot": "Google is a multinational technology company...",
        "interview_process": "The interview consists of 5 rounds...",
        "technical_topics": "## Data Structures\n- Arrays\n- Trees...",
        "preparation_checklist": "1. Review system design\n2. Practice coding...",
        "resource_links": "## Documentation\n- [Python Docs](https://docs.python.org)...",
    }


@pytest.fixture
def sample_quiz_questions():
    return [
        {"id": 1, "question": "What is a REST API and why use REST over other styles?"},
        {"id": 2, "question": "How does a REST API handle statelessness?"},
        {"id": 3, "question": "How do you secure a REST API?"},
    ]


@pytest.fixture
def sample_quiz_feedback():
    return {
        "per_question": [
            {
                "question_id": 1,
                "feedback": "Good explanation of REST principles.",
                "ideal_answer": "REST is an architectural style...",
                "score": 8,
            }
        ],
        "overall_summary": "Strong understanding of REST concepts.",
        "strong_areas": ["REST fundamentals", "HTTP methods"],
        "gaps": ["caching strategies"],
        "topics_to_revisit": ["HTTP caching", "HATEOAS"],
    }


@pytest.fixture
def sample_feedback_report():
    return {
        "answer_quality": "Candidate showed solid technical knowledge.",
        "answer_structure": "Answers were well-organized with clear structure.",
        "communication": "Clear and concise communication style.",
        "eye_tracking_notes": "Good eye contact maintained throughout.",
        "areas_to_improve": [
            "Provide more specific examples",
            "Discuss trade-offs more",
            "Mention real-world experience",
        ],
        "overall_rating": "Strong — demonstrated solid technical depth.",
        "question_by_question": [
            {
                "question": "Tell me about system design",
                "assessment": "Good high-level overview",
                "score": 7,
            }
        ],
    }


@pytest.fixture
def sample_transcript():
    return [
        {"role": "interviewer", "content": "Welcome! Tell me about yourself.", "timestamp": "2025-01-01T00:00:00"},
        {"role": "candidate", "content": "I'm a software engineer with 5 years...", "timestamp": "2025-01-01T00:01:00"},
        {"role": "interviewer", "content": "Great. Let's discuss system design.", "timestamp": "2025-01-01T00:02:00"},
    ]


# ── Mock Supabase client ────────────────────────────────────────────

def _make_chainable_mock():
    """Create a mock that supports Supabase's fluent query builder pattern."""
    mock = MagicMock()
    # Each builder method returns itself so chaining works
    for method in ("select", "insert", "update", "delete", "eq", "single", "order", "limit"):
        getattr(mock, method).return_value = mock
    mock.execute.return_value = MagicMock(data=[])
    return mock


@pytest.fixture
def mock_supabase():
    """Provide a mocked Supabase client and patch get_supabase to return it."""
    db = MagicMock()
    db.table.return_value = _make_chainable_mock()
    db.auth = MagicMock()
    db.storage = MagicMock()
    with patch("app.database.get_supabase", return_value=db):
        yield db
