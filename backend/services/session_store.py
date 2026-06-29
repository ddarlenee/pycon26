from datetime import datetime, timezone
from services.supabase_client import get_supabase


def save_session(session_id: str, data: dict) -> None:
    get_supabase().table("sessions").upsert({
        "session_id": session_id,
        "data": data,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()


def load_session(session_id: str) -> dict | None:
    res = (
        get_supabase()
        .table("sessions")
        .select("data")
        .eq("session_id", session_id)
        .execute()
    )
    return res.data[0]["data"] if res.data else None
