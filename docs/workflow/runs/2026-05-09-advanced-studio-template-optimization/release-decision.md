# ReleaseDecision - 2026-05-09-advanced-studio-template-optimization

## 1) Inputs Reviewed
- PlannerSpec: `docs/workflow/runs/2026-05-09-advanced-studio-template-optimization/planner-spec.md`
- BuilderReport: `docs/workflow/runs/2026-05-09-advanced-studio-template-optimization/builder-report.md`
- VerifierReport: `docs/workflow/runs/2026-05-09-advanced-studio-template-optimization/verifier-report.md`
- Additional evidence: `eval-result.json`, targeted frontend/backend tests, `git diff --check`

## 2) Delivery Decision
- Decision: GO for local commit and push to `origin/main`; implementation completed as `aab3fa3`, with release-blocker documentation pushed as `3918efa` and connectivity-blocker status pushed as `37ac488`. After VPN connectivity was restored, staging was verified at `37ac488` and marked release-ready. Prod is still not approved by this decision.
- Decision time: 2026-05-09
- Decision owner: codex

## 3) Blocking Issues
| ID | Severity | Description | Owner | Required before release |
|---|---|---|---|---|
| None | - | Staging is now reachable and verified at `37ac488`. | - | - |

## 3.1) Post-Deploy Observations
| ID | Severity | Description | Owner | Required before prod confidence |
|---|---|---|---|---|
| OBS-001 | P2 | This Mac's VPN path allowed SSH commands and HTTP checks but repeatedly stalled on Paramiko/SFTP and OpenSSH `scp` file uploads. Staging was recovered using server-side artifact sync and env restoration instead of local file upload. | Release owner | Prefer a cloud-side deploy runner or fix VPN upload stability before relying on local deploy uploads from this machine. |
| OBS-002 | Resolved | Prod routes and prompt template API served the current Studio Phase 1 behavior, but `/api/system/version` returned `commitShort=unknown` because prod was missing `api/build-info.json`. User approved a metadata-only maintenance action; prod `api/build-info.json` now points to deployed code commit `37ac488`, and prod smoke passed. | codex | No further action for this metadata issue. |

## 4) Accepted Risks
| Risk | Severity | Why accepted | Boundary/Workaround | Follow-up date |
|---|---|---|---|---|
| Legacy `boss-showcase` ID remains | Low | Avoids broad migration risk during Phase 1 cleanup | User-facing name/copy is Character Showcase; ID migration can be separate | Next Studio run |
| Asset Library unification not implemented | Medium | Explicit Phase 2 scope requiring broader picker/upload work | Existing Drive/character picker remains functional | Next Studio run |

## 5) Scope Compliance
- Delivered in scope: Yes, AC-01 through AC-06.
- Out-of-scope changes found: None.
- Notes: Protected service files and new provider/env work were not touched. Scope was updated before final guard to include prompt API cleanup, prompt-polish dead-code cleanup, utility extraction, and template registry tests that were required by the accepted ACs.

## 6) Release Boundary
- What is guaranteed: Local code builds, tests, API health, commit, GitHub push, staging route smoke, staging frontend asset manifest, staging prompt template API, staging release-ready marker, and prod metadata smoke all pass for deployed code commit `37ac488`.
- What is not guaranteed: Phase 2+ features such as AI image generation, BGM, transitions, and new model providers.
- Environments validated: Local build/test/eval, staging smoke, and metadata-only prod smoke. Prod version metadata is now trustworthy for `37ac488`; note that later docs-only commits such as `f7f6191` are not code artifacts and are not represented in deployed runtime metadata.

## 7) Next Actions
1. Prefer `.venv/bin/python` on this Mac for release scripts; it uses Python 3.11 and avoids the Python 3.10 `datetime.UTC` incompatibility in `mark_release_ready.py`.
2. Start a separate Phase 2 run for Unified Asset Selector and AI-generated reference image fallback.
