# PlannerSpec - 2026-05-06-latest-main-release-sync

## 1) Project Goal
- Business goal: Promote current origin/main to staging and prod so local, GitHub and cloud run the same latest SHA.
- User value: Keep local development, GitHub history, and the live cloud environment aligned so follow-up work starts from a trusted baseline.
- Success metrics: staging and prod both report the same version SHA as origin/main, and prod returns to idle after verification.

## 2) Scope
### In Scope
- Release documentation for this sync run.
- Release preflight checks against current main.
- Staging deployment and quick smoke verification.
- Prod deployment and quick smoke verification.
- Final three-end alignment confirmation: local, GitHub, staging, prod.

### Out of Scope
- No feature implementation; release synchronization only.

## 3) Module Breakdown
- Release guard:
  - Responsibilities: Verify artifact presence, clean git state, main alignment, and build readiness before promotion.
  - Dependencies: `.agents/skills/gobs-release-guard/`, `git`, build commands.
- Smoke verification:
  - Responsibilities: Confirm environment marker, version endpoint, and key routes on staging and prod.
  - Dependencies: `.agents/skills/gobs-h5-smoke-test/`, deployed H5 endpoints.
- Release records:
  - Responsibilities: Record what SHA was promoted, what checks passed, and any accepted residual risks.
  - Dependencies: current run folder artifacts.

## 4) Technical Approach
- Use the current `main` HEAD as the only release source.
- Record a minimal run folder for this promotion so the release has a traceable anchor.
- Run `gobs-release-guard` preflight before staging.
- Deploy to staging, then run quick smoke and mark release-ready.
- Run `gobs-release-guard` prod-release checks before prod.
- Deploy to prod, run quick smoke, and restore deployment state to idle.
- Do not change product/runtime code during this run unless a release blocker is discovered.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Prod lags behind main | Latest repo commits were not previously promoted | Local context diverges from live system | Verify current prod SHA first and promote through staging | Integrator |
| Docs-only latest commit | Final release SHA may differ from previously verified SHA | Staging/prod can drift if final docs commit is skipped | Promote the exact latest main SHA end-to-end | Integrator |
| Release regressions | Build or deploy scripts fail on staging/prod | Live rollout blocked | Use repo guardrails and stop before prod on NO-GO | Integrator |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | staging and prod both serve the same SHA as origin/main | release guard + smoke_http version check | local HEAD, origin/main, staging, and prod all resolve to the same short SHA |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Preflight passes, staging deploy succeeds, smoke passes, prod deploy succeeds, smoke passes. |
| Edge cases | Prod is behind main but still healthy before release. |
| Error path | Release guard blocks if build fails or required artifacts are missing. |
| Regression | Key routes `/`, `/studio/production`, `/quickfilm`, `/history` remain reachable after deploy. |
| Stress/Stability | Deployment state returns to `idle` after prod verification. |

## 8) Delivery Artifacts
- Code changes: current run docs only, unless a release blocker requires a fix.
- Test evidence: release guard output, build output, staging smoke output, prod smoke output.
- Documents to update: current run artifacts.
