"""Unit tests for app.services.quiz_service."""

from __future__ import annotations

import json
from unittest.mock import patch

import pytest

from app.services.quiz_service import generate_quiz_questions, evaluate_quiz_answers


class TestGenerateQuizQuestions:
    @patch("app.services.quiz_service._call_claude_json")
    async def test_returns_question_list(self, mock_json, sample_quiz_questions):
        mock_json.return_value = sample_quiz_questions

        result = await generate_quiz_questions(
            resume_text="resume",
            jd_text="jd",
            company_name="Google",
            round_description="technical",
            prep_sources={},
            topics="REST APIs",
            num_questions=3,
        )

        assert isinstance(result, list)
        assert len(result) == 3
        assert all("id" in q and "question" in q for q in result)

    @patch("app.services.quiz_service._call_claude_json")
    async def test_uses_explicit_topics_when_provided(self, mock_json, sample_quiz_questions):
        mock_json.return_value = sample_quiz_questions

        await generate_quiz_questions(
            resume_text="resume",
            jd_text="jd",
            company_name="Google",
            round_description="technical",
            prep_sources={},
            topics="Distributed Systems",
            num_questions=3,
        )

        prompt = mock_json.call_args[1]["messages"][0]["content"]
        assert "Distributed Systems" in prompt

    @patch("app.services.quiz_service._call_claude_json")
    async def test_falls_back_to_jd_when_no_topics(self, mock_json, sample_quiz_questions):
        mock_json.return_value = sample_quiz_questions

        await generate_quiz_questions(
            resume_text="resume",
            jd_text="Looking for Python experience",
            company_name="Google",
            round_description="technical",
            prep_sources={},
            topics="",
            num_questions=3,
        )

        prompt = mock_json.call_args[1]["messages"][0]["content"]
        assert "Looking for Python experience" in prompt

    @patch("app.services.quiz_service._call_claude_json")
    async def test_whitespace_only_topics_treated_as_empty(self, mock_json, sample_quiz_questions):
        mock_json.return_value = sample_quiz_questions

        await generate_quiz_questions(
            resume_text="resume",
            jd_text="Python developer needed",
            company_name="Google",
            round_description="technical",
            prep_sources={},
            topics="   ",
            num_questions=3,
        )

        prompt = mock_json.call_args[1]["messages"][0]["content"]
        assert "Python developer needed" in prompt

    @patch("app.services.quiz_service._call_claude_json")
    async def test_num_questions_in_prompt(self, mock_json, sample_quiz_questions):
        mock_json.return_value = sample_quiz_questions

        await generate_quiz_questions(
            resume_text="resume",
            jd_text="jd",
            company_name="Google",
            round_description="technical",
            prep_sources={},
            topics="Python",
            num_questions=15,
        )

        prompt = mock_json.call_args[1]["messages"][0]["content"]
        assert "15" in prompt


class TestEvaluateQuizAnswers:
    @patch("app.services.quiz_service._call_claude_json")
    async def test_returns_feedback_structure(self, mock_json, sample_quiz_feedback):
        mock_json.return_value = sample_quiz_feedback

        result = await evaluate_quiz_answers(
            questions=[{"id": 1, "question": "What is REST?"}],
            answers=[{"question_id": 1, "answer": "REST is an API style"}],
            resume_text="resume",
            jd_text="jd",
            round_description="technical",
        )

        assert "per_question" in result
        assert "overall_summary" in result
        assert "strong_areas" in result
        assert "gaps" in result
        assert "topics_to_revisit" in result

    @patch("app.services.quiz_service._call_claude_json")
    async def test_per_question_has_required_fields(self, mock_json, sample_quiz_feedback):
        mock_json.return_value = sample_quiz_feedback

        result = await evaluate_quiz_answers(
            questions=[{"id": 1, "question": "What is REST?"}],
            answers=[{"question_id": 1, "answer": "REST is an API style"}],
            resume_text="resume",
            jd_text="jd",
            round_description="technical",
        )

        pq = result["per_question"][0]
        assert "question_id" in pq
        assert "feedback" in pq
        assert "ideal_answer" in pq
        assert "score" in pq
        assert isinstance(pq["score"], int)

    @patch("app.services.quiz_service._call_claude_json")
    async def test_passes_questions_and_answers_to_prompt(self, mock_json, sample_quiz_feedback):
        mock_json.return_value = sample_quiz_feedback

        questions = [{"id": 1, "question": "What is REST?"}]
        answers = [{"question_id": 1, "answer": "An architectural style"}]

        await evaluate_quiz_answers(
            questions=questions,
            answers=answers,
            resume_text="resume",
            jd_text="jd",
            round_description="technical",
        )

        prompt = mock_json.call_args[1]["messages"][0]["content"]
        assert "What is REST?" in prompt
        assert "An architectural style" in prompt
