# Career Stage Gating — Design Spec
_Date: 2026-06-24_

## Problem

Users can currently click "Start now" on any career ladder rung — including distant future roles — and immediately jump to a gap analysis for that role without having earned any of the prerequisite skills. This undermines the progression model: there is no meaningful bridge between stages.

## Goal

Gate progression between career stages so that:
1. The user must check off **all** `skill_delta` items on the immediate next rung before "Start now" unlocks.
2. Distant future rungs (the `full_ladder`) cannot be jumped to at all — they are permanently locked until the user has sequentially progressed through the immediate next role.

---

## Scope

**In scope:**
- `CareerLadder.tsx` — all UI and state changes live here
- No backend changes
- No persistence across sessions (checked state resets on page reload)

**Out of scope:**
- Verified skill evidence (self-reported checkboxes, consistent with HistoryPage)
- Persisting checkbox state across sessions or users

---

## Architecture

All new state is local to `CareerLadder.tsx`. No new API calls, no store changes.

```ts
const [checked, setChecked] = useState<Set<string>>(new Set())
const allChecked =
  immediateNext.skill_delta.length === 0 ||
  checked.size >= immediateNext.skill_delta.length
```

- If `skill_delta` is empty the gate is open immediately (no artificial friction).
- Toggling a checkbox adds/removes the skill name from `checked`.
- `allChecked` drives whether "Start now" is enabled.

---

## UI Changes

### Immediate next card

**Before:** `skill_delta` items rendered as static blue tags.

**After:** Each item rendered as an interactive checkbox row.

```
New skills you'll need:     2 / 4 confirmed
☑ Python                    ← checked: strikethrough + muted text
☑ Machine Learning
☐ MLOps                     ← unchecked: normal text
☐ Data Pipeline Design

[🔒 Start now — check off all skills first]   ← locked (grayed, disabled)
[✓ Start now →]                               ← unlocked (blue, enabled)
```

- A counter `X / Y confirmed` sits next to the section header.
- Checked items render with strikethrough and muted text (mirrors HistoryPage visual language).
- When locked: button is grayed with a lock icon; `title` tooltip reads "Check off all skills above to unlock".
- When `startingRole` spinner is active: checkboxes are disabled (same `disabled={isAny}` guard already in use).

### Full ladder rungs (distant stages)

**Before:** Hover-reveal "Start now" button (small, `size="sm"`).

**After:** "Start now" button removed. A small locked chip replaces it:

```
Senior ML Engineer    42% transferable
[🔒 Complete Data Scientist first]
```

- The chip is always visible (not hover-only).
- The hover tooltip for `why_good_fit` and skill preview is retained.
- No path exists to jump a stage.

---

## Edge Cases

| Case | Behaviour |
|---|---|
| `skill_delta` is empty for immediateNext | Gate open immediately; no checkboxes shown |
| User unchecks a previously checked item | Counter decrements; button re-locks |
| `startingRole` spinner active | All checkboxes disabled |
| Full ladder rung has empty `skill_delta` | Still locked — gate is the role, not the delta |
| `progressResult` not yet loaded | Component not rendered; no edge case |

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/CareerLadder.tsx` | Add checkbox state, replace delta tags, lock full-ladder rungs |

No other files require changes.
