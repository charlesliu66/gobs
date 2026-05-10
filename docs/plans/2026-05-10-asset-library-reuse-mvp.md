# Asset Library Reuse MVP

> Run: `2026-05-10-asset-library-reuse-mvp`
> Window: A / Run 1
> Status: Builder implementation complete, verification pending final eval.

## Goal

Make uploaded team assets reusable by Campaign, Banner, Studio, and later review flows without copying file payloads. Asset Library now exposes a stable team category, preprocessing metadata, and an `assetId`-based contract helper that downstream runs can consume.

## Product Scope

- Add a small team-facing category vocabulary aligned with Run 0 `AssetContract` categories:
  - `character_image`
  - `scene_image`
  - `ui_screenshot`
  - `logo`
  - `gameplay_screenshot`
  - `video_clip`
  - `finished_banner`
  - `reference_image`
- Preserve existing `ai_category` data and store manual operator correction separately as `team_category`.
- Expose preprocessing metadata derived from existing stored fields:
  - file type
  - dimensions
  - aspect ratio label
  - orientation
  - thumbnail readiness
  - video duration
  - audio presence
  - campaign-compatible asset category
- Let operators manually correct the team category from the Asset Library detail drawer.
- Provide a frontend helper that maps a `LibraryAsset` to the Run 0 `AssetContract` shape using `asset.id`.

## Implementation Notes

- Backend reuse metadata is centralized in `h5-video-tool-api/src/services/assetReuseService.ts`.
- Manual category correction is stored in the nullable `assets.team_category` column and indexed for search/filter use.
- Asset Library list/search/detail style responses attach additive fields only:
  - `team_category`
  - `team_category_source`
  - `reuse_category`
  - `preprocess`
- `PATCH /api/asset-library/assets/:id/category` validates the requested category and reuses owner-scoped asset checks before updating.
- Frontend Asset Library types and detail drawer now support manual category correction and local refresh after save.
- `h5-video-tool/src/materials/assetReuse.ts` converts `LibraryAsset` records into Run 0 `AssetContract` references by ID.

## Non-Goals

- No Campaign Output Workbench wiring in this run.
- No campaign output plan route changes.
- No campaign distribution package route changes.
- No Banner output UI generation.
- No AI classification provider changes.
- No staging or production deployment from this development window.

## Verification Plan

- Backend native test coverage:
  - category fallback precedence
  - preprocessing summary fields
  - invalid category rejection
  - cross-user category update rejection
  - manual category persistence
- Frontend native test coverage:
  - `LibraryAsset` to `AssetContract` mapping
  - preprocess fallback mapping
  - duration seconds to milliseconds conversion
- Build coverage:
  - `h5-video-tool-api npm run build`
  - `h5-video-tool npm run build`
- Workflow coverage:
  - `workflow_guard --stage build`
  - `workflow_guard --stage verify`
  - `scripts/eval.sh 2026-05-10-asset-library-reuse-mvp`

## Downstream Handoff

- Run 2 Banner work can consume the Asset Library category and `AssetContract` helper without changing asset storage.
- Campaign Workbench wiring remains intentionally out of scope and should happen only after this branch is merged.
- Window B can continue quality review work against the same Run 0 contract vocabulary without depending on Asset Library UI internals.
