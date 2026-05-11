# BuilderReport - 2026-05-11-data-contract-hardening

## 1) Inputs
- Spec file: `docs/workflow/runs/2026-05-11-data-contract-hardening/planner-spec.md`
- Spec version/date: 2026-05-11T06:28:28Z
- Acceptance criteria covered: AC-01, AC-02, AC-03, AC-04

## 2) Implemented
| AC ID | What was implemented | Files changed | Notes |
|---|---|---|---|
| AC-01 | Output Plans now persist Campaign/Brief lineage and produced outputs carry campaign, brief, parent item, and output lineage. | `h5-video-tool/src/components/campaign/outputPlan.ts`, `h5-video-tool-api/src/services/campaignOutputPlan.ts`, related tests | Existing legacy records remain optional-compatible. |
| AC-02 | Distribution Packages now preserve related output/source-asset lineage from produced outputs and Studio writeback. | `distributionPackage.ts`, `studioPackagePatch.ts`, `packageToDistributeDraft.ts`, backend package service/tests | Package source fields carry output plan, production item, output IDs, and source asset IDs. |
| AC-03 | Studio handoff can be restored from URL IDs and backend Output Plan data when route state is gone. | `Studio.tsx`, `CampaignCreative.tsx`, `CampaignOutputWorkbench.tsx`, related tests | Refresh/direct-open resilience added without a new global store. |
| AC-04 | Compact link-health detection is visible on Campaign Output and pending Distribution Package surfaces. | `dataContractLinkHealth.ts`, `CampaignOutputWorkbench.tsx`, `PendingDistributionPackages.tsx`, i18n/tests | Shows healthy/warning/broken lineage status and issue details. |

## 3) Not Implemented
| AC ID | Reason | Impact | Proposed next step |
|---|---|---|---|
| N/A | No AC intentionally skipped. | N/A | N/A |

## 4) Self-Test Results
| Test type | Command/Method | Result | Evidence |
|---|---|---|---|
| Backend targeted tests | `node --import tsx --test tests/campaignOutputPlan.test.ts tests/campaignDistributionPackage.test.ts` in `h5-video-tool-api` | PASS | 15 tests passed. |
| Frontend targeted tests | `npx --yes tsx --test tests/campaignDataContractLinkHealth.test.ts tests/campaignOutputPlan.test.ts tests/campaignDistributionPackage.test.ts tests/campaignProductionLoopPresence.test.ts tests/distributionPackageIntake.test.ts` in `h5-video-tool` | PASS | 27 tests passed. |
| Backend build | `npm run build` in `h5-video-tool-api` | PASS | TypeScript build and build-info completed. |
| Frontend build | `npm run build` in `h5-video-tool` | PASS | Vite production build completed. |
| Diff hygiene | `git diff --check` | PASS | No whitespace errors. |

## 5) Known Risks and Uncertainties
- Legacy lineage is partial:
  - Why it remains: The run intentionally avoids historical data migration.
  - Possible impact: Older packages/plans may show warning/broken health instead of healthy.
  - Suggested follow-up: Treat this as expected for legacy records; migrate only if operators need old packages in active workflows.
- GeeLark publish records do not yet store Campaign attribution:
  - Why it remains: Direct publish payload attribution was out of scope.
  - Possible impact: Package context is traceable before publish, but publish history attribution remains separate.
  - Suggested follow-up: Add publish-history attribution in a dedicated Distribution run if needed.

## 6) Scope Compliance Statement
- I did not expand scope beyond the approved PlannerSpec: Yes.
- If No, list deviations and reasons: None.

## 7) Change Summary
- What changed: Optional lineage fields, refresh-safe Studio handoff, package source traceability, and link-health UI.
- Why changed: To make Campaign -> Studio -> Distribution traceable after navigation/refresh and before publish preparation.
- What did not change: Provider services, generation models, deploy scripts, global state libraries, table schemas, historical data, and GeeLark publish API behavior.
