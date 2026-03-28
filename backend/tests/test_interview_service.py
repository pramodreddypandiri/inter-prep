"""Unit tests for app.services.interview_service."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app.services.interview_service import (
    generate_first_question,
    generate_interviewer_response,
    generate_feedback_report,
    INTERVIEWER_SYSTEM_PROMPT,
)


class TestGenerateFirstQuestion:
    @patch("app.services.interview_service._call_claude")
    async def test_returns_opening_string(self, mock_claude):
        mock_claude.return_value = "Welcome! I'm your interviewer today. Let's start with system design."

        result = await generate_first_question(
            resume_text="resume",
            jd_text="jd",
            company_name="Google",
            round_description="technical",
            prep_sources={},
            topics="System Design",
            duration=30,
            difficulty="senior",
        )

        assert isinstance(result, str)
        assert len(result) > 0

    @patch("app.services.interview_service._call_claude")
    async def test_uses_system_prompt(self, mock_claude):
        mock_claude.return_value = "Welcome!"

        await generate_first_question(
            resume_text="resume",
            jd_text="jd",
            company_name="Google",
            round_description="technical",
            prep_sources={},
            topics="Python",
            duration=30,
            difficulty="intermediate",
        )

        call_kwargs = mock_claude.call_args[1]
        assert call_kwargs["system"] == INTERVIEWER_SYSTEM_PROMPT

    @patch("app.services.interview_service._call_claude")
    async def test_includes_difficulty_and_duration(self, mock_claude):
        mock_claude.return_value = "Welcome!"

        await generate_first_question(
            resume_text="resume",
            jd_text="jd",
            company_name="Google",
            round_description="technical",
            prep_sources={},
            topics="Python",
            duration=45,
            difficulty="staff",
        )

        prompt = mock_claude.call_args[1]["messages"][0]["content"]
        assert "45" in prompt
        assert "staff" in prompt


class TestGenerateInterviewerResponse:
    @patch("app.services.interview_service._call_claude")
    async def test_returns_response_dict(self, mock_claude, sample_transcript):
        mock_claude.return_value = "Good answer. Now tell me about microservices."

        result = await generate_interviewer_response(
            transcript=sample_transcript,
            resume_text="resume",
            jd_text="jd",
            topics="System Design",
            duration=30,
            difficulty="senior",
            elapsed_minutes=5.0,
        )

        assert "content" in result
        assert "is_complete" in result
        assert isinstance(result["content"], str)
        assert isinstance(result["is_complete"], bool)

    @patch("app.services.interview_service._call_claude")
    async def test_not_complete_mid_interview(self, mock_claude, sample_transcript):
        mock_claude.return_value = "Interesting. Can you elaborate on caching strategies?"

        result = await generate_interviewer_response(
            transcript=sample_transcript,
            resume_text="resume",
            jd_text="jd",
            topics="System Design",
            duration=30,
            difficulty="senior",
            elapsed_minutes=10.0,
        )

        assert result["is_complete"] is False

    @patch("app.services.interview_service._call_claude")
    async def test_complete_when_wrapping_up(self, mock_claude, sample_transcript):
        mock_claude.return_value = "Thank you for your time, that concludes our interview."

        result = await generate_interviewer_response(
            transcript=sample_transcript,
            resume_text="resume",
            jd_text="jd",
            topics="System Design",
            duration=30,
            difficulty="senior",
            elapsed_minutes=28.0,  # 2 minutes left, should wrap up
        )

        assert result["is_complete"] is True

    @patch("app.services.interview_service._call_claude")
    async def test_complete_detected_by_phrase(self, mock_claude, sample_transcript):
        mock_claude.return_value = "Thank you for your time today. I think we covered everything."

        result = await generate_interviewer_response(
            transcript=sample_transcript,
            resume_text="resume",
            jd_text="jd",
            topics="System Design",
            duration=60,
            difficulty="senior",
            elapsed_minutes=10.0,  # Not near end, but phrase detected
        )

        assert result["is_complete"] is True

    @patch("app.services.interview_service._call_claude")
    async def test_transcript_roles_mapped_correctly(self, mock_claude):
        mock_claude.return_value = "Next question."

        transcript = [
            {"role": "interviewer", "content": "Question 1"},
            {"role": "candidate", "content": "Answer 1"},
            {"role": "interviewer", "content": "Question 2"},
            {"role": "candidate", "content": "Answer 2"},
        ]

        await generate_interviewer_response(
            transcript=transcript,
            resume_text="resume",
            jd_text="jd",
            topics="Python",
            duration=30,
            difficulty="senior",
            elapsed_minutes=5.0,
        )

        messages = mock_claude.call_args[1]["messages"]
        # Interviewer messages → "assistant", candidate messages → "user"
        assert messages[0]["role"] == "assistant"
        assert messages[1]["role"] == "user"
        assert messages[2]["role"] == "assistant"
        assert messages[3]["role"] == "user"
        # Last message is the context note
        assert messages[4]["role"] == "user"
        assert "CONTEXT FOR INTERVIEWER" in messages[4]["content"]


class TestGenerateFeedbackReport:
    @patch("app.services.interview_service._call_claude_json")
    async def test_returns_feedback_structure(self, mock_json, sample_feedback_report, sample_transcript):
        mock_json.return_value = sample_feedback_report

        result = await generate_feedback_report(
            transcript=sample_transcript,
            resume_text="resume",
            jd_text="jd",
            topics="System Design",
            difficulty="senior",
        )

        assert "answer_quality" in result
        assert "answer_structure" in result
        assert "communication" in result
        assert "eye_tracking_notes" in result
        assert "areas_to_improve" in result
        assert "overall_rating" in result
        assert "question_by_question" in result

    @patch("app.services.interview_service._call_claude_json")
    async def test_includes_eye_tracking_when_provided(self, mock_json, sample_feedback_report, sample_transcript):
        mock_json.return_value = sample_feedback_report

        eye_tracking = {
            "total_look_aways": 5,
            "reading_patterns_detected": 2,
            "suspicious_events_count": 3,
        }

        await generate_feedback_report(
            transcript=sample_transcript,
            resume_text="resume",
            jd_text="jd",
            topics="System Design",
            difficulty="senior",
            eye_tracking=eye_tracking,
        )

        prompt = mock_json.call_args[1]["messages"][0]["content"]
        assert "5" in prompt  # total_look_aways
        assert "2" in prompt  # reading_patterns_detected
        assert "3" in prompt  # suspicious_events_count

    @patch("app.services.interview_service._call_claude_json")
    async def test_no_eye_tracking_section_when_none(self, mock_json, sample_feedback_report, sample_transcript):
        mock_json.return_value = sample_feedback_report

        await generate_feedback_report(
            transcript=sample_transcript,
            resume_text="resume",
            jd_text="jd",
            topics="System Design",
            difficulty="senior",
            eye_tracking=None,
        )

        prompt = mock_json.call_args[1]["messages"][0]["content"]
        assert "Eye Tracking Data" not in prompt

    @patch("app.services.interview_service._call_claude_json")
    async def test_question_by_question_has_scores(self, mock_json, sample_feedback_report, sample_transcript):
        mock_json.return_value = sample_feedback_report

        result = await generate_feedback_report(
            transcript=sample_transcript,
            resume_text="resume",
            jd_text="jd",
            topics="System Design",
            difficulty="senior",
        )

        for entry in result["question_by_question"]:
            assert "question" in entry
            assert "assessment" in entry
            assert "score" in entry
            assert isinstance(entry["score"], int)
