from unittest.mock import patch, MagicMock


def _make_sb():
    sb = MagicMock()
    t = MagicMock()
    sb.table.return_value = t
    for m in ["select", "upsert", "eq"]:
        getattr(t, m).return_value = t
    t.execute.return_value = MagicMock(data=None)
    return sb, t


def test_save_session_upserts_data():
    from services.session_store import save_session
    sb, t = _make_sb()
    with patch("services.session_store.get_supabase", return_value=sb):
        save_session("user@example.com", {"resume_text": "hello"})
    t.upsert.assert_called_once()
    payload = t.upsert.call_args[0][0]
    assert payload["session_id"] == "user@example.com"
    assert payload["data"] == {"resume_text": "hello"}
    assert "updated_at" in payload


def test_load_session_returns_data():
    from services.session_store import load_session
    sb, t = _make_sb()
    t.execute.return_value = MagicMock(data=[{"data": {"resume_text": "loaded"}}])
    with patch("services.session_store.get_supabase", return_value=sb):
        result = load_session("user@example.com")
    assert result == {"resume_text": "loaded"}


def test_load_session_returns_none_when_missing():
    from services.session_store import load_session
    sb, t = _make_sb()
    t.execute.return_value = MagicMock(data=None)
    with patch("services.session_store.get_supabase", return_value=sb):
        result = load_session("ghost@example.com")
    assert result is None
