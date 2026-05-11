# SESSION-ANCHOR - 2026-05-10-quality-review-next-version

## Run Summary
- Run ID: 2026-05-10-quality-review-next-version
- Goal: Add a human-quality review panel and next-version prompt/task loop for Banner and copy outputs using Run 0 contracts
- Owner: codex
- Branch or commit context: codex/2026-05-10-quality-review-next-version@ce212be
- Last updated: 2026-05-10T10:41:20Z

## Acceptance Criteria Snapshot
- AC-01: Campaign Output Workbench shows a quality review panel based only on human marks, feedback tags, and static Run 0 rules.
- AC-02: Operators can select fixed feedback tags and create a next-version draft for Banner and copy outputs.
- AC-03: Next-version drafts preserve `parentOutputId`, source asset ids, campaign/brief context, feedback tags, and reviewer note.
- AC-04: Backend output-plan persistence round-trips feedback metadata and rejects invalid feedback tags/statuses.
- AC-05: The UI copy makes clear that video quality is not automatically understood and video next-version work is a task/prompt, not local regeneration.

## Editable Files (Builder Ownership)
- docs/workflow/runs/2026-05-10-quality-review-next-version/
- docs/plans/2026-05-10-quality-review-next-version.md
- h5-video-tool/src/components/campaign/feedback/
- h5-video-tool/src/components/campaign/CreativeQualityPanel.tsx
- h5-video-tool/src/components/campaign/CreativeFeedbackBar.tsx
- h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx
- h5-video-tool/src/components/campaign/outputPlan.ts
- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/tests/campaignOutputWorkbenchIntegration.test.ts
- h5-video-tool-api/src/services/campaignOutputPlan.ts
- h5-video-tool-api/tests/campaignOutputPlan.test.ts
- PRODUCT.md
- CHANGELOG.md
- docs/TASK-INDEX.md

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-10-gobs-next-optimization-checklist.md
- docs/workflow/runs/2026-05-10-quality-data-contract-foundation/
- docs/workflow/runs/2026-05-10-banner-output-mvp/
- docs/workflow/runs/2026-05-10-story-video-review-capture/
- h5-video-tool/src/components/campaign/quality/
- h5-video-tool/src/components/campaign/contracts/

## Additional Forbidden Paths
- h5-video-tool-api/src/routes/campaignOutputPlan.ts
- h5-video-tool-api/src/routes/campaignOutputPlans.ts
- h5-video-tool-api/src/routes/campaignDistribution.ts
- h5-video-tool-api/src/routes/campaignDistributionPackages.ts
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
- Automatic video understanding or AI quality scoring.
- Local video partial regeneration.
- A complex revision/version entity system.
- New provider calls, image editor/canvas work, or platform publishing behavior.
- Distribution package route rewrites or deployment/release-owner actions.

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
