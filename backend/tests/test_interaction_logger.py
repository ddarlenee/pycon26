from unittest.mock import patch, MagicMock


def _make_sb():
    sb = MagicMock()
    t = MagicMock()
    sb.table.return_value = t
    for m in ["select", "insert", "eq"]:
        getattr(t, m).return_value = t
    return sb, t


def test_log_interaction_inserts_event_with_user_id():
    from services.interaction_logger import log_interaction
    sb, t = _make_sb()
    t.execute.side_effect = [
        MagicMock(data=[{"id": "uuid-log-1"}]),  # user_profiles lookup
        MagicMock(data=None),                      # insert
    ]
    with patch("services.interaction_logger.get_supabase", return_value=sb):
        log_interaction("user@example.com", "skill_extraction", "the prompt", "the response")

    t.insert.assert_called_once()
    payload = t.insert.call_args[0][0]
    assert payload["user_id"] == "uuid-log-1"
    assert payload["session_id"] == "user@example.com"
    assert payload["event"]["type"] == "skill_extraction"
    assert payload["event"]["prompt"] == "the prompt"
    assert payload["event"]["response"] == "the response"
    assert "timestamp" in payload["event"]


def test_log_interaction_uses_null_user_id_when_profile_missing():
    from services.interaction_logger import log_interaction
    sb, t = _make_sb()
    t.execute.side_effect = [
        MagicMock(data=[]),    # empty profile lookup
        MagicMock(data=None),  # insert
    ]
    with patch("services.interaction_logger.get_supabase", return_value=sb):
        log_interaction("ghost@example.com", "role_inference", "p", "r")

    payload = t.insert.call_args[0][0]
    assert payload["user_id"] is None
