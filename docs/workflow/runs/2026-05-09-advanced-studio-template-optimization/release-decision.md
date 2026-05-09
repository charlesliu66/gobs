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
| OBS-002 | P2 | Prod routes and prompt template API appear to serve the current Studio Phase 1 behavior, but `/api/system/version` returns `commitShort=unknown` because prod is missing `api/build-info.json`. | Release owner | Sync prod build metadata or run a standard prod deployment after explicit prod approval. |

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
- What is guaranteed: Local code builds, tests, API health, commit, GitHub push, staging route smoke, staging frontend asset manifest, staging prompt template API, and staging release-ready marker all pass for `37ac488`.
- What is not guaranteed: Prod release metadata accuracy until `build-info.json` is restored; Phase 2+ features such as AI image generation, BGM, transitions, and new model providers.
- Environments validated: Local build/test/eval and staging smoke. Prod was inspected read-only; routes and prompt template API look current, but version metadata is not trustworthy.

## 7) Next Actions
1. If prod should become the official release, explicitly approve prod promotion, then run the normal prod gate from the staging-verified `37ac488`.
2. Fix prod version metadata (`api/build-info.json`) as part of the next prod release or an explicitly approved metadata-only prod maintenance action.
3. Prefer `.venv/bin/python` on this Mac for release scripts; it uses Python 3.11 and avoids the Python 3.10 `datetime.UTC` incompatibility in `mark_release_ready.py`.
4. Start a separate Phase 2 run for Unified Asset Selector and AI-generated reference image fallback.
