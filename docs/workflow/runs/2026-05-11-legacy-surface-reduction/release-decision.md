# ReleaseDecision - 2026-05-11-legacy-surface-reduction

## 1) Inputs Reviewed
- PlannerSpec: `docs/workflow/runs/2026-05-11-legacy-surface-reduction/planner-spec.md`
- BuilderReport: `docs/workflow/runs/2026-05-11-legacy-surface-reduction/builder-report.md`
- VerifierReport: `docs/workflow/runs/2026-05-11-legacy-surface-reduction/verifier-report.md`
- Additional evidence: `docs/workflow/runs/2026-05-11-legacy-surface-reduction/eval-result.json`, targeted legacy-surface test, API/frontend builds, workflow guard.

## 2) Delivery Decision
- Decision: GO
- Decision time: 2026-05-11T07:10:00Z
- Decision owner: codex

## 3) Blocking Issues
| ID | Severity | Description | Owner | Required before release |
|---|---|---|---|---|
| None | N/A | No commit, merge, or deployment-blocking issues found. | N/A | N/A |

## 4) Accepted Risks
| Risk | Severity | Why accepted | Boundary/Workaround | Follow-up date |
|---|---|---|---|---|
| `/tiktok-matrix` is less discoverable from sidebar | P3 | The route is legacy/parked and should not compete with the Campaign path. | Direct URL and `/geelark*` redirects remain live for one release. | Future legacy deletion decision |
| `src/sj-ui` still exists | P3 | Deletion needs a separate rollback-friendly commit. | Source tests verify no app source imports it. | Future isolated cleanup run |

## 5) Scope Compliance
- Delivered in scope: Yes - direct-only legacy nav filtering, route-presence tests, `sj-ui` isolation tests, docs, PRODUCT/CHANGELOG.
- Out-of-scope changes found: None.
- Notes: No provider, publish API, data-contract, route removal, or large component refactor.

## 6) Release Boundary
- What is guaranteed: Primary sidebar no longer exposes `/tiktok-matrix`, while direct legacy routes still exist and core nav candidates remain present.
- What is not guaranteed: Historical usage of `/tiktok-matrix` is not measured; `src/sj-ui` is not deleted.
- Environments validated: Local targeted tests, production builds, eval with local API health.

## 7) Next Actions
1. Commit and push `codex/2026-05-11-legacy-surface-reduction`.
2. Fast-forward merge to `main`, push `origin/main`.
3. Deploy staging, smoke, mark release-ready, deploy prod with `--prepare-wait-seconds 30`, smoke, and restore prod idle.
