# SESSION-ANCHOR - 2026-05-07-gold-and-glory-canonical-brain-sync

## Run Summary
- Run ID: 2026-05-07-gold-and-glory-canonical-brain-sync
- Goal: Import canonical Gold and Glory fastpublishing knowledge into persisted Campaign Knowledge packs without adding multi-project runtime coupling.
- Final product shape: Campaign Creative Agent turns a campaign brief into ready creative assets and distribution with less human intervention over time.
- Owner: codex
- Branch or commit context: codex/gold-and-glory-canonical-brain-sync@c891686
- Last updated: 2026-05-07T06:26:51Z

## Acceptance Criteria Snapshot
- AC-01: Gold and Glory imports a canonical fastpublishing-derived brain seed instead of the generic fastpublish demo template.
- AC-02: Imported packs contain durable source metadata, source checksums, and enough brand/market/persona/live-ops/playbook content for Campaign Creative derivation.
- AC-03: Frontend import flow targets the Gold and Glory canonical template and no longer suggests empty/demo knowledge packs.
- AC-04: Tests cover canonical import behavior and UI/API default template selection.
- AC-05: PRODUCT.md and run artifacts document the manual fastpublishing-to-GOBS brain refresh workflow.

## Editable Files (Builder Ownership)
- h5-video-tool-api/src/services/campaignKnowledgeImport.ts
- h5-video-tool-api/src/services/campaignKnowledgeStore.ts
- h5-video-tool-api/src/routes/campaignKnowledge.ts
- h5-video-tool-api/src/config/campaignKnowledge/
- h5-video-tool-api/tests/
- h5-video-tool/src/api/campaignKnowledge.ts
- h5-video-tool/src/context/PlatformMemoryContext.tsx
- h5-video-tool/src/pages/PlatformFramework.tsx
- h5-video-tool/src/i18n/
- h5-video-tool/tests/
- docs/plans/2026-05-07-gold-and-glory-canonical-brain-sync-design.md
- docs/workflow/runs/2026-05-07-gold-and-glory-canonical-brain-sync/
- PRODUCT.md
- CHANGELOG.md

## Read-Only References
- C:/Users/wei.liu/Desktop/cursor_try/fastpublishing/knowledge/game/brand/
- C:/Users/wei.liu/Desktop/cursor_try/fastpublishing/knowledge/market/my/
- C:/Users/wei.liu/Desktop/cursor_try/fastpublishing/knowledge/live-ops/
- C:/Users/wei.liu/Desktop/cursor_try/fastpublishing/knowledge/market/_playbooks/selling-point-extractor.md
- docs/plans/2026-05-06-gobs-fastpublish-knowledge-integration-design.md
- docs/plans/2026-05-06-gobs-fastpublish-knowledge-integration-implementation-plan.md

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- Importing Project Nova Arena, Idle Kingdom Go, or any non-Gold-and-Glory project brain.
- Scanning fastpublishing shared/handoffs, reports, plans, or full GNG_Sharing-extracted slide dumps in this MVP.
- Adding scheduled sync, background watchers, or new production environment variables.
- Changing video generation/distribution low-level services.
- Replacing fastpublishing as the source of truth; this run only publishes a curated Gold and Glory snapshot into GOBS.

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
