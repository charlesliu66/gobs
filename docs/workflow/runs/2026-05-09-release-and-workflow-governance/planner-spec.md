# PlannerSpec - 2026-05-09-release-and-workflow-governance

## 1) Project Goal
- Business goal: Stabilize dev-worker/release-owner collaboration and harden release upload scripts enough for a development-only handoff.
- User value: Reduce operator involvement while improving delivery stability.
- Success metrics: Fewer scope collisions, faster run setup, and repeatable pre-release checks.

## 2) Scope
### In Scope
- A concrete Dev Worker handoff path that stops at local commit and leaves deployment to a Release Owner window.
- Release/upload script hardening that improves reliability without changing runtime product behavior.
- Unit tests for the upload fallback and connection behavior.
- Product/task/run documentation needed for the Release Owner to continue.

### Out of Scope
- Running any staging or prod deploy command from this window.
- Publishing, pushing, or marking a release ready unless the user explicitly changes this run boundary.
- Campaign, Studio, Distribution, Editor, Production feature changes.
- `.env`, secrets, or provider service changes.

## 3) Module Breakdown
- Release collaboration docs:
  - Responsibilities: Make Dev Worker vs Release Owner boundaries operational, not just conceptual.
  - Dependencies: `docs/plans/`, `docs/guides/`, `docs/TASK-INDEX.md`, run artifacts.
- Artifact upload helper:
  - Responsibilities: Upload small archives with stdin streaming and larger archives through bounded base64 parts with optional fresh SSH sessions per part.
  - Dependencies: `scripts/deploy_api.py`, `scripts/deploy_frontend.py`.
- Test coverage:
  - Responsibilities: Prove password-only SSH remains intact, small archives stream normally, large archives use the chunked fallback, and fresh upload clients are closed.
  - Dependencies: `scripts/tests/test_deploy_api.py`.

## 4) Technical Approach
- Architecture decisions: Keep deployment behavior source-compatible for existing scripts, but add an optional `connect_factory` upload path so local upload callers can isolate large part transfers from the main command session.
- Data flow: Dev Worker produces a local commit plus run evidence; Release Owner later pulls/inspects the commit, performs staging/prod gates, and records release state.
- API or interface changes: Internal Python helper signatures may accept an optional upload connection factory; CLI flags and target behavior remain unchanged.
- Migration or compatibility notes: Small archive uploads continue to use stdin streaming. Large archive uploads continue to reconstruct the same remote tarball path before extraction.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Dirty worktree | Unrelated local edits exist outside run scope | False positives or accidental staging | Guard warns or fails by stage and path severity | Integrator |
| Workflow drift | Agents skip run artifacts | Build starts without clear scope | Run anchor and checklist are updated before implementation | Orchestrator |
| Tooling-only release gaps | Docs/scripts change without PRODUCT update | Lost internal change history | PRODUCT.md and CHANGELOG.md are updated in this commit | Builder |
| Upload helper regression | Existing deploy scripts call changed helpers | Deployment window blocked | Preserve existing defaults and add unit tests for both upload paths | Builder |
| Accidental deploy | Dev Worker runs release commands | Window ownership split collapses | Run anchor forbids deploy commands and final handoff stops at commit | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Dev Worker/Release Owner boundary is operationalized in docs. | Review guide, TASK index, and run artifacts. | A deployment window can continue from the commit without inferring missing steps. |
| AC-02 | Large archive upload has a safer fallback with optional fresh SSH sessions per part. | Python unit tests around `upload_archive_to_remote_path` / `upload_and_extract_archive`. | Tests prove small archive streaming and large archive chunking both work. |
| AC-03 | No staging/prod deployment is performed by this run. | Command history and verifier notes. | Commit exists locally; deploy remains explicitly out of scope. |
| AC-04 | Product/changelog documentation records the governance change. | Inspect `PRODUCT.md` and `CHANGELOG.md`. | Internal change history mentions release collaboration and upload hardening. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Small archive upload streams through stdin and extraction still happens. |
| Edge cases | Large archive upload splits into parts, reconstructs the remote archive, and closes temporary upload clients. |
| Error path | Existing remote command timeout/failure tests still pass. |
| Regression | Password-only SSH settings remain unchanged. |
| Stress/Stability | Upload part size stays bounded so deployment does not depend on one long-lived stdin channel for multi-MB archives. |

## 8) Delivery Artifacts
- Code changes: deploy upload helpers, tests, workflow/product docs.
- Test evidence: Python unit tests, scoped build/guard checks when available.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
