# SESSION-ANCHOR - 2026-05-11-gobs-navigation-structure

## Run Summary
- Run ID: 2026-05-11-gobs-navigation-structure
- Goal: Implement comprehensive optimization Run A1/A2: reorganize main navigation semantics and add Studio production entry guidance without changing routes or deleting experimental pages.
- Owner: codex
- Branch or commit context: codex/2026-05-11-gobs-navigation-structure@5c8b3f8
- Last updated: 2026-05-11T09:05:51Z

## Acceptance Criteria Snapshot
- AC-01: Sidebar navigation is regrouped into Campaign / Produce / Assets / Distribute / History semantics without deleting or renaming any route.
- AC-02: Platform planning routes stay direct-link routeable and are discoverable only through a Home experimental entry, not the primary sidebar.
- AC-03: `/studio` shows a top guidance section explaining Advanced Studio, QuickFilm, Production Wizard, and Editor with direct entry actions.
- AC-04: Route compatibility remains intact for `/campaign-creative`, `/studio`, `/studio/production`, `/quickfilm`, `/editor`, `/asset-library`, `/gallery`, `/distribute`, `/history`, `/projects`, `/platform*`, and `/tiktok-matrix`.
- AC-05: Source-level tests and frontend build verify the navigation/guide changes.

## Editable Files (Builder Ownership)
- h5-video-tool/src/components/Layout.tsx
- h5-video-tool/src/pages/Home.tsx
- h5-video-tool/src/pages/Studio.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/src/i18n/locale.test.ts
- h5-video-tool/tests/legacySurfaceReduction.test.ts
- h5-video-tool/tests/navigationStructure.test.ts
- PRODUCT.md
- CHANGELOG.md
- docs/TASK-INDEX.md
- docs/workflow/runs/2026-05-11-gobs-navigation-structure/

## Read-Only References
- docs/TASK-INDEX.md
- C:/Users/User/Downloads/2026-05-11-gobs-comprehensive-optimization-plan.md
- docs/plans/2026-05-11-campaign-production-coverage-v2-adjustment-plan.md
- docs/plans/2026-05-11-campaign-production-coverage-and-team-assets-plan.md

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- No backend route/API/schema changes.
- No provider, video-generation, render/export, or deployment script changes.
- No deletion of Platform, Risk Console, TikTok Matrix, `sj-ui`, or legacy route code.
- No Campaign Output Coverage, Team Asset, Banner Prompt, or Distribution Package implementation in this run.
- No staging/prod deployment from this Dev Worker window.
- Existing dirty local edit in `docs/plans/2026-05-11-campaign-production-coverage-v2-adjustment-plan.md` is not owned by this run and must not be staged.

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
