# PlannerSpec - 2026-05-10-asset-library-reuse-mvp

## 1) Project Goal
- Business goal: Make uploaded team assets reliably reusable for Campaign, Banner, Studio, and later quality-review runs through stable categories and preprocessing metadata.
- User value: Operators can upload assets, see what each asset is, correct the category manually, and reference the same `assetId` downstream without duplicating files.
- Success metrics: Asset Library list/search/detail responses expose reusable team category plus preprocessing summary, manual category correction persists, and tests cover fallback/metadata mapping.

## 2) Scope
### In Scope
- Add a team-facing Asset Library category vocabulary aligned with Run 0 `AssetContract` categories:
  - character image, scene image, UI screenshot, logo, gameplay screenshot, video clip, finished banner, other reference image.
- Derive fallback team category from manual category, AI category, mimetype, file name, and metadata without calling an LLM.
- Derive preprocessing summary from existing stored metadata:
  - file type, dimensions, aspect ratio label, orientation, thumbnail readiness, duration for video, and campaign-compatible asset category.
- Add a manual category correction endpoint on the existing `/api/asset-library` route.
- Add frontend API support and detail-drawer controls for manual category correction.
- Add lightweight frontend material helper for converting a `LibraryAsset` to a Run 0 `AssetContract` reference by `assetId`.
- Add targeted tests for category fallback and preprocessing fields.
- Update run docs, product docs, and changelog.

### Out of Scope
- CampaignOutputWorkbench wiring.
- Campaign output plan or distribution package backend routes.
- Run 2 Banner card/UI generation.
- Complex AI auto-classification upgrades.
- Asset permission model redesign.
- Full DAM features such as approvals, ACLs, variants, renditions, or cross-team sharing.
- Staging/prod deployment.

## 3) Module Breakdown
- Backend asset reuse service:
  - Responsibilities: category vocabulary, fallback mapping, preprocessing metadata, Run 0 compatible category mapping.
  - Dependencies: `AssetRecord`, existing thumbnail path helper.
- Backend asset route:
  - Responsibilities: attach reuse metadata to list/search/favorite/recent responses and persist manual category correction.
  - Dependencies: existing `/api/asset-library` auth and ownership checks.
- Frontend Asset Library API:
  - Responsibilities: type new response fields and expose `updateAssetCategory`.
  - Dependencies: existing `apiPost`/`apiGet` client.
- Frontend Asset Detail Drawer:
  - Responsibilities: show team category, preprocessing summary, and a compact manual correction selector.
  - Dependencies: existing locale and asset library page refresh flow.
- Frontend materials helper:
  - Responsibilities: convert selected `LibraryAsset` into Run 0 `AssetContract` shape by ID.
  - Dependencies: `LibraryAsset`, `AssetContract`.

## 4) Technical Approach
- Do not add new env vars or provider calls.
- Add `team_category` as a nullable `assets` column so manual corrections are explicit and do not overwrite AI category.
- Keep existing `ai_category` behavior intact for backward compatibility and current folder/filter counts.
- Attach derived fields server-side so every consumer sees the same category and preprocessing data.
- Use structured helper functions for category fallback instead of ad hoc string checks in UI components.
- Treat thumbnail readiness as a boolean derived from current thumbnail path existence; thumbnail generation remains the existing service's job.
- Preserve owner scoping by reusing the route's existing `requireUser` and asset ownership checks.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Category vocabulary drift | Backend labels differ from Run 0 AssetContract categories | Campaign/Banner references become inconsistent | Export one mapping helper and test every category fallback | Window A |
| Manual correction mutates AI data | Updating `ai_category` directly | Loss of AI classification evidence | Store human correction in `team_category` and expose both | Window A |
| Route response churn | Existing callers expect current asset shape | UI regressions | Add optional fields only; keep existing fields and endpoints compatible | Builder |
| Scope creep into Banner/Workbench | Trying to prove Banner consumption inside Run 1 | Merge conflicts and oversized run | Stop at reusable asset references and helper; Run 2 does UI wiring | Window A |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Asset Library responses expose team category fallback and preprocessing metadata. | Backend service tests + TypeScript build | List/search/recent/favorite records can include `team_category`, `reuse_category`, and `preprocess` without breaking existing fields. |
| AC-02 | User can manually correct category. | API route/source test + frontend source/build | `PATCH` or `POST` endpoint updates `team_category`; detail drawer can save a category and reflect it. |
| AC-03 | Campaign/Banner can reference asset ID without copying file payload. | Frontend helper test | `LibraryAsset` maps to Run 0 `AssetContract` using `asset.id`, category mapping, and metadata only. |
| AC-04 | Tests cover category fallback and preprocessing fields. | Targeted node tests | Tests include AI-category fallback, filename fallback for logo/banner/gameplay, video duration metadata, and manual category precedence. |
| AC-05 | Scope respects Release Owner split. | Workflow guard verify/release | No deployment scripts, release state scripts, protected services, Workbench, or campaign output plan routes changed. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Manual `team_category` wins; image dimensions/aspect ratio and thumbnail readiness are exposed. |
| Edge cases | Old AI categories map to the new team vocabulary; unknown category falls back by mime/name. |
| Empty state | Missing width/height/duration produce null metadata without throwing. |
| Error path | Invalid manual category is rejected; updating another user's asset is forbidden. |
| Regression | Existing Asset Library response fields remain optional-compatible; backend/frontend builds pass. |
| Race/Concurrency | No CampaignOutputWorkbench or campaign output route edits while deployment window is separate. |

## 8) Delivery Artifacts
- Backend:
  - `h5-video-tool-api/src/services/assetReuseService.ts`
  - `h5-video-tool-api/src/services/assetIngestService.ts`
  - `h5-video-tool-api/src/services/assetSearchService.ts`
  - `h5-video-tool-api/src/types/assetLibrary.ts`
  - `h5-video-tool-api/src/db/assetDb.ts`
  - `h5-video-tool-api/src/routes/assetLibrary.ts`
  - `h5-video-tool-api/tests/assetLibraryReuse.test.ts`
- Frontend:
  - `h5-video-tool/src/api/assetLibraryApi.ts`
  - `h5-video-tool/src/pages/AssetLibraryPage/AssetDetailDrawer.tsx`
  - `h5-video-tool/src/pages/AssetLibraryPage/index.tsx`
  - `h5-video-tool/src/materials/assetReuse.ts`
  - `h5-video-tool/src/materials/assetReuse.test.ts`
- Docs:
  - `docs/plans/2026-05-10-asset-library-reuse-mvp.md`
  - Run artifacts, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`
