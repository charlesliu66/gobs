# PlannerSpec - 2026-05-11-distribution-bridge-upgrade

## 1) Project Goal
- Business goal: Upgrade the Campaign to Distribution bridge so text outputs and Banner prompt context enter the distribution flow honestly and usefully.
- User value: Reduce operator involvement while improving delivery stability.
- Success metrics: Fewer scope collisions, faster run setup, and repeatable pre-release checks.

## 2) Scope
### In Scope
- Repo-local workflow automation for this run.
- Run artifacts, guardrails, and documentation needed for multi-agent delivery.

### Out of Scope
- TabDistribute structural split
- Real social publishing automation beyond existing guarded flows
- Asset schema or Drive ingest redesign
- Deployment actions

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
| AC-01 | Distribution packages can consume structured text outputs and Banner prompt context without pretending they are directly publishable media. | [TODO] | [TODO] |
| AC-02 | Campaign and distribute surfaces show the new bridge state clearly and preserve existing package lineage contracts. | [TODO] | [TODO] |
| AC-03 | Targeted tests plus local frontend/backend builds cover the bridge behavior before the later distribute refactor. | [TODO] | [TODO] |

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
- Test evidence: Python unit tests, workflow guard dry-runs, `bash scripts/eval.sh 2026-05-11-distribution-bridge-upgrade`.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
