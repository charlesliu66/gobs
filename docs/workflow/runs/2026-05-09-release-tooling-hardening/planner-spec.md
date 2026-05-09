# PlannerSpec - 2026-05-09-release-tooling-hardening

## 1) Project Goal
- Business goal: Harden release tooling so Python 3.10 deploy machines can mark/promote releases and Paramiko deploy scripts finish deterministically after successful uploads.
- User value: Reduce operator involvement while improving delivery stability.
- Success metrics: Fewer scope collisions, faster run setup, and repeatable pre-release checks.

## 2) Scope
### In Scope
- Python 3.10 compatibility for release timestamp helpers used by `mark_release_ready.py`, `set_deployment_state.py`, `release_guard.py`, and related deploy initialization tooling.
- Deterministic SSH upload behavior in `deploy_api.py` and `deploy_frontend.py`, including finite channel timeouts, clearer progress, resource cleanup in `finally`, and non-zero remote command failures surfacing as local errors.
- Regression tests for release timestamp generation and deploy helper behavior.
- Product/changelog/run documentation for the release tooling hardening.

### Out of Scope
- No product UI or Campaign/Studio/Distribution behavior changes.
- No server env var changes or provider integration changes.
- No emergency-bypass or prod release without Verifier GO.

## 3) Module Breakdown
- Timestamp helpers:
  - Responsibilities: Generate ISO-8601 UTC timestamps without relying on Python 3.11-only `datetime.UTC`.
  - Dependencies: Python 3.10+ stdlib only.
- Deploy SSH helpers:
  - Responsibilities: Connect with bounded timeouts, upload local `dist/` trees as streamed tarballs, run remote PM2 commands, and close SSH resources predictably.
  - Dependencies: `paramiko`, deploy target config, local build artifacts.
- Release guard / state scripts:
  - Responsibilities: Preserve existing release-ready and deployment-state file contracts while working on the current deploy machine.
  - Dependencies: `scripts/deploy_config.py`, remote shared-data layout.

## 4) Technical Approach
- Architecture decisions: Keep all fixes inside release scripts; do not add env vars, deployment services, or external dependencies.
- Date compatibility: introduce a small module-local UTC fallback such as `UTC = getattr(dt, 'UTC', dt.timezone.utc)` and use it anywhere release scripts call `datetime.now()` or `astimezone()`.
- SSH upload reliability: add explicit connect/channel timeouts, keepalive, progress logging, `finally` cleanup, and remote command stderr/exit-code handling. Artifact uploads should stream through SSH directly into remote `tar` to bypass the Paramiko SFTP completion hang observed during staging.
- API or interface changes: Preserve CLI flags and output JSON shapes; internal helper functions may be added for testability.
- Migration or compatibility notes: No production runtime behavior should change; only the local release machine behavior changes.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Timeout too aggressive | Slow SSH upload over weak network | False deployment failure | Use conservative bounded upload timeouts and keep progress visible | Builder |
| Hidden Paramiko behavior | Mocked tests miss a real transport edge case | Tool appears fixed locally but still hangs remotely | Verify with a real staging deployment before prod promotion | Verifier |
| Script change is release-blocking | `scripts/deploy_*.py` changed | Release guard blocks prod until staging is verified | Follow normal staging -> mark release-ready -> prod flow | Integrator |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Python 3.10 can build release-ready and deployment-state timestamps without temporary datetime.UTC shims. | `python3 -m unittest scripts.tests.test_release_guard scripts.tests.test_set_deployment_state` on the default Python 3.10 runtime. | Tests import and pass without `sitecustomize`/`PYTHONPATH` shim. |
| AC-02 | deploy_api.py and deploy_frontend.py close SSH resources deterministically and do not hang after successful uploads or PM2 restarts. | Unit tests for helper configuration plus real staging deployment observation. | Upload scripts print progress, enforce finite SSH waits, close resources in `finally`, and finish staging deployment without manual kill. |
| AC-03 | Existing deploy guard, release guard, and deployment-state tests pass with added regression coverage for the compatibility and resource-close behavior. | `python3 -m unittest scripts.tests.test_deploy_api scripts.tests.test_deploy_config scripts.tests.test_deploy_all scripts.tests.test_release_guard scripts.tests.test_set_deployment_state`. | All targeted Python tests pass. |
| AC-04 | Run docs, PRODUCT.md, CHANGELOG.md, and TASK-INDEX.md record the release tooling hardening. | `workflow_guard --stage verify/release` and doc diff review. | Release artifacts and product changelogs describe the tooling fix and residual risks. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | `mark_release_ready.py` and `set_deployment_state.py` build timestamp payloads on Python 3.10. |
| Edge cases | Remote PM2 command returns stderr/non-zero; script raises `DeployRuntimeError` with stderr. |
| Error path | Missing runtime scripts and non-online PM2 statuses remain rejected. |
| Regression | Existing deploy config, release guard, deploy-all guard, and deployment state tests still pass. |
| Stress/Stability | Real staging deployment runs through API + frontend upload without needing manual process termination. |

## 8) Delivery Artifacts
- Code changes: workflow docs, scripts, optional skill docs, tests.
- Test evidence: Python unit tests, workflow guard dry-runs, `bash scripts/eval.sh 2026-05-09-release-tooling-hardening`.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
