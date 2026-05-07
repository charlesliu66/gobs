# SESSION-ANCHOR - 2026-05-07-gold-and-glory-single-brain-phase0

## Run Summary
- Run ID: 2026-05-07-gold-and-glory-single-brain-phase0
- Goal: Collapse marketer-facing multi-project brain UI into a Gold and Glory only brain shell while keeping future extensibility internal.
- North Star: Campaign Creative Agent must start from campaign brief, produce creative assets or variants, and move them into distribution.
- Owner: codex
- Branch or commit context: codex/gold-and-glory-single-brain-phase0@61c0d28
- Last updated: 2026-05-07T05:29:01Z

## Product Shape Guardrail

> `Campaign Creative Agent` must start from campaign brief, produce creative assets or variants, and move them into distribution.

This slice corrects the marketer-facing product shell so it behaves like a single-game Gold and Glory system instead of a multi-project demo. It may simplify frontstage naming, defaults, and empty states, but it must not pretend the real fastpublish brain ingestion is already finished.

## Acceptance Criteria Snapshot
- AC-01: Marketer-facing `Campaign Creative` knowledge UI no longer shows `Project Nova Arena`, `Idle Kingdom Go`, or any `current game` / multi-project framing; it defaults to Gold and Glory only.
- AC-02: The brain shell remains honest about the current capability boundary: Gold and Glory is the only supported frontstage brain target, but real fastpublish knowledge content is not falsely implied to already exist.
- AC-03: Internal extensibility remains intact in code shape, but no new multi-project UI is surfaced on marketer-first paths in this run.

## Editable Files (Builder Ownership)
- h5-video-tool/src/context/PlatformMemoryContext.tsx
- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/components/campaign/CampaignKnowledgeSelector.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/src/i18n/locale.test.ts
- h5-video-tool/tests/platformKnowledgeBrain.test.tsx
- docs/workflow/runs/2026-05-07-gold-and-glory-single-brain-phase0/
- PRODUCT.md
- CHANGELOG.md

## Read-Only References
- docs/TASK-INDEX.md
- h5-video-tool-api/src/services/campaignKnowledgeImport.ts
- h5-video-tool-api/config/game-taxonomy.example.json

## Additional Forbidden Paths
- None beyond AGENTS.md global forbidden files

## Out of Scope
- Replacing `fastpublish-core` generic template with real Gold and Glory fastpublish content
- Changing any backend knowledge storage schema or API contract
- Reworking hidden `/platform/*` experimental routes beyond whatever falls out automatically from the single-game default context
- Adding new env vars or touching AGENTS.md-forbidden backend files

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
