# ChallengerReview - 2026-05-07-gold-and-glory-single-brain-phase0

## 1) Inputs
- PlannerSpec file: `docs/workflow/runs/2026-05-07-gold-and-glory-single-brain-phase0/planner-spec.md`
- Planner version/date: 2026-05-07T05:29:01Z

## 2) Challenge Findings
| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Product truthfulness | must-fix-before-build | The shell fix must not imply that real Gold and Glory fastpublish knowledge has already been ingested. | Renaming demo UI without preserving this distinction would create false confidence and mislead operators. | Keep copy explicit that the brain target is Gold and Glory, but that missing packs still mean brief-only fallback. |
| C-002 | Scope | must-fix-before-build | Builder should not broaden this run into backend ingestion or template replacement. | The correct product call is to fix frontstage truth first; real brain ingestion is a separate feature. | Keep backend knowledge APIs and templates out of scope in both docs and changed files. |

## 3) Plan Improvement Requests
- Request 1:
  - Planner section to update: `## 4) Technical Approach`
  - Expected revision: Clarify that the fix is a frontstage shell correction only, not a real data-ingestion completion.
- Request 2:
  - Planner section to update: `## 6) Acceptance Criteria`
  - Expected revision: Add an explicit criterion that `Project Nova Arena` / `Idle Kingdom Go` no longer appear on marketer-facing campaign surfaces.

## 4) Gate 1.5 Verdict
- Verdict: Pass
- Blocking item count: 0
- Notes: Build may start because the planner now locks this run to truthful single-brain shell behavior only.

## 5) Residual Risks Accepted for Build
- Risk:
  - Why accepted now: Hidden `/platform/*` experiment pages may still carry future-extensibility seams internally.
  - Boundary: As long as marketer-facing `Home / Mission Control / Campaign Creative` no longer expose multi-project framing, the slice remains valid.
  - Follow-up gate: Verifier
