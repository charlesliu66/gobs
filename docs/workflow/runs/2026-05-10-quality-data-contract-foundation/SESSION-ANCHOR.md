# SESSION-ANCHOR - 2026-05-10-quality-data-contract-foundation

## Run Summary
- Run ID: 2026-05-10-quality-data-contract-foundation
- Goal: Define the minimal creative quality states and Campaign-Asset-Output-Review-Package data contracts for the next GOBS optimization runs.
- Owner: Window A Dev Worker
- Branch or commit context: codex/2026-05-10-quality-data-contract-foundation@28d5a07
- Last updated: 2026-05-10T07:13:49Z

## Acceptance Criteria Snapshot
- AC-01: Quality status is limited to usable, needs_fix, and unusable with deterministic rules.
- AC-02: Campaign, Asset, Output, Review, and Package contracts expose the required ID relationships and fixtures.
- AC-03: Frontend tests cover quality status decisions and entity relationship validation.

## Editable Files (Builder Ownership)
- docs/workflow/runs/2026-05-10-quality-data-contract-foundation
- docs/plans/2026-05-10-gobs-next-optimization-checklist.md
- docs/plans/2026-05-10-creative-quality-and-data-contract.md
- docs/plans/README.md
- h5-video-tool/src/components/campaign/quality
- h5-video-tool/src/components/campaign/contracts
- PRODUCT.md
- CHANGELOG.md
- docs/TASK-INDEX.md

## Read-Only References
- docs/TASK-INDEX.md
- .claude/memory/feedback.md

## Additional Forbidden Paths
- h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx
- h5-video-tool-api/src/routes/campaignOutputPlans.ts
- h5-video-tool-api/src/routes/campaignDistributionPackages.ts
- h5-video-tool-api/src/services/dreaminaVideo.ts
- h5-video-tool-api/src/services/klingVideo.ts
- h5-video-tool-api/src/services/veoPython.ts
- h5-video-tool-api/src/services/studioPipeline.ts
- h5-video-tool-api/src/types/productionTypes.ts
- h5-video-tool-api/src/config/productionAssets.ts

## Out of Scope
- Run 1 asset library UI/API, Run 2 banner workbench UI, Run 4 quality panel/next-version generation, and all deployment or release-owner actions.

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
