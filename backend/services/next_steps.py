import json
from openai import OpenAI
from config import settings
from models.schemas import GapItem
from services.interaction_logger import log_interaction

openai_client = OpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """You are a career coach helping someone close skill gaps for a specific role.

For EACH skill gap listed, generate exactly ONE learning recommendation. Major employers (MNCs, big tech, banks) are the benchmark.

Return ONLY valid JSON:
{
  "next_steps": [
    {
      "summary": "Action + specific resource + platform (max 10 words)",
      "text": "Full detail: exact course/project name, what you'll learn, why it matters for this role.",
      "skill": "exact skill name from input",
      "tier": "Essential|Important|Nice-to-have"
    }
  ]
}

Rules:
- Generate exactly one entry per gap, in the same order as the input.
- "skill" must match the input skill name exactly.
- "tier" must match the input tier exactly.
- "summary" is a short one-liner: verb + resource name + platform. Example: "Complete SQL for Data Scientists on Coursera"
- "text" is the full explanation — one or two sentences with specifics."""


def generate_next_steps(role: str, gaps: list[GapItem], session_id: str) -> list[dict]:
    """Return [{text, skill, tier}] — one step per gap, ordered Essential → Important → Nice-to-have."""
    if not gaps:
        return []

    gap_lines = "\n".join(
        f"- {g.skill} (tier: {g.tier})" for g in gaps
    )
    prompt = f"Target role: {role}\n\nSkill gaps (generate one step for each):\n{gap_lines}"

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content
    log_interaction(session_id, "next_steps", prompt, content)
    steps = json.loads(content).get("next_steps", [])

    # Normalise and verify — fall back gracefully if LLM drops a step
    result = []
    for s in steps:
        if isinstance(s, dict):
            text = s.get("text", "")
            result.append({
                "summary": s.get("summary", ""),
                "text": text,
                "skill": s.get("skill", ""),
                "tier": s.get("tier", "Important"),
            })
        else:
            result.append({"summary": "", "text": str(s), "skill": "", "tier": "Important"})

    # If LLM returned fewer steps than inputs, pad with generic entries
    if len(result) < len(gaps):
        existing_skills = {r["skill"] for r in result}
        for g in gaps:
            if g.skill not in existing_skills:
                fallback = f"Study and practice {g.skill} through online resources or hands-on projects."
                result.append({
                    "summary": f"Study {g.skill} via online resources",
                    "text": fallback,
                    "skill": g.skill,
                    "tier": g.tier,
                })

    return result
