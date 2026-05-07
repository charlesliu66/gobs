# SESSION-ANCHOR - 2026-05-07-campaign-mission-first-autopilot

## Run Summary
- Run ID: 2026-05-07-campaign-mission-first-autopilot
- Goal: Simplify Campaign Mission Control into a mission-first flow with backend Gold and Glory Brain routing.
- Owner: codex
- Branch or commit context: codex/campaign-mission-first@640b2e0
- Last updated: 2026-05-07T08:50:00Z

## Acceptance Criteria Snapshot
- AC-01: POST /api/campaign-creative/mission-brief auto-routes Gold and Glory knowledge and returns generated brief context with fallback.
- AC-02: Campaign Creative page hides user pack selection and uses mission composer plus generated brief review.
- AC-03: Existing strategy, variant pack, and editor handoff continue to work from confirmed brief.
- AC-04: Builds, targeted tests, browser happy path, staging smoke, and prod smoke are recorded.

## Editable Files (Builder Ownership)
- h5-video-tool-api/src/routes
- h5-video-tool-api/src/services
- h5-video-tool-api/src/index.ts
- h5-video-tool/src
- h5-video-tool/tests
- docs/workflow/runs/2026-05-07-campaign-mission-first-autopilot
- PRODUCT.md
- CHANGELOG.md
- docs/TASK-INDEX.md

## Read-Only References
- docs/plans/2026-05-06-campaign-creative-agent-next-phase-design.md
- docs/plans/2026-05-07-gold-and-glory-canonical-brain-sync-design.md

## Additional Forbidden Paths
- h5-video-tool-api/src/services/dreaminaVideo.ts
- h5-video-tool-api/src/services/klingVideo.ts
- h5-video-tool-api/src/services/veoPython.ts
- h5-video-tool-api/src/services/studioPipeline.ts
- h5-video-tool-api/src/types/productionTypes.ts
- h5-video-tool-api/src/config/productionAssets.ts

## Out of Scope
- Advanced Studio and distribution publishing changes are out of scope.

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
