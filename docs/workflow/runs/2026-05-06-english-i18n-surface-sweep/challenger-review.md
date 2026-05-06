# ChallengerReview - 2026-05-06-english-i18n-surface-sweep

## 1) Inputs
- PlannerSpec file: `docs/workflow/runs/2026-05-06-english-i18n-surface-sweep/planner-spec.md`
- Planner version/date: 2026-05-06T10:37:14Z

## 2) Challenge Findings
| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Release discipline | must-fix-in-plan | This repo is already dirty on `main`, so release steps must explicitly avoid bundling unrelated staged work. | A successful staging verification is meaningless if prod deploy later includes extra local changes. | Anchor the release path to a pushed commit only and call out stop conditions if unrelated work cannot be isolated. |
| C-002 | Scope control | should-fix-in-plan | `EditorWorkbench` has many nested surfaces; the run must define which shell/dialog strings count as in-scope. | Without a visible cutoff, builder can balloon into whole-editor translation work. | Restrict this run to shell/high-traffic dialog copy and list any leftovers in verifier output. |

## 3) Plan Improvement Requests
- Request 1:
  - Planner section to update: `## 4) Technical Approach`
  - Expected revision: Clarify the English i18n migration path (`messages.ts` over `pickUiText`) and how release stays tied to a pushed commit.
- Request 2:
  - Planner section to update: `## 2) Scope`
  - Expected revision: State the concrete `EditorWorkbench` boundary so Builder does not expand into unrelated editor subsystems.

## 4) Gate 1.5 Verdict
- Verdict: Pass
- Blocking item count: 0
- Notes: Build may start after the run anchor lists editable files explicitly.
- Notes: Planner now calls out editor-shell scope and release-on-pushed-commit discipline, so Builder can start.

## 5) Residual Risks Accepted for Build
- Risk:
  - Why accepted now: Existing user-local dirty docs are common in this repo and not all belong to this run.
  - Boundary: Treat unrelated docs as warnings until release, but stop before commit/deploy if scoped staging cannot be isolated.
  - Follow-up gate: Verifier / Integrator
