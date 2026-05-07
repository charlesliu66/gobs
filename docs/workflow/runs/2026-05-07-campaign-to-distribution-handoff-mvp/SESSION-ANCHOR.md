# SESSION-ANCHOR - 2026-05-07-campaign-to-distribution-handoff-mvp

## Run Summary
- Run ID: 2026-05-07-campaign-to-distribution-handoff-mvp
- Goal: Create the product and Gate 1 plan for the marketer-first mission-first Campaign Creative to Distribution handoff MVP.
- Owner: codex
- Branch context: main after mission-first release; implementation branch may use `codex/campaign-to-distribution-handoff-mvp`
- Gate 1 planning baseline: a94a7f5
- Last updated: 2026-05-07T18:19:47+08:00

## Acceptance Criteria Snapshot
- AC-01: Campaign Creative can create a distribution-package draft from a confirmed generated brief plus selected/recommended variant while preserving mission/brief snapshot, CTA, copy, assets, asset readiness, and routed knowledge context.
- AC-02: Backend package APIs enforce current-user ownership on create/list/read/update.
- AC-03: Distribution loads the pending package through a package-to-draft adapter and still requires explicit account/publish confirmation.
- AC-04: Asset readiness is separate from review status; `needs_asset` is not a review state.
- AC-05: Missing-asset packages show clear next actions instead of dead-end draft states.
- AC-06: Existing Campaign Creative -> Editor handoff remains compatible and available as an advanced fine-tune path.
- AC-07: MVP stays honest: no fake analytics, no automatic publishing, no broad EditorWorkbench refactor.
- AC-08: Default Campaign Creative UX remains mission-first and does not reintroduce Knowledge Brain pack selection, multi-project brain selection, or the old expert brief form.

## Editable Files (Builder Ownership)
- docs/plans/2026-05-07-campaign-to-distribution-handoff-mvp-design.md
- docs/plans/README.md
- docs/TASK-INDEX.md
- docs/workflow/runs/2026-05-07-campaign-to-distribution-handoff-mvp/
- h5-video-tool/src/components/campaign/distributionPackage.ts
- h5-video-tool/src/components/campaign/DistributionPackagePanel.tsx
- h5-video-tool/src/components/campaign/model.ts
- h5-video-tool/src/components/distribution/
- h5-video-tool/src/components/distribution/PendingDistributionPackages.tsx
- h5-video-tool/src/components/distribution/packageToDistributeDraft.ts
- h5-video-tool/src/api/campaignDistribution.ts
- h5-video-tool/src/api/client.ts
- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/pages/Login.tsx
- h5-video-tool/src/pages/TabDistribute.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/tests/
- h5-video-tool-api/src/routes/campaignDistribution.ts
- h5-video-tool-api/src/index.ts
- h5-video-tool-api/src/db/assetDb.ts
- h5-video-tool-api/src/services/campaignMissionBrief.ts
- h5-video-tool-api/src/services/campaignDistributionPackage.ts
- h5-video-tool-api/tests/
- PRODUCT.md
- CHANGELOG.md

## Read-Only References
- docs/plans/2026-05-06-campaign-creative-agent-next-phase-design.md
- docs/plans/2026-05-06-gobs-fastpublish-knowledge-integration-design.md
- docs/plans/2026-05-06-video-distribution-marketer-ux-design.md
- docs/plans/2026-05-07-gold-and-glory-canonical-brain-sync-design.md
- h5-video-tool/src/api/campaignCreative.ts
- h5-video-tool/src/components/campaign/MissionComposer.tsx
- h5-video-tool/src/components/campaign/GeneratedBriefReview.tsx
- h5-video-tool/src/api/campaignKnowledge.ts
- h5-video-tool/src/api/editorCreative.ts
- h5-video-tool/src/pages/EditorWorkbench.tsx
- h5-video-tool-api/src/routes/campaignCreative.ts
- h5-video-tool-api/src/services/campaignMissionBrief.ts
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
- Reintroducing user-facing Knowledge Brain pack selection, multi-project brain selection, or the old expert brief form in the default Campaign Creative path.
- Any change to AGENTS.md forbidden video-generation service files.

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
- Escalate if the implementation starts depending on user-selected knowledge packs instead of backend-routed Gold and Glory Brain context.
- Escalate before any prod release decision.
