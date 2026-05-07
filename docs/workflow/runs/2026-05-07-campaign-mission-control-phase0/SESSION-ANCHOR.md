# SESSION-ANCHOR - 2026-05-07-campaign-mission-control-phase0

## Run Summary
- Run ID: 2026-05-07-campaign-mission-control-phase0
- Goal: Reframe the default surface from tool-first to campaign-first so marketers can drive campaigns with fewer decisions
- North Star: Campaign Creative Agent must start from campaign brief, produce creative assets or variants, and move them into distribution.
- Owner: codex
- Branch or commit context: codex/campaign-mission-control-phase0@2989597
- Last updated: 2026-05-07T03:31:00Z

## Product Shape Guardrail

> `Campaign Creative Agent` must start from campaign brief, produce creative assets or variants, and move them into distribution.

This run is only about making the default surface feel more like a system planning and producing campaigns for marketers. Local editor power-ups that do not strengthen this chain are secondary.

## Acceptance Criteria Snapshot
- AC-01: Campaign handoff/domain types preserve mission-control-friendly campaign fields without breaking the existing knowledge-aware brief/strategy chain.
- AC-02: Home and global navigation make `Campaign Mission Control` / `Campaign Creative` the clear default path for marketers, while advanced routes remain reachable.
- AC-03: `CampaignCreative` defaults to brief + knowledge selection + system plan + asset pack preview + pending decisions, with tuning controls visually secondary.

## Editable Files (Builder Ownership)
- h5-video-tool/src/components/campaign/model.ts
- h5-video-tool/src/components/campaign/strategy.ts
- h5-video-tool/src/components/campaign/CampaignBriefForm.tsx
- h5-video-tool/src/components/campaign/CampaignStrategyCard.tsx
- h5-video-tool/src/components/campaign/CampaignStrategyTuningPanel.tsx
- h5-video-tool/src/components/campaign/CampaignKnowledgeSelector.tsx
- h5-video-tool/src/components/campaign/CampaignPlanCard.tsx
- h5-video-tool/src/components/campaign/CampaignPendingActionsCard.tsx
- h5-video-tool/src/components/campaign/strategy.test.ts
- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/pages/Home.tsx
- h5-video-tool/src/components/Layout.tsx
- h5-video-tool/src/App.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/src/i18n/locale.test.ts
- h5-video-tool/src/editor/utils/editorCreativeBrief.ts
- h5-video-tool-api/src/services/editorCreativeBrief.ts
- h5-video-tool-api/tests/editorCreativeBrief.test.ts
- docs/workflow/runs/2026-05-07-campaign-mission-control-phase0/
- PRODUCT.md
- CHANGELOG.md

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-06-campaign-creative-agent-next-phase-design.md
- docs/plans/2026-05-06-campaign-mission-control-phase0-implementation-plan.md
- docs/plans/2026-05-06-gobs-fastpublish-knowledge-integration-design.md
- docs/plans/2026-05-06-gobs-fastpublish-knowledge-integration-implementation-plan.md

## Additional Forbidden Paths
- None beyond AGENTS.md global forbidden files

## Out of Scope
- Task 4 `Advanced Studio` demotion beyond minimal label/copy changes needed by Task 2-3
- Task 5 `Human Feedback Loop`
- Distribution flow behavior changes
- New env vars, provider service changes, or forbidden-file edits

## Progress Checklist
- [x] Planner approved
- [x] Challenger approved
- [x] Builder self-test recorded
- [x] Verifier P0/P1 count is zero
- [x] Release decision written

## Escalation Rules
- Escalate if a forbidden file must change.
- Escalate if a new env var is required.
- Escalate if ACs need to expand into Task 4/5 scope.
- Escalate before prod release approval.
