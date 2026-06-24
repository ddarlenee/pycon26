# Career Stage Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate career stage progression so users must check off all per-skill learning steps before "Start now" unlocks, and distant future stages are permanently locked.

**Architecture:** Add a `CareerNextStep` model to the backend schema and update the LLM prompt to generate 1–2 actionable steps per `skill_delta` item (first rung only). The frontend renders these as interactive checkboxes in the career ladder; "Start now" is disabled until all steps are checked. Full-ladder (distant) rungs lose their "Start now" button and instead show a locked chip.

**Tech Stack:** Python/Pydantic (backend), React/TypeScript/Tailwind (frontend), OpenAI gpt-4o (LLM)

## Global Constraints

- Backend: Python 3.11+, Pydantic v2
- Frontend: React 18, TypeScript strict mode, Tailwind CSS
- No new npm packages or pip packages
- `next_steps` generated only for the first (closest) career rung — leave empty `[]` for all others to keep token usage low
- All `skill` values in `CareerNextStep` must exactly match a string in the rung's `skill_delta` list
- Backend tests live in `backend/tests/`, run with `pytest` from the `backend/` directory
- Frontend TypeScript compiles with `npm run build` from the `frontend/` directory

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/models/schemas.py` | Modify | Add `CareerNextStep` model; add `next_steps` field to `CareerRung` |
| `backend/services/career_ladder.py` | Modify | Update LLM system prompt; parse `next_steps` from LLM JSON |
| `backend/tests/test_career_ladder.py` | Modify | Extend mock JSON and add assertions for `next_steps` |
| `frontend/src/types.ts` | Modify | Add `CareerNextStep` interface; add `next_steps` to `CareerRung` |
| `frontend/src/components/CareerLadder.tsx` | Modify | Checkbox state, skill-gated checklist UI, locked full-ladder rungs |

---

### Task 1: Backend schema — add `CareerNextStep` and update `CareerRung`

**Files:**
- Modify: `backend/models/schemas.py`
- Test: `backend/tests/test_career_ladder.py`

**Interfaces:**
- Produces: `CareerNextStep` Pydantic model with fields `skill: str`, `action: str`, `summary: str = ""`
- Produces: `CareerRung.next_steps: list[CareerNextStep] = []`

- [ ] **Step 1: Add `CareerNextStep` model to `schemas.py`**

Open `backend/models/schemas.py`. After the `Milestone` class (line 51), insert:

```python
class CareerNextStep(BaseModel):
    skill: str       # matches a skill_delta entry exactly
    action: str      # full actionable sentence, e.g. "Complete MLOps Fundamentals on Coursera"
    summary: str = ""  # ≤8-word version, e.g. "MLOps Fundamentals — Coursera"
```

- [ ] **Step 2: Add `next_steps` to `CareerRung`**

In `backend/models/schemas.py`, update the `CareerRung` class to:

```python
class CareerRung(BaseModel):
    role: str
    transferability_score: int  # 0–100
    skill_delta: list[str]
    why_good_fit: str
    milestones: list[Milestone]
    next_steps: list[CareerNextStep] = []
```

- [ ] **Step 3: Write a failing test for the new model**

In `backend/tests/test_career_ladder.py`, add this test at the bottom of the file (before running anything):

```python
def test_career_next_step_model():
    from models.schemas import CareerNextStep
    step = CareerNextStep(skill="MLOps", action="Complete MLOps Fundamentals on Coursera", summary="MLOps Fundamentals — Coursera")
    assert step.skill == "MLOps"
    assert step.action == "Complete MLOps Fundamentals on Coursera"
    assert step.summary == "MLOps Fundamentals — Coursera"

def test_career_rung_next_steps_defaults_empty():
    from models.schemas import CareerRung, Milestone
    rung = CareerRung(
        role="Senior Data Analyst",
        transferability_score=72,
        skill_delta=["MLOps"],
        why_good_fit="Good fit",
        milestones=[],
    )
    assert rung.next_steps == []
```

- [ ] **Step 4: Run tests to confirm they fail**

From the `backend/` directory:
```bash
cd backend && pytest tests/test_career_ladder.py::test_career_next_step_model tests/test_career_ladder.py::test_career_rung_next_steps_defaults_empty -v
```

Expected: **FAIL** — `ImportError: cannot import name 'CareerNextStep'` (because the model doesn't exist yet).

- [ ] **Step 5: Run tests again to confirm they pass**

The models were written in Step 1–2, so they should already exist. Run:

```bash
pytest tests/test_career_ladder.py::test_career_next_step_model tests/test_career_ladder.py::test_career_rung_next_steps_defaults_empty -v
```

Expected: **PASS** for both.

- [ ] **Step 6: Run full test suite to confirm no regressions**

```bash
pytest tests/test_career_ladder.py -v
```

Expected: all existing tests **PASS** (existing tests use `MOCK_LADDER_JSON` which has no `next_steps` key; the `= []` default means Pydantic will tolerate its absence).

- [ ] **Step 7: Commit**

```bash
git add backend/models/schemas.py backend/tests/test_career_ladder.py
git commit -m "feat: add CareerNextStep model and next_steps field to CareerRung"
```

---

### Task 2: Backend LLM — update prompt and parsing

**Files:**
- Modify: `backend/services/career_ladder.py`
- Modify: `backend/tests/test_career_ladder.py`

**Interfaces:**
- Consumes: `CareerNextStep` from `backend/models/schemas.py` (Task 1)
- Produces: `CareerRung.next_steps` populated from LLM JSON for the first rung; empty list for subsequent rungs

- [ ] **Step 1: Update the import in `career_ladder.py`**

In `backend/services/career_ladder.py`, change line 4:

```python
from models.schemas import ProgressRequest, ProgressResponse, CareerRung, Milestone
```

to:

```python
from models.schemas import ProgressRequest, ProgressResponse, CareerRung, CareerNextStep, Milestone
```

- [ ] **Step 2: Replace `SYSTEM_PROMPT` in `career_ladder.py`**

Replace the entire `SYSTEM_PROMPT` string (lines 10–29) with:

```python
SYSTEM_PROMPT = """You are a career progression specialist with deep knowledge of Singapore's job market and SkillsFuture frameworks.
Given a current role and the user's skills, infer a realistic vertical career progression ladder (2–4 future roles above the current one).

For each future role provide:
- role: exact role title
- transferability_score: 0–100 (how much of user's current skills transfer)
- skill_delta: list of new skills needed that the user doesn't currently have
- why_good_fit: one sentence explaining transferability from user's background
- milestones: 2–4 concrete, specific steps to reach THIS role from the previous rung (empty list for distant future roles)
- next_steps: for the FIRST (closest) rung ONLY, provide 1–2 actionable learning steps per skill_delta item. Each step must reference a specific platform, course, project, or tool. Leave next_steps as [] for all other rungs.

Each next_step object:
- skill: the skill_delta item this step addresses (must match the skill_delta entry exactly)
- action: one sentence describing the specific learning action (e.g. "Complete the MLOps Fundamentals course on Coursera")
- summary: a version of action in 8 words or fewer (e.g. "MLOps Fundamentals — Coursera")

Also identify the long_term_destination: the most senior role this path leads toward.

Return ONLY valid JSON:
{
  "long_term_destination": "...",
  "ladder": [
    {
      "role": "...",
      "transferability_score": 0,
      "skill_delta": ["Skill A", "Skill B"],
      "why_good_fit": "...",
      "milestones": [{"description": "...", "skill_focus": "..."}],
      "next_steps": [
        {"skill": "Skill A", "action": "Complete the Skill A Fundamentals course on Coursera", "summary": "Skill A Fundamentals — Coursera"},
        {"skill": "Skill A", "action": "Build a project applying Skill A end-to-end", "summary": "Build Skill A project"},
        {"skill": "Skill B", "action": "Follow the official Skill B tutorial and implement the sample project", "summary": "Skill B official tutorial"}
      ]
    },
    {
      "role": "...",
      "transferability_score": 0,
      "skill_delta": ["Skill C"],
      "why_good_fit": "...",
      "milestones": [],
      "next_steps": []
    }
  ]
}
Order ladder from closest to most distant future role."""
```

- [ ] **Step 3: Update the parsing loop in `build_career_ladder`**

In `backend/services/career_ladder.py`, replace the `ladder = [...]` list comprehension (lines 54–63) with:

```python
ladder = [
    CareerRung(
        role=r["role"],
        transferability_score=r["transferability_score"],
        skill_delta=r["skill_delta"],
        why_good_fit=r["why_good_fit"],
        milestones=[Milestone(**m) for m in r.get("milestones", [])],
        next_steps=[CareerNextStep(**s) for s in r.get("next_steps", [])],
    )
    for r in data["ladder"]
]
```

- [ ] **Step 4: Update `MOCK_LADDER_JSON` in the test file**

In `backend/tests/test_career_ladder.py`, replace `MOCK_LADDER_JSON` (lines 7–28) with:

```python
MOCK_LADDER_JSON = json.dumps({
    "long_term_destination": "Principal Data Scientist",
    "ladder": [
        {
            "role": "Senior Data Analyst",
            "transferability_score": 72,
            "skill_delta": ["Machine Learning", "Stakeholder Management"],
            "why_good_fit": "High transferability from your analytics background",
            "milestones": [
                {"description": "Lead one end-to-end analytics project", "skill_focus": "Leadership"},
                {"description": "Complete Andrew Ng ML course", "skill_focus": "Machine Learning"},
            ],
            "next_steps": [
                {"skill": "Machine Learning", "action": "Complete Andrew Ng's Machine Learning Specialization on Coursera", "summary": "Andrew Ng ML — Coursera"},
                {"skill": "Machine Learning", "action": "Implement a classification model on a Kaggle dataset and publish results", "summary": "Kaggle classification project"},
                {"skill": "Stakeholder Management", "action": "Complete the Stakeholder Management course on LinkedIn Learning", "summary": "Stakeholder Management — LinkedIn Learning"}
            ]
        },
        {
            "role": "Data Science Manager",
            "transferability_score": 45,
            "skill_delta": ["Team Leadership", "Budget Management"],
            "why_good_fit": "Natural progression from senior analytics roles",
            "milestones": [],
            "next_steps": []
        }
    ]
})
```

- [ ] **Step 5: Add tests for `next_steps` parsing**

In `backend/tests/test_career_ladder.py`, add after the existing tests:

```python
def test_build_career_ladder_next_steps_on_immediate_next():
    req = ProgressRequest(session_id="test-session", current_role="Data Analyst", user_skill_names=["Python", "SQL"])
    with patch("services.career_ladder.openai_client.chat.completions.create",
               return_value=make_mock_completion(MOCK_LADDER_JSON)):
        with patch("services.career_ladder.log_interaction"):
            with patch("services.career_ladder.skillsfuture.get_skills_for_role", return_value=[]):
                result = build_career_ladder(req, "test-session")
    assert len(result.immediate_next.next_steps) == 3
    assert result.immediate_next.next_steps[0].skill == "Machine Learning"
    assert result.immediate_next.next_steps[0].action == "Complete Andrew Ng's Machine Learning Specialization on Coursera"
    assert result.immediate_next.next_steps[0].summary == "Andrew Ng ML — Coursera"

def test_build_career_ladder_full_ladder_next_steps_empty():
    req = ProgressRequest(session_id="test-session", current_role="Data Analyst", user_skill_names=["Python"])
    with patch("services.career_ladder.openai_client.chat.completions.create",
               return_value=make_mock_completion(MOCK_LADDER_JSON)):
        with patch("services.career_ladder.log_interaction"):
            with patch("services.career_ladder.skillsfuture.get_skills_for_role", return_value=[]):
                result = build_career_ladder(req, "test-session")
    assert result.full_ladder[0].next_steps == []
```

- [ ] **Step 6: Run the full test suite**

```bash
pytest tests/test_career_ladder.py -v
```

Expected: **all tests PASS**, including the two new ones.

- [ ] **Step 7: Commit**

```bash
git add backend/services/career_ladder.py backend/tests/test_career_ladder.py
git commit -m "feat: update career ladder LLM prompt to generate per-skill next steps"
```

---

### Task 3: Frontend types — add `CareerNextStep`

**Files:**
- Modify: `frontend/src/types.ts`

**Interfaces:**
- Produces: `CareerNextStep` interface with `skill: string`, `action: string`, `summary?: string`
- Produces: `CareerRung.next_steps: CareerNextStep[]`

- [ ] **Step 1: Add `CareerNextStep` interface and update `CareerRung` in `types.ts`**

Open `frontend/src/types.ts`. After the `Milestone` interface (after line 47), insert:

```ts
export interface CareerNextStep {
  skill: string
  action: string
  summary?: string
}
```

Then update `CareerRung` (starting at line 48) to:

```ts
export interface CareerRung {
  role: string
  transferability_score: number
  skill_delta: string[]
  why_good_fit: string
  milestones: Milestone[]
  next_steps: CareerNextStep[]
}
```

- [ ] **Step 2: Verify TypeScript compiles without errors**

From the `frontend/` directory:

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors. If it fails, check that `CareerNextStep` is exported and that `next_steps` is spelled consistently.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types.ts
git commit -m "feat: add CareerNextStep type and next_steps to CareerRung"
```

---

### Task 4: Frontend UI — checklist gating in `CareerLadder`

**Files:**
- Modify: `frontend/src/components/CareerLadder.tsx`

**Interfaces:**
- Consumes: `CareerNextStep` from `../types` (Task 3)
- Consumes: `immediateNext.next_steps: CareerNextStep[]`
- Produces: interactive checklist with per-skill step checkboxes; "Start now" gated on completion; full-ladder rungs show a locked chip

- [ ] **Step 1: Replace the full contents of `CareerLadder.tsx`**

Replace the entire file with:

```tsx
import { useState } from 'react'
import type { CareerRung } from '../types'
import MilestoneChips from './MilestoneChips'

interface Props {
  currentRole: string
  immediateNext: CareerRung
  fullLadder: CareerRung[]
  longTermDestination: string
  onStartNow?: (role: string) => void
  startingRole?: string | null
}

function StartNowButton({ role, onStartNow, startingRole, locked = false, size = 'md' }: {
  role: string
  onStartNow: (role: string) => void
  startingRole?: string | null
  locked?: boolean
  size?: 'sm' | 'md'
}) {
  const isThis = startingRole === role
  const isAny = startingRole !== null && startingRole !== undefined
  const isDisabled = isAny || locked

  return (
    <button
      onClick={() => { if (!locked && !isAny) onStartNow(role) }}
      disabled={isDisabled}
      title={locked && !isAny ? 'Complete all steps above to unlock' : undefined}
      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg transition-colors ${
        size === 'md' ? 'px-4 py-2 text-sm' : 'px-2.5 py-1 text-xs'
      } ${
        isThis
          ? 'bg-blue-200 text-blue-500 cursor-wait'
          : locked || isAny
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : size === 'md'
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-white hover:bg-blue-50 text-blue-600 border border-blue-300'
      }`}
    >
      {isThis ? (
        <>
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Analysing…
        </>
      ) : locked ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Complete all steps first
        </>
      ) : (
        <>
          Start now
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
          </svg>
        </>
      )}
    </button>
  )
}

export default function CareerLadder({ currentRole, immediateNext, fullLadder, longTermDestination, onStartNow, startingRole }: Props) {
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set())

  function toggleStep(key: string) {
    setCheckedSteps(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function isSkillConfirmed(skill: string): boolean {
    const steps = immediateNext.next_steps.filter(s => s.skill === skill)
    if (steps.length === 0) return false
    return steps.every((_, i) => checkedSteps.has(`${skill}::${i}`))
  }

  const skillsWithSteps = immediateNext.skill_delta.filter(skill =>
    immediateNext.next_steps.some(s => s.skill === skill)
  )
  const confirmedCount = skillsWithSteps.filter(skill => isSkillConfirmed(skill)).length
  const allChecked = skillsWithSteps.length === 0 || confirmedCount >= skillsWithSteps.length

  return (
    <div className="relative pl-8 border-l-2 border-blue-200">

      {/* Long-term north star */}
      <div className="mb-8 opacity-40">
        <div className="absolute -left-2.5 w-4 h-4 rounded-full bg-purple-300 border-2 border-white" />
        <p className="text-xs uppercase tracking-wide text-purple-500 font-semibold ml-4">Long-term goal</p>
        <p className="text-base font-bold text-purple-400 ml-4">{longTermDestination}</p>
      </div>

      {/* Distant future roles — locked, no Start now */}
      {[...fullLadder].reverse().map((rung) => (
        <div key={rung.role} className="mb-8 group">
          <div className="absolute -left-2 w-4 h-4 rounded-full bg-gray-300 border-2 border-white" />
          <div className="ml-4">
            <div className="flex items-center gap-3 opacity-50 group-hover:opacity-90 transition-opacity">
              <div>
                <p className="text-sm font-semibold text-gray-500">{rung.role}</p>
                <p className="text-xs text-gray-400">{rung.transferability_score}% transferable</p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="inline-flex items-center gap-1 text-xs text-gray-400 border border-gray-200 rounded px-2 py-0.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Complete {immediateNext.role} first
                </span>
              </div>
            </div>
            <div className="mt-1 hidden group-hover:block bg-white border shadow-md rounded-lg p-3 text-xs max-w-xs">
              <p className="font-medium text-gray-700 mb-1">{rung.why_good_fit}</p>
              {rung.skill_delta.length > 0 && (
                <p className="text-gray-500">
                  New skills needed: {rung.skill_delta.slice(0, 3).join(', ')}
                  {rung.skill_delta.length > 3 && ' …'}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Immediate next role — primary CTA with gated checklist */}
      <div className="mb-8 bg-blue-50 border-2 border-blue-400 rounded-xl p-5">
        <div className="absolute -left-3 w-5 h-5 rounded-full bg-blue-500 border-2 border-white" />
        <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">Your Next Step</p>
        <p className="text-xl font-bold text-blue-800 mb-1">{immediateNext.role}</p>
        <p className="text-sm text-blue-600">{immediateNext.transferability_score}% of your current skills transfer</p>
        <p className="text-sm text-gray-600 mt-2 italic">"{immediateNext.why_good_fit}"</p>

        {/* Skill delta — each skill with its per-step checklist */}
        {immediateNext.skill_delta.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">New skills you'll need:</p>
              {skillsWithSteps.length > 0 && (
                <span className="text-xs text-gray-400">{confirmedCount} / {skillsWithSteps.length} confirmed</span>
              )}
            </div>
            <div className="space-y-3">
              {immediateNext.skill_delta.map((skill) => {
                const steps = immediateNext.next_steps.filter(s => s.skill === skill)
                const confirmed = isSkillConfirmed(skill)

                return (
                  <div key={skill}>
                    {/* Skill header row */}
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        confirmed ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {confirmed && (
                          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 10 8">
                            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className={`text-xs font-semibold ${confirmed ? 'line-through text-gray-400' : 'text-blue-700'}`}>
                        {skill}
                      </span>
                    </div>

                    {/* Per-step checkboxes */}
                    {steps.length > 0 ? (
                      <div className="ml-5 space-y-1.5">
                        {steps.map((step, i) => {
                          const key = `${skill}::${i}`
                          const isChecked = checkedSteps.has(key)
                          return (
                            <label key={key} className="flex items-start gap-2 cursor-pointer">
                              <button
                                type="button"
                                onClick={() => toggleStep(key)}
                                disabled={!!startingRole}
                                className={`mt-0.5 w-3.5 h-3.5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                                  isChecked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'
                                } ${startingRole ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                              >
                                {isChecked && (
                                  <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 10 8">
                                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </button>
                              <span className={`text-xs leading-snug ${isChecked ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                                {step.summary || step.action}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      // Skill has no steps — show as static tag (fallback)
                      <div className="ml-5">
                        <span className="bg-white border border-blue-200 text-blue-700 text-xs px-2 py-0.5 rounded">
                          {skill}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {immediateNext.milestones.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">Milestones to get there:</p>
            <MilestoneChips milestones={immediateNext.milestones} />
          </div>
        )}

        {onStartNow && (
          <div className="mt-4">
            <StartNowButton
              role={immediateNext.role}
              onStartNow={onStartNow}
              startingRole={startingRole}
              locked={!allChecked}
              size="md"
            />
          </div>
        )}
      </div>

      {/* Current role */}
      <div className="mb-2">
        <div className="absolute -left-2 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
        <div className="ml-4">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">You are here</p>
          <p className="text-base font-bold text-gray-700">{currentRole}</p>
        </div>
      </div>

    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

From the `frontend/` directory:

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no errors. If TypeScript complains about `CareerNextStep` not found, confirm Task 3 was committed and `types.ts` exports `CareerNextStep`.

- [ ] **Step 3: Start the dev server and verify manually**

Start the frontend dev server (and backend if not running):

```bash
# In frontend/
npm run dev
```

Open the app, upload a resume, navigate to the Career Path page. Verify:

1. **Immediate next role card** — skill_delta items now appear as a grouped checklist with per-step checkboxes (not flat tags)
2. **"Start now" button is locked** — shows lock icon and text "Complete all steps first" while any step is unchecked
3. **Check off all steps for one skill** — that skill's label gains strikethrough + the circular indicator fills blue; counter increments (e.g. "1 / 3 confirmed")
4. **Check off all steps for all skills** — "Start now" turns blue and becomes clickable
5. **Uncheck a step** — button re-locks
6. **Full-ladder (distant) roles** — no "Start now" button; hovering shows a lock chip "Complete [immediateNext.role] first"
7. **If skill_delta is empty** for the immediate next role — no checklist shown; "Start now" is immediately active

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/CareerLadder.tsx
git commit -m "feat: gate career stage progression behind per-skill next-step checklist"
```

---

## Self-Review

**Spec coverage:**
- ✅ `CareerNextStep` model added to backend schema
- ✅ LLM prompt updated to generate 1–2 steps per skill_delta for first rung only
- ✅ Parsing loop updated to extract `next_steps`
- ✅ Frontend type updated
- ✅ Skill_delta rendered as grouped checklist with per-step checkboxes
- ✅ "Start now" locked until all steps checked
- ✅ Gate open if `next_steps` empty (no artificial friction)
- ✅ Full-ladder rungs: no "Start now", locked chip with next-stage name
- ✅ Checked state resets on page reload (no persistence)
- ✅ Checkboxes disabled while `startingRole` spinner active
- ✅ Skills with no matching steps fall back to static tag

**Placeholder scan:** None found — all steps have complete code.

**Type consistency:**
- `CareerNextStep` defined in Task 1 (backend) and Task 3 (frontend); used in Task 2 (parsing) and Task 4 (UI) — consistent
- `next_steps` field name consistent across schema, types, and component
- Step key format `"${skill}::${i}"` used consistently in `toggleStep`, `isSkillConfirmed`, and the render loop
