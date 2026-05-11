# BuilderReport - 2026-05-11-data-contract-hardening

## 1) Inputs
- Spec file: `docs/workflow/runs/2026-05-11-data-contract-hardening/planner-spec.md`
- Spec version/date: 2026-05-11T06:28:28Z
- Acceptance criteria covered: AC-01, AC-02, AC-03, AC-04

## 2) Implemented
| AC ID | What was implemented | Files changed | Notes |
|---|---|---|---|
| AC-01 | New Output Plans accept `campaignId`; produced copy/Banner drafts inherit `campaignId`, `briefId`, and `parentOutputId`; backend rejects explicit Campaign/Brief mismatches. | `outputPlan.ts`, `CampaignCreative.tsx`, `campaignOutputPlan.ts`, frontend/backend tests | Legacy produced outputs without lineage remain readable and show link-health warnings. |
| AC-02 | Distribution Package `source` now preserves `outputPlanId`, `productionItemId`, `outputIds`, and `sourceAssetIds`; Studio package writeback refreshes that lineage. | `distributionPackage.ts`, `studioPackagePatch.ts`, `campaignDistributionPackage.ts`, package tests | New fields live in existing JSON payloads; no table migration. |
| AC-03 | Campaign -> Studio navigation now includes `outputPlan`, `productionItem`, and optional `package` URL params; Studio can rebuild handoff from backend Output Plan if route state is gone. | `CampaignCreative.tsx`, `Studio.tsx`, `studioBridge.ts`, presence tests | Existing route-state flow remains the fast path. |
| AC-04 | Added shared link-health helper and compact health status/issue display in Campaign Output Workbench and pending Distribution Package cards. | `dataContractLinkHealth.ts`, `CampaignOutputWorkbench.tsx`, `PendingDistributionPackages.tsx`, i18n, link-health tests | Health is informational for legacy data and blocking-looking only when a required ID is missing. |

## 3) Not Implemented
| AC ID | Reason | Impact | Proposed next step |
|---|---|---|---|
| [None] | All scoped AC implemented. | None. | Continue to verifier and release guard. |

## 4) Self-Test Results
| Test type | Command/Method | Result | Evidence |
|---|---|---|---|
| Frontend targeted tests | `node --test --experimental-strip-types tests/campaignOutputPlan.test.ts tests/campaignDistributionPackage.test.ts tests/campaignDataContractLinkHealth.test.ts tests/distributionPackageIntake.test.ts tests/campaignProductionLoopPresence.test.ts tests/campaignStudioPackagePatch.test.ts tests/campaignStudioBridge.test.ts` | PASS | 35/35 tests passed. |
| Backend targeted tests | `npx tsx --test tests/campaignOutputPlan.test.ts tests/campaignDistributionPackage.test.ts` | PASS | 15/15 tests passed. |
| Backend build | `cd h5-video-tool-api && npm run build` | PASS | TypeScript compile, asset copy, build-info succeeded. |
| Frontend build | `cd h5-video-tool && npm run build` | PASS | Vite build succeeded with existing `src/api/client.ts` mixed import warning. |
| Standard eval | `bash scripts/eval.sh 2026-05-11-data-contract-hardening` | PASS | eval-result.json records backend build, frontend build, TypeScript, and API health 200. |
| Workflow guard | `python scripts/workflow_guard.py --run-id 2026-05-11-data-contract-hardening --stage build` | WARN | Only unrelated dirty docs outside this run scope; no code scope errors after anchor update. |

## 5) Known Risks and Uncertainties
- Legacy records can lack new lineage fields.
  - Why it remains: No historical migration is in scope.
  - Possible impact: Older packages/plans may show link-health warnings.
  - Suggested follow-up: Optional one-time repair/migration only after operators confirm the new chain works.
- GeeLark publish records do not yet store package lineage.
  - Why it remains: Direct publish API attribution is out of scope for Run 9.
  - Possible impact: Post-publish history is still task/account based rather than campaign-output based.
  - Suggested follow-up: Later publish-attribution run can attach package IDs to task metadata.

## 6) Scope Compliance Statement
- I did not expand scope beyond the approved PlannerSpec: Yes.
- If No, list deviations and reasons: N/A.

## 7) Change Summary
- What changed: Campaign Output, Studio handoff, and Distribution Package payloads now carry minimal Run 0 ID lineage with link-health visibility.
- Why changed: Run 9 asked to reduce cross-page broken chains and refresh-lost context.
- What did not change: No provider services, generation routes, database table migrations, or GeeLark publish API behavior changed.
