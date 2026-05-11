# ReleaseDecision - 2026-05-11-data-contract-hardening

## 1) Inputs Reviewed
- PlannerSpec: `docs/workflow/runs/2026-05-11-data-contract-hardening/planner-spec.md`
- BuilderReport: `docs/workflow/runs/2026-05-11-data-contract-hardening/builder-report.md`
- VerifierReport: `docs/workflow/runs/2026-05-11-data-contract-hardening/verifier-report.md`
- Additional evidence: `docs/workflow/runs/2026-05-11-data-contract-hardening/eval-result.json`, targeted frontend/backend tests, API/frontend builds.

## 2) Delivery Decision
- Decision: GO
- Decision time: 2026-05-11T06:48:00Z
- Decision owner: codex

## 3) Blocking Issues
| ID | Severity | Description | Owner | Required before release |
|---|---|---|---|---|
| [None] | - | - | - | - |

## 4) Accepted Risks
| Risk | Severity | Why accepted | Boundary/Workaround | Follow-up date |
|---|---|---|---|---|
| Legacy records may show link-health warnings | P3 | Run 9 intentionally avoids historical migration. | New records carry lineage; legacy records stay readable. | Future repair run only if operators request migration. |
| GeeLark publish history is not campaign-output attributed | P3 | Direct publish API attribution is out of scope. | Package/active Distribution context carries lineage before publish. | Later publish-attribution run. |

## 5) Scope Compliance
- Delivered in scope: Output Plan lineage, Package source lineage, Studio URL/backend restore, link-health UI, tests, docs, PRODUCT/CHANGELOG.
- Out-of-scope changes found: Existing dirty docs in `docs/plans/README.md` and `docs/plans/2026-05-11-campaign-production-coverage-and-team-assets-plan.md` are unrelated and excluded from this run commit.
- Notes: No forbidden files touched and no provider/generation/publish API changes.

## 6) Release Boundary
- What is guaranteed: New Campaign Output/Studio/Package flows carry minimal Run 0 IDs and surface broken-chain health before distribution prep.
- What is not guaranteed: Existing historical payloads are not migrated; publish-history task metadata is not backfilled.
- Environments validated: Local targeted tests, production builds, eval with local API health.

## 7) Next Actions
1. Commit and push `codex/2026-05-11-data-contract-hardening`.
2. Fast-forward merge to `main`, push `origin/main`.
3. Deploy staging, smoke, mark release-ready, deploy prod with `--prepare-wait-seconds 30`, smoke, and restore prod idle.
