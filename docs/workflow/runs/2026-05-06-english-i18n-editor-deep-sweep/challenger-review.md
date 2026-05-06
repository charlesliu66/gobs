# ChallengerReview - 2026-05-06-english-i18n-editor-deep-sweep

## 1) Inputs
- PlannerSpec file: `docs/workflow/runs/2026-05-06-english-i18n-editor-deep-sweep/planner-spec.md`
- Planner version/date: 2026-05-06T11:48:08Z

## 2) Challenge Findings
| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Scope control | must-fix-in-plan | `Workspace` is ambiguous in the user request unless the run anchor names the exact step file. | Builder could drift into `StepExportWorkspace` or other studio panels. | Lock this run to `StepStoryboardWorkspace.tsx` and keep export surfaces out of scope. |
| C-002 | Release discipline | should-fix-in-plan | The root `main` workspace remains dirty while release must stay tied to a pushed commit. | Mixing trees would make staging/prod verification unreliable. | Keep build/release inside the isolated worktree and explicitly verify the promoted SHA on both environments. |

## 3) Plan Improvement Requests
- Request 1:
  - Planner section to update: `## 2) Scope`
  - Expected revision: Name `StepStoryboardWorkspace.tsx` explicitly and mark `StepExportWorkspace.tsx` out of scope.
- Request 2:
  - Planner section to update: `## 4) Technical Approach`
  - Expected revision: Clarify the migration path from `pickUiText(...)` to shared `messages.ts + t(...)`, and state that release runs only from the isolated worktree SHA.

## 4) Gate 1.5 Verdict
- Verdict: Pass
- Blocking item count: 0
- Notes: Build may start after the run anchor lists editable files explicitly.
- Notes: Planner now names `StepStoryboardWorkspace.tsx` as the scoped workspace step and keeps release tied to the isolated worktree SHA.

## 5) Residual Risks Accepted for Build
- Risk:
  - Why accepted now: Residual `pickUiText(...)` outside this run is already known and cannot be eliminated safely in one pass.
  - Boundary: Document remaining residue in verifier/release artifacts instead of widening scope late.
  - Follow-up gate: Verifier
