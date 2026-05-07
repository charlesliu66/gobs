# SESSION-ANCHOR - 2026-05-07-campaign-advanced-studio-phase1

## Run Summary
- Run ID: 2026-05-07-campaign-advanced-studio-phase1
- Goal: Move advanced project entry behind the Advanced Studio boundary and make pending review the clearer default follow-on action.
- North Star: Campaign Creative Agent must start from campaign brief, produce creative assets or variants, and move them into distribution.
- Owner: codex
- Branch or commit context: codex/campaign-advanced-studio-phase1@501111e
- Last updated: 2026-05-07T05:08:00Z

## Product Shape Guardrail

> `Campaign Creative Agent` must start from campaign brief, produce creative assets or variants, and move them into distribution.

This slice strengthens the marketer-first shell without changing any route behavior, project storage behavior, or editor handoff logic. The job is to keep `Campaign Creative` and `pending review` visually primary while pushing `/projects` fully behind the `Advanced Studio` boundary.

## Acceptance Criteria Snapshot
- AC-01: `/projects` no longer appears in the primary `Mission Control` nav group and instead appears under the `Advanced Studio` group with copy that matches its advanced positioning.
- AC-02: Home makes `pending review` the clearer default follow-on action through copy and CTA hierarchy, while `Advanced Studio` remains reachable as an explicitly optional professional path.
- AC-03: `/projects`, `/studio`, and `/studio/production` continue to use the same routes and handlers as before; this run changes framing, grouping, and copy only.

## Editable Files (Builder Ownership)
- h5-video-tool/src/components/Layout.tsx
- h5-video-tool/src/pages/Home.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/src/i18n/locale.test.ts
- docs/workflow/runs/2026-05-07-campaign-advanced-studio-phase1/
- PRODUCT.md
- CHANGELOG.md

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-06-campaign-mission-control-phase0-implementation-plan.md
- docs/workflow/runs/2026-05-07-campaign-advanced-studio-phase0/SESSION-ANCHOR.md

## Additional Forbidden Paths
- None beyond AGENTS.md global forbidden files

## Out of Scope
- Any route change for `/projects`, `/studio`, `/studio/production`, or `/campaign-creative`
- Any project storage or project lifecycle behavior change
- Any editor, production-wizard, or campaign-handoff payload change
- Any new env var, backend change, or distribution behavior change

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
