# ChallengerReview - 2026-05-09-advanced-studio-template-optimization

## 1) Inputs
- PlannerSpec file: `docs/workflow/runs/2026-05-09-advanced-studio-template-optimization/planner-spec.md`
- Planner version/date: 2026-05-08T18:38:21Z

## 2) Challenge Findings
| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Frontend fallback | must-fix | Removing templates only on the backend is insufficient because `FALLBACK_TEMPLATES` can bring them back when the API is unavailable. | Users would still see deprecated short-drama/cg-trailer entries in exactly the failure mode fallback is designed for. | Clean frontend fallback data and add regression coverage. |
| C-002 | Parameter flexibility | must-fix | Template polish currently writes backend default `duration/aspectRatio` back into state. | This can erase user-selected Phase 1 options such as Motion Transfer 10s or Character Showcase 9:16. | Keep valid current values for flexible templates. |
| C-003 | Scope control | should-fix | The source plan includes AI image generation, BGM, transitions, and new model providers. | Those require new APIs/assets/env and are not safe inside the first cleanup run. | Explicitly mark them Phase 2+ backlog only. |

## 3) Plan Improvement Requests
- Request 1:
  - Planner section to update: `## 4) Technical Approach`
  - Expected revision: Use stable template IDs for Phase 1 while changing marketer-facing naming.
- Request 2:
  - Planner section to update: `## 6) Acceptance Criteria`
  - Expected revision: Split backend template removal, frontend fallback removal, and flexible option behavior into separately testable ACs.

## 4) Gate 1.5 Verdict
- Verdict: Pass
- Blocking item count: 0
- Notes: Build may start because all must-fix issues were folded into the plan and ACs before code edits.

## 5) Residual Risks Accepted for Build
- Risk: `boss-showcase` keeps its legacy ID for this run even though the user-facing name becomes Character Showcase.
  - Why accepted now: Avoids broad migration risk across generation history, prompt polish, and batch paths.
  - Boundary: UI/API metadata must consistently present Character Showcase; ID rename can be a later migration if still desired.
  - Follow-up gate: Verifier
