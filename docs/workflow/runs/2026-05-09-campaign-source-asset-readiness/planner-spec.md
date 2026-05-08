# PlannerSpec - 2026-05-09-campaign-source-asset-readiness

## 1) Project Goal
- Business goal: Connect Campaign Output Workbench source asset requirements to Asset Library readiness so missing game assets can be matched, selected, or routed for upload without blocking unrelated outputs.
- User value: Marketers can see which game assets already exist, which deliverables are unblocked, and where to provide missing assets without leaving the Campaign Mission Control mental model.
- Success metrics: Source-asset requirements use real Asset Library candidates where available, only affected video/banner items remain blocked, and unsupported/blocked assets stay honest before distribution handoff.

## 2) Scope
### In Scope
- Deterministic Asset Library -> CampaignOutputPlan source-asset readiness mapping.
- Campaign Creative loading of existing Asset Library assets for the current output plan.
- Output Workbench UI for matched source assets and missing-asset actions.
- Persisting readiness updates through the existing output-plan update path when a plan already exists.
- Focused tests for source-asset matching, Workbench presence, one-click production regression, and distribution bridge honesty.

### Out of Scope
- Low-level image/video generation calls, provider services, or AGENTS.md forbidden files.
- Real source asset generation, automatic publishing, scheduling, or analytics.
- Asset Library database migration, folder taxonomy overhaul, or upload pipeline rewrite.
- Multi-game brain selection, Knowledge Brain selectors in the default campaign path, or old expert brief forms.
- Broad EditorWorkbench changes.

## 3) Module Breakdown
- Source asset readiness model:
  - Responsibilities: Map Asset Library records into known game source asset types, merge matched asset ids into requirements, recompute affected item status and capability gaps.
  - Dependencies: `h5-video-tool/src/components/campaign/outputPlan.ts`, `h5-video-tool/src/api/assetLibraryApi.ts`.
- Campaign Creative orchestration:
  - Responsibilities: Load Asset Library assets, pass available source assets into draft plan creation, patch created plans when readiness changes.
  - Dependencies: `CampaignCreative.tsx`, `campaignOutputPlan` API helpers.
- Output Workbench presentation:
  - Responsibilities: Show matched assets, missing assets, readiness state, and explicit choose/upload next actions without implying unsupported production is done.
  - Dependencies: `CampaignOutputWorkbench.tsx`, `AssetPicker.tsx`, `messages.ts`.
- Regression coverage:
  - Responsibilities: Protect text/post production, blocked visual/video honesty, and distribution package behavior.
  - Dependencies: existing campaign output and distribution tests.

## 4) Technical Approach
- Architecture decisions: Reuse the existing Asset Library list/search APIs and the existing `CampaignOutputPlan.sourceAssetRequirements[].matchedAssetIds` field. Do not add a new backend route unless source inspection proves the existing update path cannot persist readiness.
- Data flow: Asset Library records -> deterministic `AvailableSourceAsset[]` mapping -> `buildCampaignOutputPlan(...)` and readiness merge helper -> Workbench UI -> existing `updateCampaignOutputPlan(...)` for created plans.
- API or interface changes: Prefer frontend-only type/helper additions. Existing backend output-plan validation already accepts `sourceAssetRequirements` updates and safe matched asset ids.
- Migration or compatibility notes: Existing saved output plans remain compatible; missing or failed Asset Library loading must fall back to the current missing-source-assets behavior.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| False positive asset matches | Filename or AI tag looks like a source type but is not approved | Video/banner items may appear unblocked too early | Keep status `needs_selection` unless the asset type match is strong or user-selected; keep rights note visible | Builder |
| Upload path scope creep | Matching exposes missing assets and tempts a new upload workflow | Run expands into Asset Library redesign | Route users to existing Asset Library upload entry; do not change upload storage | Builder |
| Existing text production regresses | Recomputing source readiness touches plan items too broadly | Caption/post drafts get blocked by unrelated missing assets | Recompute item status only from each item's requiredSourceAssetIds | Builder |
| Backend validation drift | New frontend readiness fields are not persisted | User sees changes disappear | Avoid new persisted fields beyond existing `matchedAssetIds/status/guidance`; add tests | Builder |
| Overclaiming generated media | Workbench copy implies videos/banners are produced | User trust regression | Copy says source assets are ready or missing; production remains separate and explicit | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Campaign Creative can derive available source assets from Asset Library records and pass them into output-plan creation. | Source/helper test + CampaignCreative wiring assertion | Requirements with matching library assets expose matched ids and move out of generic missing state. |
| AC-02 | Workbench shows source asset readiness with matched references and missing-asset next actions. | Workbench presence/source test | Source asset cards include matched count/list affordance plus choose/upload actions using existing Asset Library routing. |
| AC-03 | Readiness updates only unblock affected production items. | Output-plan unit test | Text/post outputs remain ready/produced; only items whose required assets become available move from blocked to ready_to_produce. |
| AC-04 | Distribution bridge remains honest. | Existing distribution package regression | Produced text can still seed packages; source-blocked visual/video items remain non-publishable. |
| AC-05 | Release readiness is proven locally. | workflow guard, targeted tests, backend/frontend builds | P0/P1 zero; release sync remains gated behind explicit staging/prod approval. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Asset Library contains `game_logo` and `gameplay_recording`; output plan marks the related requirements matched and the video item ready. |
| Edge cases | Asset Library loading fails or returns no matches; output plan stays in missing/blocked state without crashing. |
| Error path | Created output plan readiness patch fails; Workbench surfaces the existing error path and keeps local plan usable. |
| Regression | Produced text/post outputs and distribution package mapping remain unchanged. |
| Stress/Stability | Repeated matching does not duplicate matched asset ids or capability gaps. |

## 8) Delivery Artifacts
- Code changes: Campaign source-asset readiness helpers, CampaignCreative orchestration, Workbench source asset actions/copy, focused tests.
- Test evidence: targeted frontend source tests, existing output-plan/production/distribution regressions, backend/frontend builds, workflow guard.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md` if mainline status changes.
