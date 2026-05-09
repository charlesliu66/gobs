# SESSION-ANCHOR - 2026-05-09-campaign-studio-production-bridge

## Run Summary
- Run ID: 2026-05-09-campaign-studio-production-bridge
- Goal: Connect Campaign Output Workbench production items to Advanced Studio, add a unified Studio Asset Library selector foundation, and document remaining Studio quality follow-ups without touching the parallel Distribution Center run.
- Owner: codex
- Branch or commit context: main@9f087f8 plus working tree changes
- Last updated: 2026-05-09T01:18:52Z

## Acceptance Criteria Snapshot
- AC-01: Campaign Output Workbench video-capable production items expose an "Open in Advanced Studio" action without changing existing save/produce/distribution flows.
- AC-02: Advanced Studio accepts Campaign handoff context, preselects the target template, seeds the prompt, and imports matched Asset Library source assets as Studio references where safe.
- AC-03: Advanced Studio has a reusable `UnifiedAssetSelector` foundation backed by Asset Library, with template-aware slots for Quick Single, Motion Transfer, and Character Showcase.
- AC-04: Studio quality foundation adds operator-facing presets for Character Showcase style, Motion Transfer direction, and BGM mood guidance without touching low-level generation providers.
- AC-05: Product/task/run docs reflect the new Campaign -> Studio bridge and explicitly park Distribution Center text cleanup in the parallel run.

## Editable Files (Builder Ownership)
- docs/workflow/runs/2026-05-09-campaign-studio-production-bridge/
- docs/TASK-INDEX.md
- PRODUCT.md
- CHANGELOG.md
- h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx
- h5-video-tool/src/components/campaign/studioBridge.ts
- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/pages/Studio.tsx
- h5-video-tool/src/pages/TabGenerate.tsx
- h5-video-tool/src/components/UnifiedAssetSelector.tsx
- h5-video-tool/src/config/studioQualityPresets.ts
- h5-video-tool/tests/

## Read-Only References
- docs/DOCS-INDEX.md
- docs/TASK-INDEX.md
- docs/workflow/runs/2026-05-09-advanced-studio-template-optimization/
- docs/workflow/runs/2026-05-09-campaign-source-asset-readiness/
- docs/workflow/runs/2026-05-08-campaign-output-one-click-production/
- h5-video-tool/src/components/campaign/outputPlan.ts
- h5-video-tool/src/api/assetLibraryApi.ts
- h5-video-tool/src/context/CreateFlowContext.tsx
- h5-video-tool/src/components/AssetPicker.tsx
- h5-video-tool/src/components/ViralDanceMaterialPicker.tsx
- h5-video-tool/src/components/StepVideo.tsx

## Additional Forbidden Paths
- h5-video-tool/src/pages/TabDistribute.tsx
- h5-video-tool/src/components/distribution/PendingDistributionPackages.tsx
- h5-video-tool/src/components/distribution/packageToDistributeDraft.ts
- h5-video-tool/src/components/distribute/
- All AGENTS.md global forbidden files, including low-level generation services and real env files.

## Out of Scope
- Distribution Center implementation, account-group UI, copy-card UI, or garbled string cleanup in distribution files.
- Backend generation provider changes, new env vars, or edits to forbidden service/config/type files.
- Full Asset Library -> Kling `image_list` backend integration if it requires low-level provider changes.
- Production deployment; this run may prepare a release decision, but prod promotion still requires explicit release gate approval.

## Progress Checklist
- [x] Planner approved
- [x] Challenger approved
- [x] Builder self-test recorded
- [x] Verifier P0/P1 count is zero
- [x] Release decision written

## Escalation Rules
- Escalate if a change requires touching any AGENTS.md forbidden file.
- Escalate if a new env var is required and `.env.example` is not yet updated.
- Escalate if acceptance criteria need to expand into Distribution Center ownership.
- Escalate before any prod release decision.
