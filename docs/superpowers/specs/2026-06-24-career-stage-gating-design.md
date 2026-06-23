# Career Stage Gating — Design Spec
_Date: 2026-06-24 (revised)_

## Problem

Users can currently click "Start now" on any career ladder rung — including distant future roles — and immediately jump to a gap analysis for that role without having earned any of the prerequisite skills. This undermines the progression model: there is no meaningful bridge between stages.

## Goal

Gate progression between career stages so that:
1. Each `skill_delta` item on the immediate next rung has 1–2 concrete, actionable learning steps.
2. The user must check off **all steps for all skills** before "Start now" unlocks.
3. Distant future rungs (the `full_ladder`) cannot be jumped to at all — permanently locked until the user progresses through each stage sequentially.

---

## Scope

**In scope:**
- `backend/models/schemas.py` — add `CareerNextStep` model; add `next_steps` to `CareerRung`
- `backend/services/career_ladder.py` — update LLM prompt to generate per-skill steps
- `frontend/src/types.ts` — add `CareerNextStep`; add `next_steps` to `CareerRung`
- `frontend/src/components/CareerLadder.tsx` — checkbox UI, progression gate

**Out of scope:**
- Persisting checked state across sessions (self-reported, resets on reload — consistent with HistoryPage)
- Verified skill evidence
- Changes to HistoryPage or GapDashboardPage

---

## Backend Changes

### New model: `CareerNextStep`

```python
class CareerNextStep(BaseModel):
    skill: str       # matches a skill_delta entry
    action: str      # full actionable text, e.g. "Complete MLOps Fundamentals on Coursera"
    summary: str = ""  # optional short one-liner
```

### Updated model: `CareerRung`

```python
class CareerRung(BaseModel):
    role: str
    transferability_score: int
    skill_delta: list[str]
    why_good_fit: str
    milestones: list[Milestone]
    next_steps: list[CareerNextStep] = []   # ← new
```

### Updated LLM prompt (`career_ladder.py`)

The system prompt is extended to generate `next_steps` for **the immediate next rung only** (closest role). Distant rungs get an empty list to keep token usage low.

New JSON shape returned by LLM:
```json
{
  "long_term_destination": "...",
  "ladder": [
    {
      "role": "...",
      "transferability_score": 0,
      "skill_delta": ["MLOps", "Data Pipeline Design"],
      "why_good_fit": "...",
      "milestones": [...],
      "next_steps": [
        {"skill": "MLOps", "action": "Complete the MLOps Fundamentals course on Coursera", "summary": "MLOps Fundamentals — Coursera"},
        {"skill": "MLOps", "action": "Deploy a model end-to-end using a CI/CD pipeline on GitHub Actions", "summary": "Model deployment via CI/CD"},
        {"skill": "Data Pipeline Design", "action": "Design and document an ETL pipeline for a sample dataset using Apache Airflow", "summary": "ETL pipeline with Airflow"}
      ]
    },
    {
      "role": "...",
      "next_steps": []
    }
  ]
}
```

Rules given to the LLM:
- Generate `next_steps` only for the **first (closest) rung**; leave it empty for all others.
- Provide 1–2 steps per `skill_delta` item.
- Each step must reference a specific platform, course, project, or tool.
- `summary` is a ≤8-word version of `action`.

---

## Frontend Changes

### `types.ts`

```ts
export interface CareerNextStep {
  skill: string
  action: string
  summary?: string
}

export interface CareerRung {
  role: string
  transferability_score: number
  skill_delta: string[]
  why_good_fit: string
  milestones: Milestone[]
  next_steps: CareerNextStep[]   // ← new
}
```

### `CareerLadder.tsx`

**New state:**
```ts
const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set())
```

Steps are keyed as `"${skill}::${stepIndex}"` to uniquely identify each.

**Gate logic:**
```ts
const totalSteps = immediateNext.next_steps.length
const allChecked = totalSteps === 0 || checkedSteps.size >= totalSteps
```

If `next_steps` is empty (no delta or backend returned none), gate is open immediately.

**Skill confirmed** = all steps for that skill are checked:
```ts
function isSkillConfirmed(skill: string): boolean {
  const steps = immediateNext.next_steps.filter(s => s.skill === skill)
  return steps.length > 0 && steps.every((_, i) => checkedSteps.has(`${skill}::${i}`))
}
```

---

## UI

### Immediate next card — skill_delta with steps

```
New skills you'll need:            1 / 3 confirmed
─────────────────────────────────────────────────
☑ MLOps                            ← skill confirmed (all steps checked)
    ☑ MLOps Fundamentals — Coursera
    ☑ Model deployment via CI/CD
☐ Data Pipeline Design             ← skill not confirmed
    ☐ ETL pipeline with Airflow
☐ Python
    ☐ Build 2 data scripts with pandas and numpy
─────────────────────────────────────────────────
[🔒 Start now — complete all steps first]    ← locked (grayed, disabled)
```

When all confirmed:
```
[✓ Start now →]                              ← blue, enabled
```

- Confirmed skill label: strikethrough + muted text
- Checked step: strikethrough + muted text (mirrors HistoryPage)
- Counter `X / Y confirmed` next to section header (Y = number of distinct skills with steps)
- When `startingRole` spinner active: all checkboxes disabled

### Full ladder rungs (distant stages)

Hover "Start now" button removed. Replaced with a static locked chip:

```
Senior ML Engineer    42% transferable
[🔒 Complete Data Scientist first]
```

Hover tooltip (`why_good_fit` + skill preview) is retained. No action possible.

---

## Edge Cases

| Case | Behaviour |
|---|---|
| `next_steps` empty for immediateNext | Gate open; no checklist shown; "Start now" enabled |
| `skill_delta` item has no matching steps | That skill has no checkbox row; doesn't block gate |
| User unchecks a step | Counter decrements; button re-locks |
| `startingRole` spinner active | Checkboxes disabled |
| Full ladder rung with empty `skill_delta` | Still locked — gate is the role, not the delta |

---

## Files Changed

| File | Change |
|---|---|
| `backend/models/schemas.py` | Add `CareerNextStep`; add `next_steps` to `CareerRung` |
| `backend/services/career_ladder.py` | Update LLM system prompt and JSON parsing |
| `frontend/src/types.ts` | Add `CareerNextStep`; add `next_steps` to `CareerRung` |
| `frontend/src/components/CareerLadder.tsx` | Checkbox UI, gate logic, lock full-ladder rungs |
