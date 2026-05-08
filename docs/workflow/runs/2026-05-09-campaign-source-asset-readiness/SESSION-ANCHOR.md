# SESSION-ANCHOR - 2026-05-09-campaign-source-asset-readiness

## Run Summary
- Run ID: 2026-05-09-campaign-source-asset-readiness
- Goal: Connect Campaign Output Workbench source asset requirements to Asset Library readiness so missing game assets can be matched, selected, or routed for upload without blocking unrelated outputs.
- Owner: codex
- Branch or commit context: main@8f3b263
- Last updated: 2026-05-08T17:56:23Z

## Acceptance Criteria Snapshot
- AC-01: Campaign Creative can derive available game source assets from the existing Asset Library and feed them into the draft CampaignOutputPlan.
- AC-02: Output Workbench source-asset rows show readiness, matched asset references, and practical actions for choosing/uploading missing source assets.
- AC-03: Updating source-asset readiness only unblocks affected production items; unrelated text/post outputs remain producible and distribution-safe.
- AC-04: Source asset matching and Workbench wiring are covered by focused frontend tests plus the existing output-plan/distribution regressions.

## Editable Files (Builder Ownership)
- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/components/AssetPicker.tsx
- h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx
- h5-video-tool/src/components/campaign/outputPlan.ts
- h5-video-tool/src/components/campaign/distributionPackage.ts
- h5-video-tool/src/api/assetLibraryApi.ts
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/tests
- PRODUCT.md
- CHANGELOG.md
- docs/TASK-INDEX.md
- docs/plans/README.md
- docs/workflow/runs/2026-05-09-campaign-source-asset-readiness

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-08-campaign-output-workbench-game-source-assets-design.md
- docs/plans/2026-05-08-campaign-output-production-adapters-design.md
- docs/workflow/runs/2026-05-08-campaign-output-workbench-game-source-assets/SESSION-ANCHOR.md
- docs/workflow/runs/2026-05-08-campaign-output-workbench-game-source-assets/planner-spec.md
- docs/workflow/runs/2026-05-08-campaign-output-production-adapters/SESSION-ANCHOR.md
- docs/workflow/runs/2026-05-08-campaign-output-one-click-production/SESSION-ANCHOR.md

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- Low-level video/image generation service changes.
- Real automatic publishing, scheduling, account auto-selection, or analytics dashboards.
- Broad Asset Library redesign, folder taxonomy migration, or upload pipeline rewrite.
- New environment variables or credential handling.
- Broad EditorWorkbench refactor.
- Reintroducing marketer-facing Knowledge Brain pack selectors, multi-project brain choosers, or the old expert brief form.
- Claiming that video/banner assets are produced automatically when only source readiness is improved.

## Progress Checklist
- [x] Planner approved
- [x] Challenger approved
- [x] Builder self-test recorded
- [x] Verifier P0/P1 count is zero
- [x] Release decision written

## Escalation Rules
- Escalate if a change requires touching any AGENTS.md forbidden file.
- Escalate if a new env var is required and `.env.example` is not yet updated.
- Escalate if acceptance criteria need to expand beyond this run scope.
- Escalate before adding or changing upload storage behavior.
- Escalate before any prod release decision.
