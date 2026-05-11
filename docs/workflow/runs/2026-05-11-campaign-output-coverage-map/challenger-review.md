# ChallengerReview - 2026-05-11-campaign-output-coverage-map

## 1) Inputs
- PlannerSpec file: `docs/workflow/runs/2026-05-11-campaign-output-coverage-map/planner-spec.md`
- Planner version/date: 2026-05-11T09:11:01Z

## 2) Challenge Findings
| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Coverage semantics | must-fix-before-build | The new summary cannot treat `manual_recommended` as true production coverage. | That would inflate the headline metric and contradict the coverage-plan intent. | Keep `manual_recommended` mapped to a separate assistive/brief-ready bucket and test it directly. |
| C-002 | Contract safety | must-fix-before-build | Workbench work must not mutate `ProductionCapability` or `ProductionItemType` in `outputPlan.ts`. | Those enums already back stored plan data and adjacent workstreams. | Keep `outputPlan.ts` read-only and isolate changes to a new frontend helper plus UI/tests. |
| C-003 | Count correctness | should-fix-in-plan | Coverage rows that bundle multiple deliverables can mislead if summary counts use item-row count instead of `quantity`. | Banner and post packs would look smaller than they really are. | Build the summary from `item.quantity` and cover that behavior in a unit test. |

## 3) Plan Improvement Requests
- Request 1: Satisfied in PlannerSpec `## 4) Technical Approach`; readiness mapping is UI-only and additive.
- Request 2: Satisfied in PlannerSpec `## 6) Acceptance Criteria`; `manual_recommended` stays out of true coverage and quantity weighting is explicitly validated.

## 4) Gate 1.5 Verdict
- Verdict: Pass
- Blocking item count: 0
- Notes: Builder may start as long as `outputPlan.ts` remains read-only and tests cover readiness/count semantics.

## 5) Residual Risks Accepted for Build
- Risk: Existing Workbench copy and summary layout may need light iteration after the first build if the new metrics feel too dense.
  - Why accepted now: This run stays frontend-only and easy to adjust without touching contracts.
  - Boundary: No changes to backend, schema, or Output Plan enums.
  - Follow-up gate: Verifier and manual Workbench review.
