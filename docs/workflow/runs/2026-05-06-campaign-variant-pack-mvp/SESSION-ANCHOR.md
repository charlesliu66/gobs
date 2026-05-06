# SESSION-ANCHOR - 2026-05-06-campaign-variant-pack-mvp

## Run Summary
- Run ID: 2026-05-06-campaign-variant-pack-mvp
- Goal: Turn one campaign strategy into a 3-variant pack with clear hook, selling-point, and CTA differences that can be handed off to Editor.
- Owner: codex
- Branch or commit context: codex/campaign-variant-pack-mvp@28f4842
- Last updated: 2026-05-06T09:15:25Z
- North Star: `Campaign Creative Agent` must start from a campaign brief, reliably produce creative assets or variants, and move them into distribution.

## Acceptance Criteria Snapshot
- AC-01: `Campaign Creative` can generate a `Variant Pack` with exactly 3 variants from one brief plus one strategy, each carrying stable IDs and structured fields for hook, opening beat, selling-point focus, CTA, editing direction, asset suggestion, and difference summary.
- AC-02: The campaign page shows the 3 variants as a comparable pack instead of a single strategy-only output, and each variant makes its hook, focus, CTA, and differentiation visible without opening Editor first.
- AC-03: Launching Editor from a selected variant sends brief, strategy, variant pack metadata, and the selected variant through handoff; the first Editor agent apply can reuse that variant context.
- AC-04: Variant generation and handoff normalization are covered by targeted automated tests, with no regression to existing strategy/brief behavior.

## Editable Files (Builder Ownership)
- docs/plans/2026-05-06-campaign-variant-pack-mvp-implementation-plan.md
- docs/workflow/runs/2026-05-06-campaign-variant-pack-mvp/
- h5-video-tool/src/components/campaign/model.ts
- h5-video-tool/src/components/campaign/strategy.ts
- h5-video-tool/src/components/campaign/CampaignStrategyCard.tsx
- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/src/editor/utils/editorCreativeBrief.ts
- h5-video-tool/src/api/editorCreative.ts
- h5-video-tool/src/editor/components/AgentPanel.tsx
- h5-video-tool/src/pages/EditorWorkbench.tsx
- h5-video-tool/tests/editorCreativeBrief.test.ts
- h5-video-tool/tests/campaignVariantPack.test.ts
- h5-video-tool-api/src/services/editorCreativeBrief.ts
- h5-video-tool-api/src/services/editorCreativeVariantContext.ts
- h5-video-tool-api/src/services/editorAgentService.ts
- h5-video-tool-api/src/routes/editorAgent.ts
- h5-video-tool-api/tests/editorCreativeBrief.test.ts
- PRODUCT.md
- CHANGELOG.md

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-06-campaign-creative-agent-next-phase-design.md
- docs/plans/2026-05-06-campaign-strategy-productization-implementation-plan.md

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- Auto-generating final timeline variants or multiple rendered videos from the pack
- Feedback loop, publish tracking, or distribution automation
- New backend persistence, new env vars, or changes to forbidden provider-service files
- More than 3 variants, or free-form variant counts configurable in this run
- Reworking the Editor UX beyond the minimum needed to display and consume selected variant context

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
