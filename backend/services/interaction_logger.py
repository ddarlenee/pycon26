from datetime import datetime, timezone
from services.supabase_client import get_supabase


def log_interaction(session_id: str, call_type: str, prompt: str, response: str) -> None:
    sb = get_supabase()
    profile = sb.table("user_profiles").select("id").eq("email", session_id).execute()
    user_id = profile.data[0]["id"] if profile.data else None

    sb.table("interaction_logs").insert({
        "user_id": user_id,
        "session_id": session_id,
        "event": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "session_id": session_id,
            "type": call_type,
            "model": "gpt-4o",
            "prompt": prompt,
            "response": response,
        },
    }).execute()
