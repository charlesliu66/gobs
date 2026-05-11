# SESSION-ANCHOR - 2026-05-11-data-contract-hardening

## Run Summary
- Run ID: 2026-05-11-data-contract-hardening
- Goal: Harden Campaign Output, Studio, and Distribution ID links with link health detection and refresh-safe traceability
- Owner: codex
- Branch or commit context: codex/2026-05-11-data-contract-hardening@9aaef71
- Last updated: 2026-05-11T06:28:28Z

## Acceptance Criteria Snapshot
- AC-01: New Campaign Output Plans persist `campaignId` from Campaign Mission Control and produced outputs carry `campaignId`, `briefId`, and parent output lineage where applicable.
- AC-02: New Campaign Distribution Packages can trace `campaignId`, `briefId`, related `outputPlanId`, `productionItemId`, `outputIds`, and source asset IDs from produced Campaign outputs or Studio writeback.
- AC-03: Campaign -> Studio handoff survives refresh/direct URL by restoring from URL IDs and backend Output Plan data, not route state alone.
- AC-04: Operator-facing Campaign Output and Distribution surfaces show compact link-health status for missing or broken data-contract relationships.

## Editable Files (Builder Ownership)
- docs/plans/2026-05-11-data-contract-hardening.md
- docs/workflow/runs/2026-05-11-data-contract-hardening/*
- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/pages/Studio.tsx
- h5-video-tool/src/components/campaign/outputPlan.ts
- h5-video-tool/src/components/campaign/distributionPackage.ts
- h5-video-tool/src/components/campaign/studioBridge.ts
- h5-video-tool/src/components/campaign/studioPackagePatch.ts
- h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx
- h5-video-tool/src/components/campaign/dataContractLinkHealth.ts
- h5-video-tool/src/components/distribution/packageToDistributeDraft.ts
- h5-video-tool/src/components/distribution/PendingDistributionPackages.tsx
- h5-video-tool/src/api/campaignOutputPlan.ts
- h5-video-tool/src/api/campaignDistribution.ts
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/src/pages/TabDistribute.tsx
- h5-video-tool/tests/campaignDataContractLinkHealth.test.ts
- h5-video-tool/tests/campaignOutputPlan.test.ts
- h5-video-tool/tests/campaignDistributionPackage.test.ts
- h5-video-tool/tests/campaignStudioBridge.test.ts
- h5-video-tool/tests/campaignProductionLoopPresence.test.ts
- h5-video-tool/tests/distributionPackageIntake.test.ts
- h5-video-tool-api/src/services/campaignOutputPlan.ts
- h5-video-tool-api/src/services/campaignDistributionPackage.ts
- h5-video-tool-api/tests/campaignOutputPlan.test.ts
- h5-video-tool-api/tests/campaignDistributionPackage.test.ts
- PRODUCT.md
- CHANGELOG.md
- docs/TASK-INDEX.md

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-10-gobs-next-optimization-checklist.md
- docs/plans/2026-05-10-creative-quality-and-data-contract.md
- h5-video-tool/src/components/campaign/contracts/campaignOutputContracts.ts

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- No full database redesign or historical data migration.
- No new global state management library.
- No provider-service changes, generation-model changes, or deployment-script changes.
- No direct publish API behavior change; Distribution hardening is package/context traceability for new flows.

## Progress Checklist
- [ ] Planner approved
- [ ] Challenger approved
- [ ] Builder self-test recorded
- [ ] Verifier P0/P1 count is zero
- [ ] Release decision written

## Escalation Rules
- Escalate if a change requires touching any AGENTS.md forbidden file.
- Escalate if a new env var is required and `.env.example` is not yet updated.
- Escalate if acceptance criteria need to expand beyond this run scope.
- Escalate before any prod release decision.
