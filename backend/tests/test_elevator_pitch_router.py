"""Integration-style tests for the elevator pitch router.

Uses FastAPI's TestClient with all external dependencies mocked:
  - Supabase (via mock_supabase fixture from conftest.py)
  - Claude (via patch on service functions)
  - get_current_user (returns a fixed user_id)
"""

from __future__ import annotations

import json
from io import BytesIO
from unittest.mock import MagicMock, patch, AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.main import app

USER_ID = "user-abc"
PITCH_ID = "pitch-001"
RECORDING_ID = "recording-001"
SHARE_TOKEN = "abc123sharetoken"


@pytest.fixture
def client(mock_supabase):
    """TestClient with auth dependency overridden."""
    from app.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: USER_ID
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def sample_pitch():
    return {
        "id": PITCH_ID,
        "user_id": USER_ID,
        "pitch_text": "I'm a senior engineer who cut deploy time by 80%...",
        "target_role": "Senior Software Engineer",
        "company_name": "Stripe",
        "resume_text": "5 years experience...",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
    }


@pytest.fixture
def sample_recording():
    return {
        "id": RECORDING_ID,
        "pitch_id": PITCH_ID,
        "user_id": USER_ID,
        "video_url": None,
        "duration_seconds": 52,
        "transcript": "I'm a senior engineer...",
        "score": 78,
        "feedback": {
            "overall_score": 78,
            "dimensions": {
                "opening_hook": 12,
                "identity_clarity": 13,
                "value_proposition": 16,
                "unique_differentiator": 14,
                "role_fit": 12,
                "call_to_action": 8,
                "delivery": 3,
            },
            "strengths": ["Strong opening hook"],
            "improvements": ["Better CTA"],
            "tailored_suggestions": ["Mention Stripe products"],
            "timing_note": "52s — within target.",
        },
        "share_token": SHARE_TOKEN,
        "created_at": "2025-01-01T00:00:00Z",
    }


# ── POST /api/elevator-pitch/generate ────────────────────────────────────────


class TestGeneratePitch:
    @patch("app.routers.elevator_pitch.generate_pitch_text", new_callable=AsyncMock)
    def test_returns_pitch_text(self, mock_gen, client):
        mock_gen.return_value = "I cut deploy times by 80%..."

        resp = client.post(
            "/api/elevator-pitch/generate",
            json={
                "target_role": "SWE",
                "company_name": "Google",
                "resume_text": "5 years experience",
                "key_strengths": "Python, distributed systems",
            },
        )

        assert resp.status_code == 200
        assert "pitch_text" in resp.json()
        assert resp.json()["pitch_text"] == "I cut deploy times by 80%..."

    @patch("app.routers.elevator_pitch.generate_pitch_text", new_callable=AsyncMock)
    def test_missing_target_role_returns_422(self, mock_gen, client):
        resp = client.post("/api/elevator-pitch/generate", json={})
        assert resp.status_code == 422

    @patch("app.routers.elevator_pitch.generate_pitch_text", new_callable=AsyncMock)
    def test_optional_fields_default_to_empty(self, mock_gen, client):
        mock_gen.return_value = "pitch text"

        resp = client.post(
            "/api/elevator-pitch/generate",
            json={"target_role": "PM"},
        )

        assert resp.status_code == 200
        call_kwargs = mock_gen.call_args[1]
        assert call_kwargs["company_name"] == ""
        assert call_kwargs["resume_text"] == ""
        assert call_kwargs["key_strengths"] == ""


# ── POST /api/elevator-pitch ──────────────────────────────────────────────────


class TestCreatePitch:
    def test_creates_pitch_and_returns_data(self, client, mock_supabase, sample_pitch):
        table_mock = mock_supabase.table.return_value
        table_mock.execute.return_value = MagicMock(data=[sample_pitch])

        resp = client.post(
            "/api/elevator-pitch",
            json={
                "pitch_text": "I cut deploy times by 80%...",
                "target_role": "Senior Software Engineer",
                "company_name": "Stripe",
                "resume_text": "5 years experience",
            },
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == PITCH_ID
        assert data["target_role"] == "Senior Software Engineer"

    def test_missing_pitch_text_returns_422(self, client):
        resp = client.post(
            "/api/elevator-pitch",
            json={"target_role": "SWE"},
        )
        assert resp.status_code == 422

    def test_missing_target_role_returns_422(self, client):
        resp = client.post(
            "/api/elevator-pitch",
            json={"pitch_text": "Some pitch"},
        )
        assert resp.status_code == 422


# ── GET /api/elevator-pitch ───────────────────────────────────────────────────


class TestListPitches:
    def test_returns_list(self, client, mock_supabase, sample_pitch):
        table_mock = mock_supabase.table.return_value
        table_mock.execute.return_value = MagicMock(data=[sample_pitch])

        resp = client.get("/api/elevator-pitch")

        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert resp.json()[0]["id"] == PITCH_ID

    def test_returns_empty_list_when_none(self, client, mock_supabase):
        table_mock = mock_supabase.table.return_value
        table_mock.execute.return_value = MagicMock(data=[])

        resp = client.get("/api/elevator-pitch")

        assert resp.status_code == 200
        assert resp.json() == []


# ── GET /api/elevator-pitch/{id} ─────────────────────────────────────────────


class TestGetPitch:
    def test_returns_pitch_with_recordings(self, client, mock_supabase, sample_pitch, sample_recording):
        table_mock = mock_supabase.table.return_value
        # First call: get pitch; second call: get recordings
        table_mock.execute.side_effect = [
            MagicMock(data=sample_pitch),   # single() call returns dict not list
            MagicMock(data=[sample_recording]),
        ]

        resp = client.get(f"/api/elevator-pitch/{PITCH_ID}")

        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == PITCH_ID

    def test_returns_404_for_unknown_pitch(self, client, mock_supabase):
        table_mock = mock_supabase.table.return_value
        table_mock.execute.return_value = MagicMock(data=None)

        resp = client.get("/api/elevator-pitch/nonexistent-id")
        assert resp.status_code == 404

    def test_returns_403_when_user_does_not_own_pitch(self, client, mock_supabase, sample_pitch):
        other_user_pitch = {**sample_pitch, "user_id": "other-user-999"}
        table_mock = mock_supabase.table.return_value
        table_mock.execute.return_value = MagicMock(data=other_user_pitch)

        resp = client.get(f"/api/elevator-pitch/{PITCH_ID}")
        assert resp.status_code == 403


# ── PUT /api/elevator-pitch/{id} ─────────────────────────────────────────────


class TestUpdatePitch:
    def test_updates_pitch_text(self, client, mock_supabase, sample_pitch):
        updated = {**sample_pitch, "pitch_text": "New pitch text here"}
        table_mock = mock_supabase.table.return_value
        table_mock.execute.side_effect = [
            MagicMock(data=sample_pitch),    # ownership check
            MagicMock(data=[updated]),       # update
        ]

        resp = client.put(
            f"/api/elevator-pitch/{PITCH_ID}",
            json={"pitch_text": "New pitch text here"},
        )

        assert resp.status_code == 200

    def test_missing_pitch_text_returns_422(self, client):
        resp = client.put(f"/api/elevator-pitch/{PITCH_ID}", json={})
        assert resp.status_code == 422


# ── DELETE /api/elevator-pitch/{id} ──────────────────────────────────────────


class TestDeletePitch:
    def test_delete_returns_deleted_id(self, client, mock_supabase, sample_pitch):
        table_mock = mock_supabase.table.return_value
        table_mock.execute.side_effect = [
            MagicMock(data=sample_pitch),   # ownership check
            MagicMock(data=[]),             # delete
        ]

        resp = client.delete(f"/api/elevator-pitch/{PITCH_ID}")

        assert resp.status_code == 200
        assert resp.json()["deleted"] == PITCH_ID

    def test_delete_404_for_unknown(self, client, mock_supabase):
        table_mock = mock_supabase.table.return_value
        table_mock.execute.return_value = MagicMock(data=None)

        resp = client.delete("/api/elevator-pitch/nonexistent")
        assert resp.status_code == 404


# ── POST /api/elevator-pitch/{id}/recordings ─────────────────────────────────


class TestCreateRecording:
    @patch("app.routers.elevator_pitch.analyze_pitch_recording", new_callable=AsyncMock)
    def test_creates_recording_with_analysis(
        self, mock_analyze, client, mock_supabase, sample_pitch, sample_recording
    ):
        mock_analyze.return_value = sample_recording["feedback"]

        table_mock = mock_supabase.table.return_value
        table_mock.execute.side_effect = [
            MagicMock(data=sample_pitch),        # ownership check
            MagicMock(data=[sample_recording]),   # insert
        ]

        resp = client.post(
            f"/api/elevator-pitch/{PITCH_ID}/recordings",
            data={
                "transcript": "I'm a senior engineer...",
                "duration_seconds": "52",
            },
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["score"] == 78

    @patch("app.routers.elevator_pitch.analyze_pitch_recording", new_callable=AsyncMock)
    def test_analysis_failure_still_saves_recording(
        self, mock_analyze, client, mock_supabase, sample_pitch, sample_recording
    ):
        mock_analyze.side_effect = Exception("AI service error")

        no_score_recording = {**sample_recording, "score": None, "feedback": None}
        table_mock = mock_supabase.table.return_value
        table_mock.execute.side_effect = [
            MagicMock(data=sample_pitch),
            MagicMock(data=[no_score_recording]),
        ]

        resp = client.post(
            f"/api/elevator-pitch/{PITCH_ID}/recordings",
            data={"transcript": "pitch", "duration_seconds": "50"},
        )

        assert resp.status_code == 200
        assert resp.json()["score"] is None

    @patch("app.routers.elevator_pitch.analyze_pitch_recording", new_callable=AsyncMock)
    def test_video_too_large_returns_413(
        self, mock_analyze, client, mock_supabase, sample_pitch
    ):
        mock_analyze.return_value = {}

        table_mock = mock_supabase.table.return_value
        table_mock.execute.return_value = MagicMock(data=sample_pitch)

        large_video = b"x" * (51 * 1024 * 1024)  # 51 MB > 50 MB limit

        resp = client.post(
            f"/api/elevator-pitch/{PITCH_ID}/recordings",
            data={"transcript": "pitch", "duration_seconds": "50"},
            files={"video": ("recording.webm", BytesIO(large_video), "video/webm")},
        )

        assert resp.status_code == 413

    @patch("app.routers.elevator_pitch.analyze_pitch_recording", new_callable=AsyncMock)
    def test_duration_over_300_returns_422(self, mock_analyze, client, mock_supabase, sample_pitch):
        table_mock = mock_supabase.table.return_value
        table_mock.execute.return_value = MagicMock(data=sample_pitch)

        resp = client.post(
            f"/api/elevator-pitch/{PITCH_ID}/recordings",
            data={"transcript": "pitch", "duration_seconds": "999"},
        )

        assert resp.status_code == 422


# ── GET /api/elevator-pitch/{id}/recordings ──────────────────────────────────


class TestListRecordings:
    def test_returns_list(self, client, mock_supabase, sample_pitch, sample_recording):
        table_mock = mock_supabase.table.return_value
        table_mock.execute.side_effect = [
            MagicMock(data=sample_pitch),           # ownership check
            MagicMock(data=[sample_recording]),      # recordings query
        ]

        resp = client.get(f"/api/elevator-pitch/{PITCH_ID}/recordings")

        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["share_token"] == SHARE_TOKEN

    def test_returns_empty_when_no_recordings(self, client, mock_supabase, sample_pitch):
        table_mock = mock_supabase.table.return_value
        table_mock.execute.side_effect = [
            MagicMock(data=sample_pitch),
            MagicMock(data=[]),
        ]

        resp = client.get(f"/api/elevator-pitch/{PITCH_ID}/recordings")

        assert resp.status_code == 200
        assert resp.json() == []


# ── GET /api/elevator-pitch/share/{token} ────────────────────────────────────


class TestShareEndpoint:
    def test_returns_recording_without_auth(self, mock_supabase, sample_pitch, sample_recording):
        """Share endpoint must be accessible without Authorization header."""
        table_mock = mock_supabase.table.return_value
        table_mock.execute.side_effect = [
            MagicMock(data=sample_recording),   # recording by token
            MagicMock(data=sample_pitch),       # pitch metadata
        ]

        # Use raw TestClient (no auth override)
        with TestClient(app) as c:
            resp = c.get(f"/api/elevator-pitch/share/{SHARE_TOKEN}")

        assert resp.status_code == 200
        data = resp.json()
        assert data["share_token"] == SHARE_TOKEN
        # Pitch meta should be attached
        assert "target_role" in data

    def test_returns_404_for_invalid_token(self, mock_supabase):
        table_mock = mock_supabase.table.return_value
        table_mock.execute.return_value = MagicMock(data=None)

        with TestClient(app) as c:
            resp = c.get("/api/elevator-pitch/share/invalid-token-xyz")

        assert resp.status_code == 404

    def test_does_not_expose_resume_text(self, mock_supabase, sample_pitch, sample_recording):
        table_mock = mock_supabase.table.return_value
        table_mock.execute.side_effect = [
            MagicMock(data=sample_recording),
            MagicMock(data=sample_pitch),
        ]

        with TestClient(app) as c:
            resp = c.get(f"/api/elevator-pitch/share/{SHARE_TOKEN}")

        assert "resume_text" not in resp.json()
