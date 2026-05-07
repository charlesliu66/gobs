# ReleaseDecision - 2026-05-07-campaign-to-distribution-handoff-mvp

## 1) Inputs Reviewed
- PlannerSpec: `docs/workflow/runs/2026-05-07-campaign-to-distribution-handoff-mvp/planner-spec.md`
- BuilderReport: `docs/workflow/runs/2026-05-07-campaign-to-distribution-handoff-mvp/builder-report.md`
- VerifierReport: `docs/workflow/runs/2026-05-07-campaign-to-distribution-handoff-mvp/verifier-report.md`
- Additional evidence:
  - `python scripts/deploy_all.py --target staging` deployed `c2fc133` and passed version consistency checks for staging.
  - `smoke_http.ps1 -Env staging -Depth full -ExpectedCommit c2fc133` passed with warnings.
  - Authenticated staging API smoke passed: `login -> mission-brief -> create/list/get/patch package` for package `cdp_ytAcghZT9L`.
  - `python scripts/mark_release_ready.py --updated-by codex` wrote the guarded staging release-ready marker for `c2fc1335c1638184882cfae91a254cd6992048a4`.
  - `python scripts/deploy_all.py --target prod --updated-by codex` deployed `c2fc133` and passed version consistency checks for prod.
  - `smoke_http.ps1 -Env prod -Depth full -ExpectedCommit c2fc133` passed with warnings.
  - Authenticated prod API smoke passed without mutating package data: `login -> mission-brief -> list packages`.
  - `python scripts/set_deployment_state.py --target prod --phase idle --updated-by codex` restored prod to `idle`.

## 2) Delivery Decision
- Decision: GO
- Decision time: 2026-05-07T18:19:47+08:00
- Decision owner: codex

## 3) Blocking Issues
| ID | Severity | Description | Owner | Required before release |
|---|---|---|---|---|
| None | - | No P0/P1 blocker remained after staging/prod verification. | codex | No |

## 4) Accepted Risks
| Risk | Severity | Why accepted | Boundary/Workaround | Follow-up date |
|---|---|---|---|---|
| Public-env visual browser smoke was not completed in the in-app browser | Medium | Browser-use could not reliably open the public staging URL, so public visual validation fell back to deterministic HTTP smoke plus authenticated API verification. | Local browser smoke already covered the full mission-first handoff UI, and staging/prod both passed route/version/API checks on the deployed SHA. | 2026-05-08 |
| GeeLark publish-history subpanel was not visually rechecked on staging/prod | Medium | Local smoke showed an existing local-env history auth warning, but the release focus stayed on the new package handoff and deploy safety. | Route reachability, auth, mission-brief, and package endpoints passed on staging/prod; follow up with a real browser session against `/distribute` history when public browser tooling is stable. | 2026-05-08 |
| No mutation-based package creation smoke was run on prod | Low | Avoided polluting prod with a synthetic pending package record. | Prod verification used `login -> mission-brief -> list packages`; full create/update behavior was validated on staging before promotion. | 2026-05-08 |

## 5) Scope Compliance
- Delivered in scope: Yes. The release contains the pending distribution package API/persistence, Campaign Creative package creation panel, Distribution pending-package intake, and the login auth-base consistency fix needed for isolated browser smoke.
- Out-of-scope changes found: None.
- Notes: No AGENTS.md forbidden files were touched. No scheduling engine, analytics dashboard, automatic social publishing, or broad EditorWorkbench refactor was introduced. The repo-level `release_guard.ps1` helper was not treated as authoritative for this worktree because it resolves the main workspace root; authoritative guard evidence came from worktree-local deploy scripts and `scripts/workflow_guard.py`.

## 6) Release Boundary
- What is guaranteed: The `Campaign Creative -> Distribution Handoff MVP` behavior introduced in feature baseline `c2fc133` is included in the current mainline release and was validated for mission-first brief generation, pending-package persistence on staging, explicit-account Distribution intake behavior in local browser smoke, route/version health in staging/prod, and authenticated campaign API health in prod.
- What is not guaranteed: Public-env visual browser walkthroughs of `/campaign-creative` and `/distribute?package=` were not completed inside the in-app browser, race/concurrency behavior was not stress-tested, and the GeeLark publish-history panel was not specifically revalidated on staging/prod.
- Environments validated: Local isolated worktree app, staging (`http://43.134.186.196:8080`), and prod (`http://43.134.186.196`).

## 7) Next Actions
1. Re-run a real browser session against staging/prod `/distribute` once public-URL browser automation is stable, with special attention to the publish-history panel.
2. Watch the first real marketer-created pending package and confirm the asset-library / Quick Film follow-through path feels clear without the Editor detour.
3. If follow-up smoke stays clean, consider small UX polish for pending-package empty/needs-asset copy rather than broad workflow expansion.
