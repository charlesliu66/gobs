# ReleaseDecision - 2026-05-09-advanced-studio-template-optimization

## 1) Inputs Reviewed
- PlannerSpec: `docs/workflow/runs/2026-05-09-advanced-studio-template-optimization/planner-spec.md`
- BuilderReport: `docs/workflow/runs/2026-05-09-advanced-studio-template-optimization/builder-report.md`
- VerifierReport: `docs/workflow/runs/2026-05-09-advanced-studio-template-optimization/verifier-report.md`
- Additional evidence: `eval-result.json`, targeted frontend/backend tests, `git diff --check`

## 2) Delivery Decision
- Decision: GO for local commit and push to `origin/main`; implementation completed as `aab3fa3`, with release-blocker documentation pushed as `3918efa`. Staging deployment was attempted again after local deploy credentials were configured, but deployment is currently blocked by network/server connectivity: `deploy_api.py --target staging` timed out while connecting to `43.134.186.196`, and independent socket checks timed out on ports `22`, `80`, and `8080`. Prod is not approved in this decision.
- Decision time: 2026-05-09
- Decision owner: codex

## 3) Blocking Issues
| ID | Severity | Description | Owner | Required before release |
|---|---|---|---|---|
| REL-001 | P1 | Staging deploy cannot complete from this machine because `43.134.186.196` is unreachable. `SERVER_PASSWORD` is now present in local ignored config, but `deploy_all.py --target staging --updated-by codex` fails during SFTP/SSH connection with `TimeoutError: timed out`; socket checks also timed out for `22`, `80`, and `8080`. | Release owner | Restore network/server reachability, then rerun staging deploy from the same committed SHA. |

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
- What is guaranteed: Local code builds, tests, API health, commit, and GitHub push pass; Studio active templates and fallback data are reduced to the Phase 1 set.
- What is not guaranteed: Staging/prod behavior until server connectivity is restored and staging is deployed/smoke-tested; Phase 2+ features such as AI image generation, BGM, transitions, and new model providers.
- Environments validated: Local build/test/eval only.

## 7) Next Actions
1. Restore access to `43.134.186.196` from this machine or run from a network/machine that can reach SSH `22`; also check Tencent Cloud security group/firewall and whether the CVM is healthy.
2. Rerun `PATH="$HOME/.local/bin:$PATH" python scripts/deploy_all.py --target staging --updated-by codex` after connectivity is restored.
3. Smoke `/studio` on staging before any prod decision.
4. Start a separate Phase 2 run for Unified Asset Selector and AI-generated reference image fallback.
