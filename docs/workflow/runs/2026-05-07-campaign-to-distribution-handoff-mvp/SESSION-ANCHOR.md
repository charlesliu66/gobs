# SESSION-ANCHOR - 2026-05-07-campaign-to-distribution-handoff-mvp

## Run Summary
- Run ID: 2026-05-07-campaign-to-distribution-handoff-mvp
- Goal: Create the product and Gate 1 plan for the marketer-first Campaign Creative to Distribution handoff MVP.
- Owner: codex
- Branch or commit context: codex/campaign-to-distribution-handoff-mvp@640b2e0
- Last updated: 2026-05-07T08:21:16Z

## Acceptance Criteria Snapshot
- AC-01: Campaign Creative can create a distribution-package draft from a selected variant while preserving CTA, copy, assets, and applied knowledge context.
- AC-02: Distribution can load the pending package, prefill publish-facing fields, and still require explicit account/publish confirmation.
- AC-03: Existing Campaign Creative -> Editor handoff remains compatible and available as an advanced fine-tune path.
- AC-04: MVP stays honest: no fake analytics, no automatic publishing, no broad EditorWorkbench refactor.

## Editable Files (Builder Ownership)
- docs/plans/2026-05-07-campaign-to-distribution-handoff-mvp-design.md
- docs/plans/README.md
- docs/TASK-INDEX.md
- docs/workflow/runs/2026-05-07-campaign-to-distribution-handoff-mvp/
- h5-video-tool/src/components/campaign/distributionPackage.ts
- h5-video-tool/src/components/campaign/DistributionPackagePanel.tsx
- h5-video-tool/src/components/campaign/model.ts
- h5-video-tool/src/components/distribution/PendingDistributionPackages.tsx
- h5-video-tool/src/api/campaignDistribution.ts
- h5-video-tool/src/api/client.ts
- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/pages/TabDistribute.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/tests/
- h5-video-tool-api/src/routes/campaignDistribution.ts
- h5-video-tool-api/src/index.ts
- h5-video-tool-api/src/services/campaignDistributionPackage.ts
- h5-video-tool-api/tests/
- PRODUCT.md
- CHANGELOG.md

## Read-Only References
- docs/plans/2026-05-06-campaign-creative-agent-next-phase-design.md
- docs/plans/2026-05-06-gobs-fastpublish-knowledge-integration-design.md
- docs/plans/2026-05-06-video-distribution-marketer-ux-design.md
- docs/plans/2026-05-07-gold-and-glory-canonical-brain-sync-design.md
- h5-video-tool/src/api/campaignKnowledge.ts
- h5-video-tool/src/api/editorCreative.ts
- h5-video-tool/src/pages/EditorWorkbench.tsx
- h5-video-tool-api/src/routes/campaignKnowledge.ts
- h5-video-tool-api/src/services/campaignKnowledgeDerivation.ts
- h5-video-tool-api/src/services/campaignKnowledgeStore.ts
- h5-video-tool-api/src/services/editorCreativeBrief.ts

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- Full approval/comment collaboration system.
- Scheduling engine or automatic social publishing.
- Publishing performance analytics dashboard.
- Full EditorWorkbench decomposition, timeline/export refactor, or media engine changes.
- SQLite to PostgreSQL migration.
- Exposing unfinished Platform / Learning Lab / Ops Center modules.
- Any change to AGENTS.md forbidden video-generation service files.

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
