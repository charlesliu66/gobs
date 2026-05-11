# ReleaseDecision - 2026-05-11-data-contract-hardening

## 1) Inputs Reviewed
- PlannerSpec: `docs/workflow/runs/2026-05-11-data-contract-hardening/planner-spec.md`
- BuilderReport: `docs/workflow/runs/2026-05-11-data-contract-hardening/builder-report.md`
- VerifierReport: `docs/workflow/runs/2026-05-11-data-contract-hardening/verifier-report.md`
- Additional evidence: `docs/workflow/runs/2026-05-11-data-contract-hardening/eval-result.json`, targeted frontend/backend tests, API/frontend builds, `git diff --check`.

## 2) Delivery Decision
- Decision: GO
- Decision time: 2026-05-11T06:49:28Z
- Decision owner: codex

## 3) Blocking Issues
| ID | Severity | Description | Owner | Required before release |
|---|---|---|---|---|
| None | N/A | No commit, merge, or deployment-blocking issues found. | N/A | N/A |

## 4) Accepted Risks
| Risk | Severity | Why accepted | Boundary/Workaround | Follow-up date |
|---|---|---|---|---|
| Legacy records can show link-health warnings | P3 | Historical migration is explicitly out of scope. | New records carry lineage; legacy records stay readable and may show warning state. | Future repair run only if operators request migration. |
| Publish history does not yet store Campaign attribution | P2 | Direct GeeLark publish payload attribution is out of scope for Run 9. | Package and active Distribution context are traceable before publish. | Future Distribution attribution run. |

## 5) Scope Compliance
- Delivered in scope: Output Plan lineage, Package source lineage, Studio URL/backend restore, link-health UI, tests, docs, PRODUCT/CHANGELOG.
- Out-of-scope changes found: Existing dirty docs in `docs/plans/README.md` and `docs/plans/2026-05-11-campaign-production-coverage-and-team-assets-plan.md` are unrelated and excluded from this run commit.
- Notes: No forbidden files touched and no provider/generation/publish API changes.

## 6) Release Boundary
- What is guaranteed: New Campaign Output/Studio/Distribution flows carry optional lineage fields and expose link-health state before distribution prep.
- What is not guaranteed: Existing historical payloads are not migrated; publish-history task metadata is not backfilled.
- Environments validated: Local targeted tests, production builds, eval with local API health.

## 7) Next Actions
1. Push `codex/2026-05-11-data-contract-hardening`.
2. Fast-forward merge to `main`, push `origin/main`.
3. Deploy staging, smoke, mark release-ready, deploy prod with `--prepare-wait-seconds 30`, smoke, and restore prod idle.
