# PlannerSpec - 2026-05-08-campaign-output-one-click-production

## 1) Project Goal
- Business goal: Reduce Campaign Output Workbench confirmation friction by saving and producing supported outputs through one primary action before distribution handoff.
- User value: Operators see what GOBS produced faster and are not forced through an artificial save-before-produce step.
- Success metrics: One click creates a persisted output plan with produced supported drafts, existing plans remain idempotent, and package creation still uses produced text while keeping publish decisions explicit.

## 2) Scope
### In Scope
- Campaign Creative one-click output action: create the plan, run the safe production adapter, and persist the produced plan.
- Existing saved-plan production path remains supported and idempotent.
- Workbench copy/state refinements so the primary CTA communicates production, not internal persistence.
- Focused source tests, existing adapter/distribution tests, builds, workflow guard, product docs, and release sync.

### Out of Scope
- Low-level video/image generation services and AGENTS.md forbidden paths.
- Real automatic publishing, scheduling, account auto-selection, analytics dashboards, or prediction claims.
- Asset Library metadata overhaul.
- Broad EditorWorkbench refactor.

## 3) Module Breakdown
- CampaignCreative one-click orchestration:
  - Responsibilities: When there is no saved plan, create the produced plan directly; when there is one, patch produced items idempotently.
  - Dependencies: `buildCampaignOutputPlan`, `produceSupportedCampaignOutputs`, `createCampaignOutputPlan`, `updateCampaignOutputPlan`.
- Workbench presentation:
  - Responsibilities: Primary CTA and loading copy describe "confirm and produce supported outputs"; produced output cards remain visible after persistence.
  - Dependencies: `CampaignOutputWorkbench`, i18n messages.
- Regression coverage:
  - Responsibilities: Protect old selector absence, distribution bridge honesty, and blocked visual/video behavior.
  - Dependencies: existing frontend source tests.

## 4) Technical Approach
- Architecture decisions: Keep production orchestration on the existing frontend/API seam; do not add routes.
- Data flow: `campaignOutputPlanDraft` -> `produceSupportedCampaignOutputs(...)` -> `createCampaignOutputPlan(producedPlan)` for first action. Existing `createdOutputPlan` -> `produceSupportedCampaignOutputs(...)` -> `updateCampaignOutputPlan(...)` for later actions.
- API or interface changes: None.
- Migration or compatibility notes: Existing saved plans still work; produced-output idempotency prevents duplicate drafts.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| One-click action hides persistence failure | Create succeeds but production/patch fails | User may think drafts are saved | Create produced plan before POST when possible; surface existing error path | Builder |
| Duplicate produced outputs | Re-clicking production appends copies | Output list becomes noisy | Keep adapter idempotency test and do not regenerate already-produced items | Builder |
| Overclaiming visuals | Simpler CTA implies all assets are produced | User trust regression | Copy says "supported outputs"; video/banner stays blocked | Builder |
| Release drift | Local/GitHub/staging/prod mismatch | Operators see stale behavior | Release guard and smoke checks | Integrator |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Primary action creates and persists a produced plan when no server plan exists. | `campaignOutputWorkbenchIntegration` source test | `handleConfirmOutputProduction` can start from `campaignOutputPlanDraft` and call `createCampaignOutputPlan` with produced items. |
| AC-02 | Existing saved-plan production remains idempotent. | `campaignOutputProductionAdapter.test.ts` | Repeated calls preserve existing produced outputs and IDs. |
| AC-03 | Workbench CTA/copy aligns with one-click production. | `campaignOutputWorkbenchPresence.test.ts` | i18n exposes one-click labels and no source text claims a separate save-only primary step. |
| AC-04 | Distribution bridge behavior remains honest. | `campaignDistributionPackage.test.ts` | Produced text fills pending packages; blocked items remain non-publishable. |
| AC-05 | Release readiness is proven. | builds, workflow guard, smoke | P0/P1 zero and deployed SHA matches origin/main if released. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| UI wiring | First action create+produce path, existing plan patch path, copy labels. |
| Adapter regression | Idempotent produced output, blocked visual/video untouched. |
| Distribution regression | Produced text package copy, blocked item package guidance. |
| Release | Backend/frontend builds, workflow guard build/verify/release, smoke. |

## 8) Delivery Artifacts
- Code changes: CampaignCreative orchestration, Workbench copy, i18n, tests.
- Test evidence: targeted frontend tests, backend/frontend builds, workflow guard, smoke.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`.
