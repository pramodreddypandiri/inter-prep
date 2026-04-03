"""Unit tests for app.services.elevator_pitch_service."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app.services.elevator_pitch_service import (
    analyze_pitch_recording,
    generate_pitch_text,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def sample_pitch_text():
    return (
        "Imagine cutting deployment time by 80%. That's what I achieved at my last company. "
        "I'm a senior backend engineer with 6 years building distributed systems at scale. "
        "I've led teams of 8, shipped features used by millions, and I'm passionate about "
        "developer tooling. What makes me different is my focus on both technical excellence "
        "and business outcomes — I don't just write code, I ship products. "
        "I'm excited about this role at Stripe and would love to talk about how I can help "
        "scale your payments infrastructure."
    )


@pytest.fixture
def sample_feedback():
    return {
        "overall_score": 78,
        "dimensions": {
            "opening_hook": 12,
            "identity_clarity": 13,
            "value_proposition": 16,
            "unique_differentiator": 15,
            "role_fit": 12,
            "call_to_action": 7,
            "delivery": 3,
        },
        "strengths": [
            "Strong opening hook with a concrete metric",
            "Clear professional identity",
            "Good mention of team leadership",
        ],
        "improvements": [
            "Call to action could be more specific",
            "Mention specific Stripe products to improve role fit",
        ],
        "tailored_suggestions": [
            "Reference Stripe's payments API challenges in your pitch",
            "Highlight experience with financial data systems",
        ],
        "timing_note": "Delivered in 54 seconds — comfortably within the 60-second target.",
    }


# ── generate_pitch_text ───────────────────────────────────────────────────────


class TestGeneratePitchText:
    @patch("app.services.elevator_pitch_service._call_claude")
    async def test_returns_string(self, mock_claude, sample_pitch_text):
        mock_claude.return_value = sample_pitch_text

        result = await generate_pitch_text(
            target_role="Senior Backend Engineer",
            company_name="Stripe",
            resume_text="6 years experience...",
            key_strengths="distributed systems, team lead",
        )

        assert isinstance(result, str)
        assert len(result) > 0

    @patch("app.services.elevator_pitch_service._call_claude")
    async def test_target_role_in_prompt(self, mock_claude, sample_pitch_text):
        mock_claude.return_value = sample_pitch_text

        await generate_pitch_text(
            target_role="Staff Machine Learning Engineer",
            company_name="",
            resume_text="",
            key_strengths="",
        )

        prompt = mock_claude.call_args[1]["messages"][0]["content"]
        assert "Staff Machine Learning Engineer" in prompt

    @patch("app.services.elevator_pitch_service._call_claude")
    async def test_company_name_in_prompt_when_provided(self, mock_claude, sample_pitch_text):
        mock_claude.return_value = sample_pitch_text

        await generate_pitch_text(
            target_role="SWE",
            company_name="Google",
            resume_text="",
            key_strengths="",
        )

        prompt = mock_claude.call_args[1]["messages"][0]["content"]
        assert "Google" in prompt

    @patch("app.services.elevator_pitch_service._call_claude")
    async def test_empty_company_omitted_from_prompt(self, mock_claude, sample_pitch_text):
        mock_claude.return_value = sample_pitch_text

        await generate_pitch_text(
            target_role="SWE",
            company_name="",
            resume_text="",
            key_strengths="",
        )

        prompt = mock_claude.call_args[1]["messages"][0]["content"]
        # Should not have a "Target Company:" section when empty
        assert "Target Company:" not in prompt

    @patch("app.services.elevator_pitch_service._call_claude")
    async def test_resume_text_in_prompt(self, mock_claude, sample_pitch_text):
        mock_claude.return_value = sample_pitch_text

        resume = "5 years at Amazon building microservices"
        await generate_pitch_text(
            target_role="SWE",
            company_name="",
            resume_text=resume,
            key_strengths="",
        )

        prompt = mock_claude.call_args[1]["messages"][0]["content"]
        assert resume in prompt

    @patch("app.services.elevator_pitch_service._call_claude")
    async def test_key_strengths_in_prompt(self, mock_claude, sample_pitch_text):
        mock_claude.return_value = sample_pitch_text

        await generate_pitch_text(
            target_role="SWE",
            company_name="",
            resume_text="",
            key_strengths="Rust expert, 3x performance improvements",
        )

        prompt = mock_claude.call_args[1]["messages"][0]["content"]
        assert "Rust expert" in prompt

    @patch("app.services.elevator_pitch_service._call_claude")
    async def test_empty_resume_shows_fallback(self, mock_claude, sample_pitch_text):
        mock_claude.return_value = sample_pitch_text

        await generate_pitch_text(
            target_role="SWE",
            company_name="",
            resume_text="",
            key_strengths="",
        )

        prompt = mock_claude.call_args[1]["messages"][0]["content"]
        assert "No resume provided" in prompt

    @patch("app.services.elevator_pitch_service._call_claude")
    async def test_whitespace_only_resume_shows_fallback(self, mock_claude, sample_pitch_text):
        mock_claude.return_value = sample_pitch_text

        await generate_pitch_text(
            target_role="SWE",
            company_name="",
            resume_text="   ",
            key_strengths="",
        )

        prompt = mock_claude.call_args[1]["messages"][0]["content"]
        assert "No resume provided" in prompt

    @patch("app.services.elevator_pitch_service._call_claude")
    async def test_prompt_mentions_duration_target(self, mock_claude, sample_pitch_text):
        mock_claude.return_value = sample_pitch_text

        await generate_pitch_text(
            target_role="PM",
            company_name="",
            resume_text="",
            key_strengths="",
        )

        prompt = mock_claude.call_args[1]["messages"][0]["content"]
        assert "60" in prompt

    @patch("app.services.elevator_pitch_service._call_claude")
    async def test_uses_correct_max_tokens(self, mock_claude, sample_pitch_text):
        mock_claude.return_value = sample_pitch_text

        await generate_pitch_text(
            target_role="SWE",
            company_name="",
            resume_text="",
            key_strengths="",
        )

        assert mock_claude.call_args[1]["max_tokens"] == 512


# ── analyze_pitch_recording ───────────────────────────────────────────────────


class TestAnalyzePitchRecording:
    @patch("app.services.elevator_pitch_service._call_claude_json")
    async def test_returns_feedback_dict(self, mock_json, sample_feedback):
        mock_json.return_value = sample_feedback

        result = await analyze_pitch_recording(
            transcript="I'm a senior engineer with 6 years...",
            pitch_text="Imagine cutting deployment time by 80%...",
            duration_seconds=54,
            resume_text="Senior SWE at Amazon",
            target_role="Senior Backend Engineer",
            company_name="Stripe",
        )

        assert isinstance(result, dict)

    @patch("app.services.elevator_pitch_service._call_claude_json")
    async def test_feedback_has_required_keys(self, mock_json, sample_feedback):
        mock_json.return_value = sample_feedback

        result = await analyze_pitch_recording(
            transcript="pitch here",
            pitch_text="prepared pitch",
            duration_seconds=50,
            resume_text="resume",
            target_role="SWE",
            company_name="",
        )

        assert "overall_score" in result
        assert "dimensions" in result
        assert "strengths" in result
        assert "improvements" in result
        assert "tailored_suggestions" in result
        assert "timing_note" in result

    @patch("app.services.elevator_pitch_service._call_claude_json")
    async def test_dimensions_has_all_fields(self, mock_json, sample_feedback):
        mock_json.return_value = sample_feedback

        result = await analyze_pitch_recording(
            transcript="transcript",
            pitch_text="pitch",
            duration_seconds=50,
            resume_text="resume",
            target_role="SWE",
            company_name="",
        )

        dims = result["dimensions"]
        assert "opening_hook" in dims
        assert "identity_clarity" in dims
        assert "value_proposition" in dims
        assert "unique_differentiator" in dims
        assert "role_fit" in dims
        assert "call_to_action" in dims
        assert "delivery" in dims

    @patch("app.services.elevator_pitch_service._call_claude_json")
    async def test_overall_score_is_numeric(self, mock_json, sample_feedback):
        mock_json.return_value = sample_feedback

        result = await analyze_pitch_recording(
            transcript="pitch",
            pitch_text="pitch",
            duration_seconds=45,
            resume_text="",
            target_role="SWE",
            company_name="",
        )

        assert isinstance(result["overall_score"], int)
        assert 0 <= result["overall_score"] <= 100

    @patch("app.services.elevator_pitch_service._call_claude_json")
    async def test_over_60s_penalizes_in_prompt(self, mock_json, sample_feedback):
        mock_json.return_value = sample_feedback

        await analyze_pitch_recording(
            transcript="pitch",
            pitch_text="",
            duration_seconds=80,  # over 60s
            resume_text="",
            target_role="SWE",
            company_name="",
        )

        prompt = mock_json.call_args[1]["messages"][0]["content"]
        assert "over" in prompt.lower() or "limit" in prompt.lower()

    @patch("app.services.elevator_pitch_service._call_claude_json")
    async def test_within_60s_noted_positively_in_prompt(self, mock_json, sample_feedback):
        mock_json.return_value = sample_feedback

        await analyze_pitch_recording(
            transcript="pitch",
            pitch_text="",
            duration_seconds=55,
            resume_text="",
            target_role="SWE",
            company_name="",
        )

        prompt = mock_json.call_args[1]["messages"][0]["content"]
        assert "55" in prompt

    @patch("app.services.elevator_pitch_service._call_claude_json")
    async def test_transcript_included_in_prompt(self, mock_json, sample_feedback):
        mock_json.return_value = sample_feedback

        transcript = "I led a team of ten engineers shipping a payments platform"
        await analyze_pitch_recording(
            transcript=transcript,
            pitch_text="",
            duration_seconds=50,
            resume_text="",
            target_role="SWE",
            company_name="",
        )

        prompt = mock_json.call_args[1]["messages"][0]["content"]
        assert transcript in prompt

    @patch("app.services.elevator_pitch_service._call_claude_json")
    async def test_empty_transcript_shows_fallback(self, mock_json, sample_feedback):
        mock_json.return_value = sample_feedback

        await analyze_pitch_recording(
            transcript="",
            pitch_text="prepared text",
            duration_seconds=0,
            resume_text="",
            target_role="SWE",
            company_name="",
        )

        prompt = mock_json.call_args[1]["messages"][0]["content"]
        assert "prepared pitch text only" in prompt.lower() or "No transcript" in prompt

    @patch("app.services.elevator_pitch_service._call_claude_json")
    async def test_company_name_in_prompt(self, mock_json, sample_feedback):
        mock_json.return_value = sample_feedback

        await analyze_pitch_recording(
            transcript="pitch",
            pitch_text="",
            duration_seconds=50,
            resume_text="",
            target_role="Engineer",
            company_name="Anthropic",
        )

        prompt = mock_json.call_args[1]["messages"][0]["content"]
        assert "Anthropic" in prompt

    @patch("app.services.elevator_pitch_service._call_claude_json")
    async def test_target_role_in_prompt(self, mock_json, sample_feedback):
        mock_json.return_value = sample_feedback

        await analyze_pitch_recording(
            transcript="pitch",
            pitch_text="",
            duration_seconds=50,
            resume_text="",
            target_role="Staff Data Scientist",
            company_name="",
        )

        prompt = mock_json.call_args[1]["messages"][0]["content"]
        assert "Staff Data Scientist" in prompt

    @patch("app.services.elevator_pitch_service._call_claude_json")
    async def test_resume_text_in_prompt(self, mock_json, sample_feedback):
        mock_json.return_value = sample_feedback

        await analyze_pitch_recording(
            transcript="pitch",
            pitch_text="",
            duration_seconds=50,
            resume_text="8 years at Meta building ads infrastructure",
            target_role="SWE",
            company_name="",
        )

        prompt = mock_json.call_args[1]["messages"][0]["content"]
        assert "Meta" in prompt

    @patch("app.services.elevator_pitch_service._call_claude_json")
    async def test_zero_duration_omits_timing_comment(self, mock_json, sample_feedback):
        mock_json.return_value = sample_feedback

        await analyze_pitch_recording(
            transcript="pitch",
            pitch_text="",
            duration_seconds=0,
            resume_text="",
            target_role="SWE",
            company_name="",
        )

        prompt = mock_json.call_args[1]["messages"][0]["content"]
        assert "Duration not recorded" in prompt
