"""Unit tests for app.services.ai_service."""

from __future__ import annotations

import json
from unittest.mock import patch, MagicMock

import anthropic
import pytest
from fastapi import HTTPException

from app.services.ai_service import (
    _cap,
    _call_claude,
    _call_claude_json,
    generate_prep_sources,
    regenerate_prep_section,
    parse_resume_text,
    SECTION_DESCRIPTIONS,
    MAX_TEXT_CHARS,
)


# ── _cap helper ─────────────────────────────────────────────────────

class TestCap:
    def test_short_text_unchanged(self):
        assert _cap("hello") == "hello"

    def test_exactly_at_limit(self):
        text = "a" * MAX_TEXT_CHARS
        assert _cap(text) == text

    def test_over_limit_truncated(self):
        text = "a" * (MAX_TEXT_CHARS + 100)
        result = _cap(text)
        assert len(result) == MAX_TEXT_CHARS

    def test_custom_limit(self):
        assert _cap("hello world", limit=5) == "hello"

    def test_empty_string(self):
        assert _cap("") == ""


# ── _call_claude ────────────────────────────────────────────────────

class TestCallClaude:
    """Test the central Claude API wrapper."""

    @patch("app.services.ai_service.client")
    def test_successful_call(self, mock_client):
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Hello from Claude")]
        mock_client.messages.create.return_value = mock_response

        result = _call_claude(messages=[{"role": "user", "content": "Hi"}])
        assert result == "Hello from Claude"

    @patch("app.services.ai_service.client")
    def test_passes_system_prompt(self, mock_client):
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="response")]
        mock_client.messages.create.return_value = mock_response

        _call_claude(
            messages=[{"role": "user", "content": "Hi"}],
            system="You are a helpful assistant",
        )

        call_kwargs = mock_client.messages.create.call_args
        assert call_kwargs.kwargs.get("system") or call_kwargs[1].get("system")

    @patch("app.services.ai_service.client")
    def test_rate_limit_error_raises_429(self, mock_client):
        mock_client.messages.create.side_effect = anthropic.RateLimitError(
            message="rate limited",
            response=MagicMock(status_code=429),
            body={"error": {"message": "rate limited"}},
        )

        with pytest.raises(HTTPException) as exc_info:
            _call_claude(messages=[{"role": "user", "content": "Hi"}])
        assert exc_info.value.status_code == 429

    @patch("app.services.ai_service.client")
    def test_connection_error_raises_502(self, mock_client):
        mock_client.messages.create.side_effect = anthropic.APIConnectionError(
            request=MagicMock()
        )

        with pytest.raises(HTTPException) as exc_info:
            _call_claude(messages=[{"role": "user", "content": "Hi"}])
        assert exc_info.value.status_code == 502

    @patch("app.services.ai_service.client")
    def test_internal_server_error_raises_502(self, mock_client):
        mock_client.messages.create.side_effect = anthropic.InternalServerError(
            message="internal error",
            response=MagicMock(status_code=500),
            body={"error": {"message": "internal error"}},
        )

        with pytest.raises(HTTPException) as exc_info:
            _call_claude(messages=[{"role": "user", "content": "Hi"}])
        assert exc_info.value.status_code == 502

    @patch("app.services.ai_service.client")
    def test_bad_request_error_raises_400(self, mock_client):
        mock_client.messages.create.side_effect = anthropic.BadRequestError(
            message="bad request",
            response=MagicMock(status_code=400),
            body={"error": {"message": "bad request"}},
        )

        with pytest.raises(HTTPException) as exc_info:
            _call_claude(messages=[{"role": "user", "content": "Hi"}])
        assert exc_info.value.status_code == 400

    @patch("app.services.ai_service.client")
    def test_unexpected_error_raises_500(self, mock_client):
        mock_client.messages.create.side_effect = RuntimeError("something broke")

        with pytest.raises(HTTPException) as exc_info:
            _call_claude(messages=[{"role": "user", "content": "Hi"}])
        assert exc_info.value.status_code == 500


# ── _call_claude_json ───────────────────────────────────────────────

class TestCallClaudeJson:
    """Test the JSON-parsing wrapper."""

    @patch("app.services.ai_service.client")
    def test_returns_parsed_json(self, mock_client):
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='{"key": "value"}')]
        mock_client.messages.create.return_value = mock_response

        result = _call_claude_json(messages=[{"role": "user", "content": "Hi"}])
        assert result == {"key": "value"}

    @patch("app.services.ai_service.client")
    def test_handles_fenced_json(self, mock_client):
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='```json\n{"key": "value"}\n```')]
        mock_client.messages.create.return_value = mock_response

        result = _call_claude_json(messages=[{"role": "user", "content": "Hi"}])
        assert result == {"key": "value"}

    @patch("app.services.ai_service.client")
    def test_invalid_json_raises_502(self, mock_client):
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="This is not JSON at all")]
        mock_client.messages.create.return_value = mock_response

        with pytest.raises(HTTPException) as exc_info:
            _call_claude_json(messages=[{"role": "user", "content": "Hi"}])
        assert exc_info.value.status_code == 502


# ── generate_prep_sources ──────────────────────────────────────────

class TestGeneratePrepSources:
    @patch("app.services.ai_service._call_claude_json")
    async def test_returns_all_sections(self, mock_json, sample_prep_sources_content):
        mock_json.return_value = sample_prep_sources_content

        result = await generate_prep_sources(
            resume_text="test resume",
            jd_text="test jd",
            company_name="Google",
            round_description="phone screen",
        )

        assert "company_snapshot" in result
        assert "interview_process" in result
        assert "technical_topics" in result
        assert "preparation_checklist" in result
        assert "resource_links" in result

    @patch("app.services.ai_service._call_claude_json")
    async def test_caps_long_inputs(self, mock_json, sample_prep_sources_content):
        mock_json.return_value = sample_prep_sources_content

        long_text = "a" * 50000
        await generate_prep_sources(
            resume_text=long_text,
            jd_text=long_text,
            company_name="a" * 1000,
            round_description="a" * 10000,
        )

        call_args = mock_json.call_args
        prompt = call_args[1]["messages"][0]["content"]
        # Prompt should not contain the full 50k characters
        assert len(prompt) < 120000


# ── regenerate_prep_section ─────────────────────────────────────────

class TestRegeneratePrepSection:
    @patch("app.services.ai_service._call_claude")
    async def test_returns_markdown_string(self, mock_claude):
        mock_claude.return_value = "## Updated Section\n- Point 1\n- Point 2"

        result = await regenerate_prep_section(
            section_key="company_snapshot",
            resume_text="resume",
            jd_text="jd",
            company_name="Google",
            round_description="phone screen",
        )

        assert isinstance(result, str)
        assert "Updated Section" in result

    @patch("app.services.ai_service._call_claude")
    async def test_uses_section_description(self, mock_claude):
        mock_claude.return_value = "content"

        await regenerate_prep_section(
            section_key="resource_links",
            resume_text="resume",
            jd_text="jd",
            company_name="Google",
            round_description="phone screen",
        )

        prompt = mock_claude.call_args[1]["messages"][0]["content"]
        assert "Resource Links" in prompt

    def test_section_descriptions_cover_all_keys(self):
        expected_keys = {"company_snapshot", "interview_process", "technical_topics", "preparation_checklist", "resource_links"}
        assert set(SECTION_DESCRIPTIONS.keys()) == expected_keys


# ── parse_resume_text ───────────────────────────────────────────────

class TestParseResumeText:
    async def test_txt_file_returns_decoded(self):
        content = b"John Doe\nSoftware Engineer"
        result = await parse_resume_text(content, "resume.txt")
        assert result == "John Doe\nSoftware Engineer"

    async def test_md_file_returns_decoded(self):
        content = b"# Resume\n## Experience"
        result = await parse_resume_text(content, "resume.md")
        assert result == "# Resume\n## Experience"

    @patch("app.services.ai_service._call_claude")
    async def test_pdf_uses_vision(self, mock_claude):
        mock_claude.return_value = "Extracted resume text"
        result = await parse_resume_text(b"fake-pdf-content", "resume.pdf")
        assert result == "Extracted resume text"

        # Verify the message uses document type for PDF
        call_args = mock_claude.call_args
        content_blocks = call_args[1]["messages"][0]["content"]
        assert content_blocks[0]["type"] == "document"
        assert content_blocks[0]["source"]["media_type"] == "application/pdf"

    @patch("app.services.ai_service._call_claude")
    async def test_image_uses_vision(self, mock_claude):
        mock_claude.return_value = "Extracted text from image"
        result = await parse_resume_text(b"fake-image-content", "resume.png")
        assert result == "Extracted text from image"

        call_args = mock_claude.call_args
        content_blocks = call_args[1]["messages"][0]["content"]
        assert content_blocks[0]["type"] == "image"
        assert content_blocks[0]["source"]["media_type"] == "image/png"

    @patch("app.services.ai_service._call_claude")
    async def test_jpg_maps_to_jpeg(self, mock_claude):
        mock_claude.return_value = "text"
        await parse_resume_text(b"content", "resume.jpg")

        call_args = mock_claude.call_args
        content_blocks = call_args[1]["messages"][0]["content"]
        assert content_blocks[0]["source"]["media_type"] == "image/jpeg"
