# PlannerSpec - 2026-05-11-data-contract-hardening

## 1) Project Goal
- Business goal: Harden Campaign Output, Studio, and Distribution ID links with link health detection and refresh-safe traceability
- User value: Operators can move Campaign outputs into Studio and Distribution without losing Campaign, Brief, Output, Package, or source-asset lineage after navigation or refresh.
- Success metrics: New output plans and packages expose Run 0 contract IDs, Studio handoff can be restored from URL/backend state, and broken links are visible before publish preparation.

## 2) Scope
### In Scope
- Campaign Output Plan creation and produced-output lineage.
- Distribution Package source lineage for produced Campaign outputs and Studio writeback.
- Studio route restoration from URL `outputPlan` / `productionItem` / `package` IDs plus backend Output Plan data.
- Compact link-health helpers and UI status on Campaign Output and pending Distribution Package surfaces.
- Backend validators preserving new optional source-lineage fields and rejecting obvious mismatches.
- Focused frontend/backend tests for happy path and broken-chain cases.

### Out of Scope
- Full database redesign, historical data migration, or global state-management rewrite.
- Changes to video/image provider service files.
- Direct GeeLark publish payload attribution changes.
- Release/deployment script changes.

## 3) Module Breakdown
- Campaign Output Plan:
  - Responsibilities: Carry `campaignId`, `briefId`, produced output parent IDs, and source asset IDs into saved plans.
  - Dependencies: `CampaignCreative.tsx`, `outputPlan.ts`, backend output plan validation.
- Campaign Package Source Lineage:
  - Responsibilities: Preserve `campaignId`, `briefId`, `outputPlanId`, `productionItemId`, `outputIds`, and `sourceAssetIds` on new packages and Studio writeback.
  - Dependencies: package builder, package store validator, Studio package patch helper.
- Studio Restore:
  - Responsibilities: Encode handoff IDs in `/studio` URL and rebuild handoff from backend plan on refresh/direct open.
  - Dependencies: `Studio.tsx`, `studioBridge.ts`, output plan API.
- Link Health:
  - Responsibilities: Detect missing/mismatched contract IDs and display compact operator-facing status.
  - Dependencies: Campaign Output Workbench, pending Distribution Package cards, tests.

## 4) Technical Approach
- Architecture decisions: Add small optional lineage fields to existing JSON payloads instead of changing table schemas; existing records remain readable.
- Data flow: `CampaignProfile.campaignId` -> Output Plan -> Studio handoff URL/state -> Studio generated result writeback -> Distribution Package source -> Distribution active package context.
- API or interface changes: Extend existing Output Plan and Distribution Package payload contracts only; no new routes required.
- Migration or compatibility notes: Legacy packages may have missing lineage and will show warning/broken health, but should not crash.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Legacy payloads lack new source fields | Reading older packages/plans | UI warnings or validation regressions | Keep new fields optional and normalize missing arrays to `[]` | Builder |
| Handoff restore fetch fails | Studio direct URL opens without auth/network | Prompt not restored | Keep route-state path, show no crash, tests cover rebuild helper/source presence | Builder |
| Contract helper overflags legitimate drafts | Pre-production packages have no produced output yet | Operator confusion | Distinguish warning from broken and only require output IDs when source is a production item/writeback | Builder |
| Backend validation too strict | Existing plan patch has partial lineage | 400 on normal update | Reject only explicit mismatch, not absent legacy fields | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | New Output Plans persist Campaign ID and produced outputs carry Campaign/Brief/parent lineage | Frontend unit tests + backend route tests | A produced copy/banner output has `campaignId`, `briefId`, and `parentOutputId`, and backend rejects explicit Campaign/Brief mismatches |
| AC-02 | New Distribution Packages trace related Output IDs and source asset IDs | Frontend package builder tests + backend package tests | Package `source` includes `outputPlanId`, `productionItemId`, `outputIds`, `sourceAssetIds`; Studio writeback can patch these fields |
| AC-03 | Studio handoff is refresh/direct-open safe | Source presence test + targeted unit test where possible | Campaign navigation includes URL IDs, and Studio can rebuild handoff from backend Output Plan when route state is absent |
| AC-04 | Broken-chain detection is visible to operators | Link-health helper tests + UI presence tests | Campaign Output Workbench and Pending Packages render healthy/warning/broken status with issue details |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Campaign -> Output Plan -> produced output -> Package -> Distribution draft carries IDs. |
| Edge cases | Legacy package/plan missing optional lineage shows warning, not crash. |
| Error path | Backend rejects explicit produced-output Campaign/Brief mismatches and invalid source-lineage IDs. |
| Regression | Existing output plan, package, Studio bridge, and Distribution intake tests remain green. |
| Refresh | `/studio?templateId=...&outputPlan=...&productionItem=...&package=...` can restore handoff from backend plan. |

## 8) Delivery Artifacts
- Code changes: frontend Campaign/Studio/Distribution lineage, backend validators, tests.
- Test evidence: targeted Node/tsx tests, backend route tests, builds, workflow guards, `bash scripts/eval.sh 2026-05-11-data-contract-hardening`.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
