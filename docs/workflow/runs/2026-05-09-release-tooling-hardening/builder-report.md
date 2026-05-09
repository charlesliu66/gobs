# BuilderReport - 2026-05-09-release-tooling-hardening

## 1) Inputs
- Spec file: `docs/workflow/runs/2026-05-09-release-tooling-hardening/planner-spec.md`
- Spec version/date: 2026-05-09T06:29:57Z
- Acceptance criteria covered: AC-01 through AC-04

## 2) Implemented
| AC ID | What was implemented | Files changed | Notes |
|---|---|---|---|
| AC-01 | Replaced Python 3.11-only `dt.UTC` usage with `dt.timezone.utc` compatibility in release/state timestamp helpers and the dual-env init script. | `scripts/release_guard.py`, `scripts/set_deployment_state.py`, `scripts/init_dual_env_server.py`, tests | `mark_release_ready.py` benefits through `build_verified_release_payload()`. |
| AC-02 | Added bounded SSH/SFTP behavior: SSH connect/auth/banner timeouts, transport keepalive, SFTP channel timeout, remote command stdout/stderr draining, remote command timeout/failure errors, deterministic cleanup, and non-zero CLI exits on failure. | `scripts/deploy_api.py`, `scripts/deploy_frontend.py` | Frontend deploy now prints recursive upload progress so long uploads are visible. |
| AC-03 | Added/updated regression coverage for Python 3.10 timestamp imports, SFTP timeout configuration, remote command timeout/failure paths, frontend upload cleanup, and existing release gates. | `scripts/tests/test_deploy_api.py`, `scripts/tests/test_deploy_frontend.py`, `scripts/tests/test_release_guard.py`, `scripts/tests/test_set_deployment_state.py` | Targeted release/deploy unittest slice passes on default `python3` 3.10. |
| AC-04 | Recorded the run and product history. | `docs/TASK-INDEX.md`, `PRODUCT.md`, `CHANGELOG.md`, run docs | Release evidence still pending Verifier and staging deployment observation. |

## 3) Not Implemented
| AC ID | Reason | Impact | Proposed next step |
|---|---|---|---|
| [None] | - | - | - |

## 4) Self-Test Results
| Test type | Command/Method | Result | Evidence |
|---|---|---|---|
| Unit | `python3 -m unittest scripts.tests.test_init_dual_env_server scripts.tests.test_release_guard scripts.tests.test_set_deployment_state scripts.tests.test_deploy_api scripts.tests.test_deploy_frontend scripts.tests.test_deploy_all scripts.tests.test_deploy_config` | Pass | 39 tests passed on default Python 3.10. |
| Scope guard | `python3 scripts/workflow_guard.py --run-id 2026-05-09-release-tooling-hardening --stage build` | Pass | Guard checked script/test/doc/product changes with no findings. |

## 5) Known Risks and Uncertainties
- Risk:
  - Why it remains: Paramiko hang behavior is partly environment-dependent.
  - Possible impact: Unit tests can prove timeout/error helpers, but a real network/SFTP path is still needed before release GO.
  - Suggested follow-up: Verifier must run a real staging deployment and confirm scripts exit without manual kill.

## 6) Scope Compliance Statement
- I did not expand scope beyond the approved PlannerSpec: Yes
- If No, list deviations and reasons: N/A. The only scope expansion was explicitly recorded in `SESSION-ANCHOR.md` for `scripts/init_dual_env_server.py` after finding the same Python 3.10 UTC issue.

## 7) Change Summary
- What changed: Release scripts now work on Python 3.10 without UTC shims and deploy scripts have finite SSH/SFTP waits plus cleanup.
- Why changed: The previous production deployment required a temporary `sitecustomize.py` shim and manual local process termination after remote deploy success.
- What did not change: Product UI, Campaign/Studio/Distribution behavior, server env vars, provider integrations, and release guard policy.
