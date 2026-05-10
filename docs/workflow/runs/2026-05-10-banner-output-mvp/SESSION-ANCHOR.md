# SESSION-ANCHOR - 2026-05-10-banner-output-mvp

## Run Summary
- Run ID: 2026-05-10-banner-output-mvp
- Goal: Make Banner a first-class Campaign Output with source asset selection, prompt placeholder generation, human quality marking, and distribution package handoff.
- Owner: Window A Dev Worker
- Branch or commit context: codex/2026-05-10-banner-output-mvp@9595f23
- Last updated: 2026-05-10T09:49:44Z

## Acceptance Criteria Snapshot
- AC-01: Campaign Output Plans can include Banner items with the first four Banner specs: `square_1_1`, `portrait_4_5`, `story_9_16`, and `landscape_16_9`.
- AC-02: Banner items can use Asset Library image IDs as main visual/source requirements without copying file payloads.
- AC-03: Confirming production creates a deterministic Banner prompt placeholder output when required assets are available.
- AC-04: Operators can mark produced Banner outputs as `usable`, `needs_fix`, or `unusable`.
- AC-05: Produced Banner placeholder outputs can enter Campaign Distribution Package context without claiming a final publishable image.

## Editable Files (Builder Ownership)
- docs/workflow/runs/2026-05-10-banner-output-mvp
- docs/plans/2026-05-10-banner-output-mvp.md
- h5-video-tool/src/components/campaign/outputPlan.ts
- h5-video-tool/src/components/campaign/BannerOutputCard.tsx
- h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx
- h5-video-tool/src/components/campaign/distributionPackage.ts
- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/src/materials/assetReuse.ts
- h5-video-tool/src/components/campaign/contracts
- h5-video-tool/tests/campaignOutputPlan.test.ts
- h5-video-tool/tests/campaignOutputProductionAdapter.test.ts
- h5-video-tool/tests/campaignDistributionPackage.test.ts
- h5-video-tool/tests/campaignOutputWorkbenchIntegration.test.ts
- h5-video-tool-api/src/services/campaignOutputPlan.ts
- h5-video-tool-api/tests/campaignOutputPlan.test.ts
- PRODUCT.md
- CHANGELOG.md
- docs/TASK-INDEX.md

## Read-Only References
- docs/plans/2026-05-10-gobs-next-optimization-checklist.md
- docs/plans/2026-05-10-creative-quality-and-data-contract.md
- docs/plans/2026-05-10-asset-library-reuse-mvp.md
- h5-video-tool-api/src/routes/campaignOutputPlan.ts
- h5-video-tool-api/src/routes/campaignDistribution.ts
- h5-video-tool-api/src/routes/assetLibrary.ts
- .claude/memory/feedback.md

## Additional Forbidden Paths
- h5-video-tool-api/src/routes/campaignOutputPlan.ts
- h5-video-tool-api/src/routes/campaignOutputPlans.ts
- h5-video-tool-api/src/routes/campaignDistributionPackages.ts
- h5-video-tool-api/src/routes/campaignDistribution.ts
- h5-video-tool-api/src/services/dreaminaVideo.ts
- h5-video-tool-api/src/services/klingVideo.ts
- h5-video-tool-api/src/services/veoPython.ts
- h5-video-tool-api/src/services/studioPipeline.ts
- h5-video-tool-api/src/types/productionTypes.ts
- h5-video-tool-api/src/config/productionAssets.ts
- scripts/deploy_all.py
- scripts/deploy_api.py
- scripts/deploy_frontend.py
- scripts/mark_release_ready.py
- scripts/set_deployment_state.py

## Out of Scope
- Real image generation, provider calls, image editing canvas/layers, full design editor, new distribution routes, campaign output route rewrites, platform publishing, staging/prod deployment, and Run 4 next-version feedback generation.

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
- Escalate before any prod release decision.
