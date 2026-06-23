# Tasks 5-8 Report: OpenAI Service Layer

**Status:** DONE

## Commit
- `0277326` feat: add Tasks 5-8 — OpenAI service layer (skill extractor, ranker, gap analyser, next steps, career ladder)

## Test Summary
16/16 passed (7 prior + 9 new). All new tests written first (RED on ImportError), then services implemented (GREEN).

## Files Created

### Services
- `backend/services/skill_extractor.py` — `extract_skills(resume_text, session_id) -> list[ExtractedSkill]`
- `backend/services/skill_ranker.py` — `rank_skills(role, skills, session_id) -> list[TieredSkill]`
- `backend/services/gap_analyser.py` — `analyse_gaps(user_skills, tiered_role_skills) -> tuple[list[GapItem], CoverageScore]` (pure logic, no OpenAI)
- `backend/services/next_steps.py` — `generate_next_steps(role, gaps, session_id) -> list[str]`
- `backend/services/career_ladder.py` — `build_career_ladder(request, session_id) -> ProgressResponse`

### Tests
- `backend/tests/test_skill_extractor.py` — 2 tests
- `backend/tests/test_skill_ranker.py` — 2 tests
- `backend/tests/test_gap_analyser.py` — 3 tests (gap analysis + next steps)
- `backend/tests/test_career_ladder.py` — 2 tests

## Notes
- `openai` package was not installed; installed `openai==2.43.0` during implementation.
- All OpenAI calls are mocked in tests — no real API calls made.
- One pre-existing Pydantic V2 deprecation warning (class-based config in `config.py`) is unrelated to this task.

## Code Review Fixes (Commit 57e313c)
Applied three code review issues to backend/:

**Fix 1: career_ladder.py** — Added guard against empty ladder
- After building `ladder` list from `data["ladder"]`, check `if not ladder:` and raise `ValueError`
- Prevents IndexError on `ladder[0]` when API returns no results

**Fix 2: test_gap_analyser.py** — Added test for gap sort order
- New test `test_analyse_gaps_sorts_essential_first()` verifies gaps are sorted Essential → Important → Nice-to-have

**Fix 3: test_gap_analyser.py** — Replaced coverage score test with exact value assertions
- Replaced `test_coverage_score_format()` with `test_coverage_score_values()`
- Asserts exact values: essential="2/2", important="0/1", nice_to_have="0/1"

**Test Results:** 18/18 passing (16 prior + 2 new tests added)
