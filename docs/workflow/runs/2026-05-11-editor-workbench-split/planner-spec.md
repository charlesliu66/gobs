# PlannerSpec - 2026-05-11-editor-workbench-split

## 1) Project Goal
- Business goal: Split EditorWorkbench into smaller bounded modules without changing editing behavior.
- User value: Reduce operator involvement while improving delivery stability.
- Success metrics: Fewer scope collisions, faster run setup, and repeatable pre-release checks.

## 2) Scope
### In Scope
- Repo-local workflow automation for this run.
- Run artifacts, guardrails, and documentation needed for multi-agent delivery.

### Out of Scope
- ProductionWizard refactor internals
- Production to Editor bridge enhancements before the refactor settles
- Distribution page changes
- Deployment work

## 3) Module Breakdown
- Workflow bootstrap:
  - Responsibilities: Create a fresh run folder with required artifacts.
  - Dependencies: `docs/workflow/*`, `scripts/`.
- Workflow guard:
  - Responsibilities: Enforce scope boundaries and stage readiness checks.
  - Dependencies: `git status`, `SESSION-ANCHOR.md`, run artifacts.

## 4) Technical Approach
- Architecture decisions: Keep the workflow repo-local and text-first so Codex, Cursor, and Claude can all use it.
- Data flow: Session anchor defines editable scope, guard validates changed paths, eval/build evidence feeds verifier.
- API or interface changes: CLI commands only.
- Migration or compatibility notes: No production runtime behavior should change.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Dirty worktree | Unrelated local edits exist outside run scope | False positives or accidental staging | Guard warns or fails by stage and path severity | Integrator |
| Workflow drift | Agents skip run artifacts | Build starts without clear scope | Guard requires run docs by stage | Orchestrator |
| Tooling-only release gaps | Docs/scripts change without PRODUCT update | Lost internal change history | Guard enforces PRODUCT.md on verify/release | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | EditorWorkbench becomes a thinner container with extracted state and panel modules. | [TODO] | [TODO] |
| AC-02 | Existing editor timeline, preview, export, and side-panel behavior remain intact. | [TODO] | [TODO] |
| AC-03 | Targeted tests and local frontend/backend builds validate the refactor boundary. | [TODO] | [TODO] |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Run bootstrap creates all required files. |
| Edge cases | Existing run folder without `--force` is rejected. |
| Error path | Guard fails on forbidden files or missing artifacts. |
| Regression | Existing workflow docs remain consistent with new scripts. |
| Stress/Stability | Guard handles unrelated dirty docs without misclassifying them as in-scope code edits. |

## 8) Delivery Artifacts
- Code changes: workflow docs, scripts, optional skill docs, tests.
- Test evidence: Python unit tests, workflow guard dry-runs, `bash scripts/eval.sh 2026-05-11-editor-workbench-split`.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
