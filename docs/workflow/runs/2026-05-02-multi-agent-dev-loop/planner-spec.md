# PlannerSpec - 2026-05-02-multi-agent-dev-loop

## 1) Project Goal
- Business goal: Land repo-local multi-agent workflow guardrails for lower-touch GOBS delivery.
- User value: Reduce operator involvement while improving delivery stability.
- Success metrics: Fewer scope collisions, faster run setup, and repeatable pre-release checks.

## 2) Scope
### In Scope
- Repo-local workflow automation for this run.
- Run artifacts, guardrails, and documentation needed for multi-agent delivery.

### Out of Scope
- Business feature changes in h5-video-tool or h5-video-tool-api runtime flows.
- Changes to forbidden provider service files or deployment credentials.

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
| AC-01 | Run bootstrap creates the full 4+1 artifact set with a scope-first SESSION-ANCHOR. | `python scripts/init_workflow_run.py ...` plus unit test coverage in `scripts.tests.test_init_workflow_run` | A new run folder is generated with all required artifacts and the anchor captures editable scope, references, and escalation rules. |
| AC-02 | Workflow guard blocks forbidden or out-of-scope edits and enforces PRODUCT update before verify/release. | `python scripts/workflow_guard.py --stage build/verify` plus unit test coverage in `scripts.tests.test_workflow_guard` | Guard returns the expected PASS/WARN/FAIL outcomes for forbidden paths, unrelated docs noise, and missing `PRODUCT.md` updates. |
| AC-03 | Repo-local docs and skill instructions teach future agents how to use the self-loop with minimal user coordination. | Review updated docs and skill files under `docs/workflow/` and `.agents/skills/gobs-multi-agent-dev-loop/` | The repo contains an Orchestrator prompt, SessionAnchor contract, refreshed templates, and a reusable repo-private skill. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Run bootstrap creates all required files and a dogfooded run folder for this task. |
| Edge cases | Existing run folder without `--force` is rejected. |
| Error path | Guard fails on forbidden files, out-of-scope code edits, or missing `PRODUCT.md` updates before verify/release. |
| Regression | Existing workflow docs remain consistent with new scripts, prompts, and templates. |
| Stress/Stability | Guard handles unrelated dirty docs without misclassifying them as in-scope code edits. |

## 8) Delivery Artifacts
- Code changes: workflow docs, scripts, optional skill docs, tests.
- Test evidence: Python unit tests, workflow guard dry-runs, `bash scripts/eval.sh 2026-05-02-multi-agent-dev-loop`.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
