# SESSION-ANCHOR - 2026-05-06-campaign-creative-knowledge-consumption

## Run Summary
- Run ID: 2026-05-06-campaign-creative-knowledge-consumption
- Goal: Make Campaign Creative knowledge-aware by selecting knowledge packs, deriving structured context, and using it in strategy generation.
- Owner: codex
- Branch or commit context: codex/campaign-creative-knowledge@b1534fd
- Last updated: 2026-05-06T10:37:25Z

## Acceptance Criteria Snapshot
- AC-01: Campaign Creative can show current-game knowledge packs and let the operator select which packs participate in strategy generation.
- AC-02: Strategy generation calls the existing derive-context API and enriches the strategy object/card with knowledge-driven fields while keeping the no-knowledge fallback path working.
- AC-03: Variant generation continues to work when the strategy is knowledge-aware, and the page still builds when no supported game or no packs are available.

## Editable Files (Builder Ownership)
- CHANGELOG.md
- PRODUCT.md
- h5-video-tool/src/api/campaignKnowledge.ts
- h5-video-tool/src/components/campaign/model.ts
- h5-video-tool/src/components/campaign/strategy.ts
- h5-video-tool/src/components/campaign/CampaignStrategyCard.tsx
- h5-video-tool/src/components/campaign/CampaignKnowledgeSelector.tsx
- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/tests/campaignStrategyKnowledge.test.ts
- docs/workflow/runs/2026-05-06-campaign-creative-knowledge-consumption

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-06-gobs-fastpublish-knowledge-integration-implementation-plan.md
- docs/plans/2026-05-06-campaign-strategy-productization-implementation-plan.md
- h5-video-tool/src/context/PlatformMemoryContext.tsx
- h5-video-tool-api/src/routes/campaignKnowledge.ts
- h5-video-tool-api/src/services/campaignKnowledgeDerivation.ts

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- Editor handoff or prompt/memory injection changes
- Knowledge Brain storage/API contract changes
- Custom game persistence changes
- New env vars or deployment script behavior changes

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
