# SESSION-ANCHOR - 2026-05-07-campaign-advanced-studio-phase0

## Run Summary
- Run ID: 2026-05-07-campaign-advanced-studio-phase0
- Goal: Make the campaign-first surface clearly primary by moving editor-first controls behind an Advanced Studio boundary
- North Star: Campaign Creative Agent must start from campaign brief, produce creative assets or variants, and move them into distribution.
- Owner: codex
- Branch or commit context: codex/campaign-advanced-studio-phase0@6bd7fe9
- Last updated: 2026-05-07T03:56:02Z

## Product Shape Guardrail

> `Campaign Creative Agent` must start from campaign brief, produce creative assets or variants, and move them into distribution.

This run is only about clarifying that editor and production surfaces are advanced follow-on tools. It should not change the main campaign flow, the handoff chain, or any route behavior.

## Acceptance Criteria Snapshot
- AC-01: New or normalized advanced-entry labels resolve correctly in both locales, including `Open In Advanced Studio`, `Fine-Tune In Editor`, and `Review Before Publish`.
- AC-02: `CampaignStrategyCard` clearly frames the editor launch as an advanced follow-on action without changing its behavior.
- AC-03: `ProjectList` and `EditorWorkbench` read as advanced review/fine-tuning workspaces instead of default campaign entry points, while existing handlers and routes remain unchanged.

## Editable Files (Builder Ownership)
- h5-video-tool/src/components/campaign/CampaignStrategyCard.tsx
- h5-video-tool/src/pages/ProjectList.tsx
- h5-video-tool/src/pages/EditorWorkbench.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/src/i18n/locale.test.ts
- docs/workflow/runs/2026-05-07-campaign-advanced-studio-phase0/
- PRODUCT.md
- CHANGELOG.md

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-06-campaign-mission-control-phase0-implementation-plan.md

## Additional Forbidden Paths
- None beyond AGENTS.md global forbidden files

## Out of Scope
- Any route change, query-param change, or editor handoff storage-key change
- Any project storage or editor workflow logic change
- Any nav regrouping outside the already shipped mission-control layout
- Knowledge, feedback, or distribution behavior changes

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
