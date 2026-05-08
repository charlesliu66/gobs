# PlannerSpec - 2026-05-08-campaign-output-production-adapters

## 1) Project Goal
- Business goal: Connect supported Campaign Output Workbench items to safe draft production and distribution package adapter paths without touching low-level generation services.
- User value: After confirming a brief and output plan, the operator sees concrete produced copy/post drafts and only gets asked for the assets or decisions GOBS truly needs.
- Success metrics: Supported text items become produced, blocked visual/video items stay honest, produced text can enter pending distribution packages, and local/GitHub/staging/prod stay on one SHA.

## 2) Scope
### In Scope
- Deterministic production adapter for text-first output items: `caption_set`, `headline_set`, `hashtag_set`, and `fb_post`.
- Optional `producedOutputs` data on `ProductionItem`, persisted through the existing output plan API.
- Workbench UI that shows produced draft content after confirmation.
- Distribution package draft mapping from produced text output items.
- Focused frontend/backend tests, build verification, workflow guard, product docs, and release docs.

### Out of Scope
- Low-level video/image generation services and forbidden AGENTS.md paths.
- Real automatic publishing, scheduling, or account auto-selection.
- Analytics dashboards, prediction claims, or fake performance data.
- Asset Library metadata overhaul.
- Broad EditorWorkbench refactor.

## 3) Module Breakdown
- Output production adapter:
  - Responsibilities: Produce deterministic draft copy for supported text/post items and leave blocked/unsupported items untouched.
  - Dependencies: `CampaignOutputPlan`, `ProductionItem`, brief/strategy/variant context.
- Persistence validation:
  - Responsibilities: Round-trip `producedOutputs` through owner-scoped output plan APIs with safe IDs and field-aware validation.
  - Dependencies: existing `campaign_output_plans` SQLite payload storage.
- Workbench integration:
  - Responsibilities: Show produced content and make “confirm production” mean “produce supported items and save plan”.
  - Dependencies: existing Campaign Creative state and `updateCampaignOutputPlan`.
- Distribution bridge:
  - Responsibilities: Build package draft inputs from produced text items while keeping publish/account decisions explicit.
  - Dependencies: existing Campaign Distribution package API and UI.

## 4) Technical Approach
- Architecture decisions: Add adapter helpers at the campaign component/model layer instead of touching generation services.
- Data flow: `CampaignOutputPlan` draft -> `produceSupportedCampaignOutputs(...)` -> updated `CampaignOutputPlan` -> `PATCH /api/campaign-output/plans/:id` -> produced item can build a distribution package draft.
- API or interface changes: No new route. Extend existing output-plan item payload with optional `producedOutputs`.
- Migration or compatibility notes: Existing plans without `producedOutputs` remain valid; the new field defaults to an empty array.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Adapter overclaims production | Text helper marks video/banner as produced | User thinks GOBS made assets it did not make | Supported type whitelist and tests for blocked video/banner behavior | Builder |
| Backend drops produced drafts | Validator omits new field | User sees produced work disappear after refresh | Add API round-trip test for `producedOutputs` | Builder |
| Distribution package implies auto-publish | Produced copy enters package as ready to publish | User may think account selection/publish happened | Keep package pending and account/final publish explicit | Builder |
| Scope creep into generation services | Video/banner production feels tempting | Forbidden-file risk and untestable release | Stop before touching forbidden services; keep only guidance/status | Builder |
| Release drift | Different SHA across local/GitHub/staging/prod | Operators see stale behavior | Release guard, staging smoke, mark-ready, prod smoke, idle restore | Integrator |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Supported text-first output items produce visible draft outputs. | `h5-video-tool/tests/campaignOutputProductionAdapter.test.ts` | Caption/headline/hashtag/FB post items become `produced` with `producedOutputs` and `outputAssetIds`. |
| AC-02 | Unsupported/source-blocked visual items stay honest. | `campaignOutputProductionAdapter.test.ts` | Blocked short-video/banner items are not marked produced and keep source-asset actions/gaps. |
| AC-03 | Backend output plans round-trip produced drafts. | `h5-video-tool-api/tests/campaignOutputPlan.test.ts` | POST/PATCH preserve `producedOutputs`; malformed produced output kind/status returns 400. |
| AC-04 | Produced text items can map into package drafts. | `h5-video-tool/tests/campaignDistributionPackage.test.ts` | Produced copy populates distribution `copy`; package remains pending and explicit about publish prep. |
| AC-05 | Campaign Creative uses production adapter after confirmation. | UI source/integration tests | Workbench shows produced outputs and confirmation action updates the persisted plan. |
| AC-06 | Release readiness is proven. | builds, workflow guard, smoke, release docs | P0/P1 zero and staging/prod report the pushed SHA. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Frontend adapter | Happy path for copy items, blocked video/banner, already-produced idempotency, no strategy fallback. |
| Backend API | Create/update produced outputs, reject malformed produced output kind/status, preserve owner scoping. |
| UI presence | Workbench has produced output section and CampaignCreative calls adapter before patching plan. |
| Distribution bridge | Produced text fills package copy; blocked item stays non-publishable; account selection remains outside adapter. |
| Release | Backend/frontend builds, workflow guard build/verify/release, staging/prod smoke. |

## 8) Delivery Artifacts
- Code changes: campaign output adapter, Workbench/UI wiring, output-plan backend validation, distribution bridge.
- Test evidence: frontend node tests, backend node tests, backend/frontend builds, workflow guard, smoke.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`, `docs/plans/README.md`.
