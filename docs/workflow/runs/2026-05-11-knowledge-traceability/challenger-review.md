# ChallengerReview - 2026-05-11-knowledge-traceability

## 1) Inputs
- PlannerSpec file: `docs/workflow/runs/2026-05-11-knowledge-traceability/planner-spec.md`
- Planner version/date: 2026-05-11T04:05:06Z

## 2) Challenge Findings
| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Data integrity | must-fix-before-build | Citation feedback must not mutate imported knowledge packs directly. | Rejected operator feedback should influence generation without corrupting the canonical brain. | Store feedback in a separate per-game file and derive suppression from that file. |
| C-002 | Prompt safety | should-fix-in-build | Full citation objects should not be inserted into the LLM prompt. | The mission-brief prompt already has a compactness guard; adding full metadata risks regression. | Keep citations for UI/API response only; prompt uses filtered derived arrays. |
| C-003 | Persistence | should-fix-in-build | Output-plan backend validation must preserve optional knowledge references. | Otherwise references could appear in the draft and disappear after save/update. | Add validator support and tests. |

## 3) Plan Improvement Requests
- Request 1:
  - Planner section to update: `## 4) Technical Approach`
  - Expected revision: Clarify citation-id stability, feedback storage, and suppression flow.

## 4) Gate 1.5 Verdict
- Verdict: Pass
- Blocking item count: 0
- Notes: Build may start. The must-fix item is now represented directly in the technical approach and scope.

## 5) Residual Risks Accepted for Build
- Risk:
  - Why accepted now: Citation labels may be compact rather than exhaustive in the first UI pass.
  - Boundary: AC only requires at least 3 visible cited entries or explicit no-citation messaging.
  - Follow-up gate: Verifier
