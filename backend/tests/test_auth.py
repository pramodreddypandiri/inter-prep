"""Unit tests for app.auth module."""

from __future__ import annotations

from unittest.mock import patch, MagicMock, AsyncMock

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.auth import get_current_user


def _make_credentials(token: str = "valid-jwt-token") -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


class TestGetCurrentUser:
    @patch("app.auth.get_supabase")
    async def test_valid_token_returns_user_id(self, mock_get_db):
        mock_db = MagicMock()
        mock_user = MagicMock()
        mock_user.user.id = "user-123"
        mock_db.auth.get_user.return_value = mock_user
        mock_get_db.return_value = mock_db

        result = await get_current_user(_make_credentials("valid-token"))
        assert result == "user-123"

    @patch("app.auth.get_supabase")
    async def test_none_response_raises_401(self, mock_get_db):
        mock_db = MagicMock()
        mock_db.auth.get_user.return_value = None
        mock_get_db.return_value = mock_db

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(_make_credentials("bad-token"))
        assert exc_info.value.status_code == 401

    @patch("app.auth.get_supabase")
    async def test_no_user_in_response_raises_401(self, mock_get_db):
        mock_db = MagicMock()
        mock_response = MagicMock()
        mock_response.user = None
        mock_db.auth.get_user.return_value = mock_response
        mock_get_db.return_value = mock_db

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(_make_credentials("expired-token"))
        assert exc_info.value.status_code == 401

    @patch("app.auth.get_supabase")
    async def test_supabase_exception_raises_401(self, mock_get_db):
        mock_db = MagicMock()
        mock_db.auth.get_user.side_effect = RuntimeError("Connection failed")
        mock_get_db.return_value = mock_db

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(_make_credentials("token"))
        assert exc_info.value.status_code == 401
        assert "Invalid or expired token" in exc_info.value.detail

    @patch("app.auth.get_supabase")
    async def test_uses_bearer_token(self, mock_get_db):
        mock_db = MagicMock()
        mock_user = MagicMock()
        mock_user.user.id = "user-456"
        mock_db.auth.get_user.return_value = mock_user
        mock_get_db.return_value = mock_db

        creds = _make_credentials("my-specific-token")
        await get_current_user(creds)

        mock_db.auth.get_user.assert_called_once_with("my-specific-token")
