# ChallengerReview - 2026-05-11-legacy-surface-reduction

## 1) Inputs
- PlannerSpec file: `docs/workflow/runs/2026-05-11-legacy-surface-reduction/planner-spec.md`
- Planner version/date: 2026-05-11T07:04:21Z

## 2) Challenge Findings
| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Route safety | must-fix-before-build | Hiding legacy surfaces must not remove direct routes in the same change. | External bookmarks or support workflows may still depend on `/tiktok-matrix` or Platform direct links. | Keep `App.tsx` routes read-only and add a test proving direct routes remain. |
| C-002 | Rollback safety | must-fix-before-build | Deleting `src/sj-ui` together with nav changes would create a noisy rollback boundary. | The checklist requires a separate commit if `sj-ui` is deleted. | Defer `sj-ui` deletion and only test its isolation in this run. |
| C-003 | Scope focus | should-fix-in-plan | This run can drift into large component or distribution refactors. | It would mix cleanup with product behavior and increase release risk. | Keep changes to `Layout.tsx`, tests, and docs. |

## 3) Plan Improvement Requests
- Request 1: Satisfied in PlannerSpec `## 4) Technical Approach`; direct routes are preserved and only nav visibility changes.
- Request 2: Satisfied in SESSION-ANCHOR out-of-scope; `sj-ui` deletion is deferred.

## 4) Gate 1.5 Verdict
- Verdict: Pass
- Blocking item count: 0
- Notes: Build may start after source-presence tests are added before final verification.

## 5) Residual Risks Accepted for Build
- Risk: Operators who used the sidebar for `/tiktok-matrix` need a direct URL.
  - Why accepted now: The route and legacy redirects remain live for this release.
  - Boundary: No route removal or data/API behavior change.
  - Follow-up gate: Verifier and release smoke.
