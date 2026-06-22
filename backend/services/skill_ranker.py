import json
from openai import OpenAI
from config import settings
from models.schemas import TieredSkill
from services.interaction_logger import log_interaction

openai_client = OpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """You are a career specialist with expertise in Singapore's job market.
Given a job role and its skills — each with a SkillsFuture proficiency level where available — rank each skill into exactly one tier:
- Essential: must-have for day-one performance (typically Proficiency Level 5-6 or Advanced)
- Important: significantly boosts effectiveness (typically Proficiency Level 3-4 or Intermediate)
- Nice-to-have: helpful but not critical (typically Proficiency Level 1-2 or Basic)

Use the proficiency level as your primary signal. Where no level is given, use your judgment.

Return ONLY valid JSON:
{"tiered_skills": [{"name": "...", "tier": "Essential|Important|Nice-to-have", "reasoning": "..."}]}
Include ALL provided skills in your response."""


def rank_skills(
    role: str,
    skills_with_proficiency: list[tuple[str, str | None]],
    session_id: str,
) -> list[TieredSkill]:
    skill_lines = []
    for name, level in skills_with_proficiency:
        if level:
            skill_lines.append(f"- {name} (Proficiency Level: {level})")
        else:
            skill_lines.append(f"- {name}")

    prompt = f"Role: {role}\nSkills to rank:\n" + "\n".join(skill_lines)
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content
    log_interaction(session_id, "skill_ranking", prompt, content)
    data = json.loads(content)
    return [TieredSkill(**s) for s in data["tiered_skills"]]
