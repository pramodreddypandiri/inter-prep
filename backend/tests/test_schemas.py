"""Contract / API schema tests for Pydantic models.

These tests ensure that:
1. Pydantic models accept valid data and reject invalid data
2. AI response shapes can be validated against expected contracts
3. Frontend ↔ Backend payload agreements hold
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models.schemas import (
    SessionCreate,
    SessionUpdate,
    SessionResponse,
    PrepSourceContent,
    PrepSourceResponse,
    ResumeUploadResponse,
)


# ── SessionCreate ───────────────────────────────────────────────────

class TestSessionCreateSchema:
    def test_valid_session(self):
        session = SessionCreate(
            name="Google SWE",
            company_name="Google",
            jd_text="Looking for a software engineer",
            resume_text="5 years of experience",
            round_description="Phone screen",
        )
        assert session.name == "Google SWE"

    def test_missing_required_field_raises(self):
        with pytest.raises(ValidationError):
            SessionCreate(
                name="Google SWE",
                company_name="Google",
                # missing jd_text, resume_text, round_description
            )

    def test_name_max_length(self):
        with pytest.raises(ValidationError):
            SessionCreate(
                name="x" * 201,
                company_name="Google",
                jd_text="jd",
                resume_text="resume",
                round_description="round",
            )

    def test_company_name_max_length(self):
        with pytest.raises(ValidationError):
            SessionCreate(
                name="test",
                company_name="x" * 201,
                jd_text="jd",
                resume_text="resume",
                round_description="round",
            )

    def test_jd_text_max_length(self):
        with pytest.raises(ValidationError):
            SessionCreate(
                name="test",
                company_name="Google",
                jd_text="x" * 50001,
                resume_text="resume",
                round_description="round",
            )

    def test_resume_text_max_length(self):
        with pytest.raises(ValidationError):
            SessionCreate(
                name="test",
                company_name="Google",
                jd_text="jd",
                resume_text="x" * 50001,
                round_description="round",
            )

    def test_round_description_max_length(self):
        with pytest.raises(ValidationError):
            SessionCreate(
                name="test",
                company_name="Google",
                jd_text="jd",
                resume_text="resume",
                round_description="x" * 5001,
            )

    def test_at_max_length_boundary(self):
        """Values at exactly max length should be valid."""
        session = SessionCreate(
            name="x" * 200,
            company_name="x" * 200,
            jd_text="x" * 50000,
            resume_text="x" * 50000,
            round_description="x" * 5000,
        )
        assert len(session.name) == 200


# ── SessionUpdate ───────────────────────────────────────────────────

class TestSessionUpdateSchema:
    def test_all_fields_optional(self):
        update = SessionUpdate()
        assert update.model_dump(exclude_unset=True) == {}

    def test_partial_update_only_includes_set_fields(self):
        update = SessionUpdate(name="New name")
        assert update.model_dump(exclude_unset=True) == {"name": "New name"}

    def test_multiple_fields(self):
        update = SessionUpdate(
            name="New name",
            jd_text="Updated JD",
            resume_text="Updated resume",
        )
        dumped = update.model_dump(exclude_unset=True)
        assert dumped == {
            "name": "New name",
            "jd_text": "Updated JD",
            "resume_text": "Updated resume",
        }

    def test_name_max_length(self):
        with pytest.raises(ValidationError):
            SessionUpdate(name="x" * 201)

    def test_company_name_max_length(self):
        with pytest.raises(ValidationError):
            SessionUpdate(company_name="x" * 201)

    def test_jd_text_max_length(self):
        with pytest.raises(ValidationError):
            SessionUpdate(jd_text="x" * 50001)

    def test_resume_text_max_length(self):
        with pytest.raises(ValidationError):
            SessionUpdate(resume_text="x" * 50001)

    def test_round_description_max_length(self):
        with pytest.raises(ValidationError):
            SessionUpdate(round_description="x" * 5001)

    def test_at_max_length_boundaries(self):
        update = SessionUpdate(
            name="x" * 200,
            company_name="x" * 200,
            jd_text="x" * 50000,
            resume_text="x" * 50000,
            round_description="x" * 5000,
        )
        assert len(update.name) == 200

    def test_unset_fields_excluded_from_dump(self):
        """exclude_unset is how the router distinguishes 'omitted' from 'set to None'."""
        update = SessionUpdate(name="foo")
        assert "company_name" not in update.model_dump(exclude_unset=True)
        assert "jd_text" not in update.model_dump(exclude_unset=True)


# ── SessionResponse ─────────────────────────────────────────────────

class TestSessionResponseSchema:
    def test_valid_response(self, sample_session):
        resp = SessionResponse(**sample_session)
        assert resp.id == "session-001"
        assert resp.user_id == "user-001"

    def test_missing_id_raises(self, sample_session):
        del sample_session["id"]
        with pytest.raises(ValidationError):
            SessionResponse(**sample_session)


# ── PrepSourceContent (the AI response contract) ───────────────────

class TestPrepSourceContentSchema:
    def test_valid_content(self, sample_prep_sources_content):
        content = PrepSourceContent(**sample_prep_sources_content)
        assert content.company_snapshot
        assert content.interview_process
        assert content.technical_topics
        assert content.preparation_checklist
        assert content.resource_links

    def test_missing_section_raises(self):
        with pytest.raises(ValidationError):
            PrepSourceContent(
                company_snapshot="test",
                interview_process="test",
                # missing technical_topics, preparation_checklist, resource_links
            )

    def test_all_five_sections_required(self):
        """Contract: Claude must return exactly these 5 keys."""
        required_fields = set(PrepSourceContent.model_fields.keys())
        assert required_fields == {
            "company_snapshot",
            "interview_process",
            "technical_topics",
            "preparation_checklist",
            "resource_links",
        }

    def test_sections_are_strings(self, sample_prep_sources_content):
        content = PrepSourceContent(**sample_prep_sources_content)
        for field in PrepSourceContent.model_fields:
            assert isinstance(getattr(content, field), str)


# ── PrepSourceResponse ──────────────────────────────────────────────

class TestPrepSourceResponseSchema:
    def test_valid_response(self, sample_prep_sources_content):
        resp = PrepSourceResponse(
            id="prep-001",
            session_id="session-001",
            content=sample_prep_sources_content,
            generated_at="2025-01-01T00:00:00Z",
        )
        assert resp.content.company_snapshot

    def test_nested_content_validated(self):
        with pytest.raises(ValidationError):
            PrepSourceResponse(
                id="prep-001",
                session_id="session-001",
                content={"company_snapshot": "test"},  # missing other sections
                generated_at="2025-01-01T00:00:00Z",
            )


# ── ResumeUploadResponse ───────────────────────────────────────────

class TestResumeUploadResponseSchema:
    def test_valid_response(self):
        resp = ResumeUploadResponse(text="John Doe, Software Engineer")
        assert resp.text == "John Doe, Software Engineer"
        assert resp.file_url is None

    def test_with_file_url(self):
        resp = ResumeUploadResponse(text="text", file_url="https://example.com/resume.pdf")
        assert resp.file_url == "https://example.com/resume.pdf"

    def test_missing_text_raises(self):
        with pytest.raises(ValidationError):
            ResumeUploadResponse()


# ── Quiz request/response schemas (from router) ────────────────────

class TestQuizSchemas:
    def test_quiz_create_defaults(self):
        from app.routers.quiz import QuizCreate
        q = QuizCreate()
        assert q.topics == ""
        assert q.num_questions == 10

    def test_quiz_create_custom(self):
        from app.routers.quiz import QuizCreate
        q = QuizCreate(topics="Python, Go", num_questions=20)
        assert q.topics == "Python, Go"
        assert q.num_questions == 20

    def test_quiz_create_num_questions_min(self):
        from app.routers.quiz import QuizCreate
        with pytest.raises(ValidationError):
            QuizCreate(num_questions=0)

    def test_quiz_create_num_questions_max(self):
        from app.routers.quiz import QuizCreate
        with pytest.raises(ValidationError):
            QuizCreate(num_questions=31)

    def test_quiz_answer_max_length(self):
        from app.routers.quiz import QuizAnswer
        with pytest.raises(ValidationError):
            QuizAnswer(question_id=1, answer="x" * 10001)

    def test_quiz_submit_structure(self):
        from app.routers.quiz import QuizSubmit, QuizAnswer
        submit = QuizSubmit(answers=[
            QuizAnswer(question_id=1, answer="REST is an architectural style"),
            QuizAnswer(question_id=2, answer="Statelessness means no session"),
        ])
        assert len(submit.answers) == 2


# ── Mock interview request schemas (from router) ───────────────────

class TestMockInterviewSchemas:
    def test_create_valid(self):
        from app.routers.mock_interview import MockInterviewCreate
        m = MockInterviewCreate(topics="System Design", duration=30, difficulty="senior")
        assert m.duration == 30
        assert m.difficulty == "senior"

    def test_duration_min(self):
        from app.routers.mock_interview import MockInterviewCreate
        with pytest.raises(ValidationError):
            MockInterviewCreate(topics="test", duration=4, difficulty="senior")

    def test_duration_max(self):
        from app.routers.mock_interview import MockInterviewCreate
        with pytest.raises(ValidationError):
            MockInterviewCreate(topics="test", duration=91, difficulty="senior")

    def test_candidate_message_max_length(self):
        from app.routers.mock_interview import CandidateMessage
        with pytest.raises(ValidationError):
            CandidateMessage(content="x" * 10001)

    def test_eye_tracking_stats_defaults(self):
        from app.routers.mock_interview import EyeTrackingStats
        stats = EyeTrackingStats()
        assert stats.totalLookAways == 0
        assert stats.readingPatterns == 0
        assert stats.suspiciousEvents == []

    def test_eye_tracking_stats_with_values(self):
        from app.routers.mock_interview import EyeTrackingStats
        stats = EyeTrackingStats(totalLookAways=5, readingPatterns=2, suspiciousEvents=[{"type": "tab_switch"}])
        assert stats.totalLookAways == 5

    def test_end_interview_optional_eye_tracking(self):
        from app.routers.mock_interview import EndInterviewRequest
        req = EndInterviewRequest()
        assert req.eye_tracking is None

    def test_end_interview_with_eye_tracking(self):
        from app.routers.mock_interview import EndInterviewRequest, EyeTrackingStats
        req = EndInterviewRequest(eye_tracking=EyeTrackingStats(totalLookAways=3))
        assert req.eye_tracking.totalLookAways == 3


# ── AI response contract tests ─────────────────────────────────────

class TestAIResponseContracts:
    """Validate that the shapes we expect from Claude match our Pydantic models.

    These tests verify the contract between what we tell Claude to return
    and what our code expects to parse.
    """

    def test_prep_sources_claude_response_matches_model(self):
        """Claude is told to return exactly these 5 keys."""
        claude_response = {
            "company_snapshot": "Google is...",
            "interview_process": "5 rounds...",
            "technical_topics": "## DS\n- arrays",
            "preparation_checklist": "1. study\n2. practice",
            "resource_links": "- [Docs](https://example.com)",
        }
        content = PrepSourceContent(**claude_response)
        assert content.company_snapshot == "Google is..."

    def test_quiz_questions_contract(self):
        """Claude returns [{"id": int, "question": str}]."""
        claude_response = [
            {"id": 1, "question": "What is REST?"},
            {"id": 2, "question": "Explain HTTP methods."},
        ]
        for q in claude_response:
            assert isinstance(q["id"], int)
            assert isinstance(q["question"], str)

    def test_quiz_feedback_contract(self):
        """Claude returns the feedback structure with per_question, strong_areas, etc."""
        claude_response = {
            "per_question": [
                {"question_id": 1, "feedback": "Good", "ideal_answer": "...", "score": 8}
            ],
            "overall_summary": "Strong",
            "strong_areas": ["REST"],
            "gaps": ["caching"],
            "topics_to_revisit": ["HTTP caching"],
        }
        assert isinstance(claude_response["per_question"], list)
        assert isinstance(claude_response["strong_areas"], list)
        assert isinstance(claude_response["gaps"], list)
        pq = claude_response["per_question"][0]
        assert 1 <= pq["score"] <= 10

    def test_feedback_report_contract(self):
        """Claude returns feedback report with specific keys."""
        claude_response = {
            "answer_quality": "Solid.",
            "answer_structure": "Well-organized.",
            "communication": "Clear.",
            "eye_tracking_notes": "Good eye contact.",
            "areas_to_improve": ["More examples", "Trade-offs"],
            "overall_rating": "Strong",
            "question_by_question": [
                {"question": "Q1?", "assessment": "Good", "score": 7}
            ],
        }
        required_keys = {
            "answer_quality", "answer_structure", "communication",
            "eye_tracking_notes", "areas_to_improve", "overall_rating",
            "question_by_question",
        }
        assert required_keys.issubset(claude_response.keys())
        assert isinstance(claude_response["areas_to_improve"], list)
        assert isinstance(claude_response["question_by_question"], list)
        for entry in claude_response["question_by_question"]:
            assert "question" in entry
            assert "assessment" in entry
            assert "score" in entry

    def test_interviewer_response_contract(self):
        """generate_interviewer_response returns {content: str, is_complete: bool}."""
        response = {"content": "Great answer. Next question...", "is_complete": False}
        assert isinstance(response["content"], str)
        assert isinstance(response["is_complete"], bool)

    def test_prep_section_keys_match_valid_sections(self):
        """Router's VALID_SECTIONS must match SECTION_DESCRIPTIONS keys."""
        from app.routers.prep_sources import VALID_SECTIONS
        from app.services.ai_service import SECTION_DESCRIPTIONS
        assert VALID_SECTIONS == set(SECTION_DESCRIPTIONS.keys())

    def test_prep_section_keys_match_model_fields(self):
        """PrepSourceContent fields must match SECTION_DESCRIPTIONS keys."""
        from app.services.ai_service import SECTION_DESCRIPTIONS
        model_fields = set(PrepSourceContent.model_fields.keys())
        assert model_fields == set(SECTION_DESCRIPTIONS.keys())
