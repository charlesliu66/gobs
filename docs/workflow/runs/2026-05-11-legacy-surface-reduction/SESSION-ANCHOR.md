# SESSION-ANCHOR - 2026-05-11-legacy-surface-reduction

## Run Summary
- Run ID: 2026-05-11-legacy-surface-reduction
- Goal: Reduce legacy/non-mainline surfaces from primary navigation while keeping direct URLs and rollback boundaries intact.
- Owner: codex
- Branch or commit context: codex/2026-05-11-legacy-surface-reduction@24c23c1
- Last updated: 2026-05-11T07:04:21Z

## Acceptance Criteria Snapshot
- AC-01: `/tiktok-matrix` is removed from primary sidebar navigation, while the direct route and legacy `/geelark*` redirects remain reachable.
- AC-02: Platform planning routes stay direct-link-only and are not reintroduced into primary navigation.
- AC-03: `src/sj-ui` remains isolated from app source imports; deletion is explicitly deferred to a separate rollback-friendly commit/run.
- AC-04: Source-presence tests and production builds prove Campaign, Studio, Distribution, direct legacy routes, and tooling isolation still compile.

## Editable Files (Builder Ownership)
- docs/TASK-INDEX.md
- docs/plans/2026-05-09-legacy-surface-reduction-audit.md
- docs/plans/2026-05-11-legacy-surface-reduction.md
- docs/workflow/runs/2026-05-11-legacy-surface-reduction/
- CHANGELOG.md
- PRODUCT.md
- h5-video-tool/src/components/Layout.tsx
- h5-video-tool/tests/legacySurfaceReduction.test.ts

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-10-gobs-next-optimization-checklist.md
- h5-video-tool/src/App.tsx
- h5-video-tool/vite.config.ts
- h5-video-tool/tsconfig.app.json
- h5-video-tool/eslint.config.js

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- Deleting `h5-video-tool/src/sj-ui/` in this commit.
- Removing `/tiktok-matrix`, `/geelark`, `/geelark-batch`, or Platform direct routes.
- Changing GeeLark publish APIs, provider services, data contracts, or distribution business behavior.
- Refactoring large components such as `TabDistribute`, `ProductionWizard`, or `EditorWorkbench`.

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
