"""Integration tests for the sessions router, focused on the PATCH endpoint.

Uses FastAPI's TestClient with all external dependencies mocked:
  - Supabase is patched at the point of use (`app.routers.sessions.get_supabase`)
    because the router imports the symbol directly and caches a local reference,
    so patching `app.database.get_supabase` alone does not take effect.
  - get_current_user (returns a fixed user_id)
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


USER_ID = "user-001"
OTHER_USER_ID = "user-999"
SESSION_ID = "session-001"


def _make_chainable_mock():
    mock = MagicMock()
    for method in ("select", "insert", "update", "delete", "eq", "single", "order", "limit"):
        getattr(mock, method).return_value = mock
    mock.execute.return_value = MagicMock(data=[])
    return mock


@pytest.fixture
def db_mock():
    """Point-of-use patch for the sessions router's get_supabase."""
    db = MagicMock()
    table = _make_chainable_mock()
    db.table.return_value = table
    with patch("app.routers.sessions.get_supabase", return_value=db):
        yield db


@pytest.fixture
def client(db_mock):
    from app.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: USER_ID
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def updated_session(sample_session):
    return {
        **sample_session,
        "name": "Updated Name",
        "updated_at": "2026-04-11T12:00:00Z",
    }


# ── PATCH /api/sessions/{id} ─────────────────────────────────────────


class TestUpdateSession:
    def test_updates_single_field(self, client, db_mock, sample_session, updated_session):
        table_mock = db_mock.table.return_value
        table_mock.execute.side_effect = [
            MagicMock(data={"user_id": USER_ID}),  # ownership check
            MagicMock(data=[updated_session]),     # update result
        ]

        resp = client.patch(
            f"/api/sessions/{SESSION_ID}",
            json={"name": "Updated Name"},
        )

        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    def test_updates_multiple_fields(self, client, db_mock, sample_session):
        merged = {
            **sample_session,
            "name": "New",
            "company_name": "NewCo",
            "jd_text": "New JD",
            "updated_at": "2026-04-11T12:00:00Z",
        }
        table_mock = db_mock.table.return_value
        table_mock.execute.side_effect = [
            MagicMock(data={"user_id": USER_ID}),
            MagicMock(data=[merged]),
        ]

        resp = client.patch(
            f"/api/sessions/{SESSION_ID}",
            json={
                "name": "New",
                "company_name": "NewCo",
                "jd_text": "New JD",
            },
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "New"
        assert body["company_name"] == "NewCo"
        assert body["jd_text"] == "New JD"

    def test_only_provided_fields_are_sent_to_db(self, client, db_mock, sample_session, updated_session):
        """Regression guard: router must call .update() with only the provided keys (plus updated_at)."""
        table_mock = db_mock.table.return_value
        table_mock.execute.side_effect = [
            MagicMock(data={"user_id": USER_ID}),
            MagicMock(data=[updated_session]),
        ]

        client.patch(
            f"/api/sessions/{SESSION_ID}",
            json={"name": "Updated Name"},
        )

        update_call = table_mock.update.call_args
        assert update_call is not None
        payload = update_call.args[0]
        assert payload["name"] == "Updated Name"
        # Router explicitly stamps updated_at so the stale-prep banner works
        # even when the DB trigger is absent.
        assert "updated_at" in payload
        # Ensure other user-editable fields are NOT silently overwritten
        assert "jd_text" not in payload
        assert "resume_text" not in payload
        assert "company_name" not in payload
        assert "round_description" not in payload

    def test_updated_at_is_fresh_iso_timestamp(self, client, db_mock, updated_session):
        """The stamped updated_at must be a valid ISO 8601 string newer than 'now minus a few seconds'."""
        from datetime import datetime, timezone, timedelta

        table_mock = db_mock.table.return_value
        table_mock.execute.side_effect = [
            MagicMock(data={"user_id": USER_ID}),
            MagicMock(data=[updated_session]),
        ]

        before = datetime.now(timezone.utc) - timedelta(seconds=5)
        client.patch(f"/api/sessions/{SESSION_ID}", json={"name": "New"})
        after = datetime.now(timezone.utc) + timedelta(seconds=5)

        payload = table_mock.update.call_args.args[0]
        stamped = datetime.fromisoformat(payload["updated_at"])
        assert before <= stamped <= after

    def test_resume_reupload_via_patch(self, client, db_mock, sample_session):
        """Re-uploading a resume is modeled as a PATCH with a new resume_text."""
        new_text = "New resume content after re-upload"
        updated = {**sample_session, "resume_text": new_text, "updated_at": "2026-04-11T12:00:00Z"}
        table_mock = db_mock.table.return_value
        table_mock.execute.side_effect = [
            MagicMock(data={"user_id": USER_ID}),
            MagicMock(data=[updated]),
        ]

        resp = client.patch(
            f"/api/sessions/{SESSION_ID}",
            json={"resume_text": new_text},
        )

        assert resp.status_code == 200
        assert resp.json()["resume_text"] == new_text

    def test_empty_payload_returns_400(self, client, db_mock):
        table_mock = db_mock.table.return_value
        table_mock.execute.return_value = MagicMock(data={"user_id": USER_ID})

        resp = client.patch(f"/api/sessions/{SESSION_ID}", json={})

        assert resp.status_code == 400
        assert "No fields to update" in resp.json()["detail"]

    def test_unknown_session_returns_404(self, client, db_mock):
        table_mock = db_mock.table.return_value
        table_mock.execute.return_value = MagicMock(data=None)

        resp = client.patch(
            "/api/sessions/does-not-exist",
            json={"name": "Updated"},
        )

        assert resp.status_code == 404

    def test_foreign_user_returns_403(self, client, db_mock):
        table_mock = db_mock.table.return_value
        table_mock.execute.return_value = MagicMock(data={"user_id": OTHER_USER_ID})

        resp = client.patch(
            f"/api/sessions/{SESSION_ID}",
            json={"name": "Updated"},
        )

        assert resp.status_code == 403

    def test_name_over_max_length_returns_422(self, client):
        resp = client.patch(
            f"/api/sessions/{SESSION_ID}",
            json={"name": "x" * 201},
        )
        assert resp.status_code == 422

    def test_jd_text_over_max_length_returns_422(self, client):
        resp = client.patch(
            f"/api/sessions/{SESSION_ID}",
            json={"jd_text": "x" * 50_001},
        )
        assert resp.status_code == 422

    def test_resume_text_over_max_length_returns_422(self, client):
        resp = client.patch(
            f"/api/sessions/{SESSION_ID}",
            json={"resume_text": "x" * 50_001},
        )
        assert resp.status_code == 422

    def test_round_description_over_max_length_returns_422(self, client):
        resp = client.patch(
            f"/api/sessions/{SESSION_ID}",
            json={"round_description": "x" * 5_001},
        )
        assert resp.status_code == 422

    def test_update_returning_no_data_returns_500(self, client, db_mock):
        table_mock = db_mock.table.return_value
        table_mock.execute.side_effect = [
            MagicMock(data={"user_id": USER_ID}),
            MagicMock(data=[]),  # simulate failed update
        ]

        resp = client.patch(
            f"/api/sessions/{SESSION_ID}",
            json={"name": "Updated"},
        )

        assert resp.status_code == 500

    def test_response_includes_updated_at(self, client, db_mock, updated_session):
        table_mock = db_mock.table.return_value
        table_mock.execute.side_effect = [
            MagicMock(data={"user_id": USER_ID}),
            MagicMock(data=[updated_session]),
        ]

        resp = client.patch(
            f"/api/sessions/{SESSION_ID}",
            json={"name": "Updated Name"},
        )

        assert resp.status_code == 200
        assert resp.json()["updated_at"] == "2026-04-11T12:00:00Z"
