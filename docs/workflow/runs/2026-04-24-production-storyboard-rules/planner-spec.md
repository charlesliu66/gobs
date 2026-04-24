# Planner Spec: Production Storyboard Rules

## Background

Advanced Production currently relies mostly on the LLM to decide shot pacing and `durationSec`, while the downstream generation platform behaves more predictably in a tighter `4-15s` range. We want to inject a reusable storyboard rules layer into generation and refine so users get more production-ready drafts without touching forbidden core provider files.

## Acceptance Criteria

- A dedicated `productionStoryboardRules.ts` ruleset module exists and exports reusable generation/refine prompt context builders.
- `/api/studio/storyboard-table` injects the storyboard rules context into generation without removing user-provided `extraNotes`.
- `autoRefineShots` uses the refine rules context and can conservatively patch `durationSec` in addition to structured prompt fields.
- No change is made to the frontend contract or shot-count model.
- Backend typecheck/build and frontend build pass.
- A deterministic ruleset self-check confirms the generation/refine context strings render correctly.

## Risks

- Prompt context could become too long. Mitigation: keep the ruleset short, high-signal, and focused on pacing and shot structure.
- Refine could over-correct durations. Mitigation: explicitly constrain it to conservative fixes and no shot-count changes.
- TypeScript strictness may surface adjacent backend issues during release. Mitigation: include minimal type-safety fixes needed to keep the build green.

## Test Matrix

- Backend: `npx tsc --noEmit`, `npm run build`
- Ruleset self-check: `node --import tsx -e ...productionStoryboardRules.ts`
- Frontend: `npm run build`
- Release validation: shared staging/prod verification with the same release as `2026-04-24-gobs-private-skills`

## Challenger Review

No must-fix blocker before build. The run must stay in the route/rules-layer only and avoid forbidden provider core files.
