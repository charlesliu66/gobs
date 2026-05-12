# Node 2 Multi-Agent Dispatch Plan

> Date: 2026-05-11
> Status: Orchestrator draft
> Scope: Start Node 2 from the comprehensive optimization plan with one main thread, two Dev Worker lanes, and one Release Owner lane.

## Goal

Treat Node 2 as one release bundle:

- `C1 + C2 + C3 + C4`
- `D1 + D2 + D3 + D4 + D5 + D6`

Development may commit and push run-by-run, but deployment should wait until the whole Node 2 bundle is ready.

## Baseline Check

As of 2026-05-11, the visible Git baseline is:

- `origin/main` = `82cc0e1`
- includes `A1/A2/B1/B2/B3/B4`
- `B3` commit = `2e2cb387c65418441d6d2be1fa15634c350c482a`
- verified locally that `2e2cb38` is an ancestor of `origin/main`

Node 2 may start directly from the current `main` baseline. `C4` can assume the Banner prompt context from `B3` is already present.

## Agent Topology

| Lane | Role | Responsibility |
|---|---|---|
| Main thread | Orchestrator | run selection, scope control, sequencing, heartbeat review, and release gating |
| Agent A | Dev Worker | asset/data/distribution behavior lane |
| Agent B | Dev Worker | large frontend refactor and UX lane |
| Agent C | Release Owner | backup, staging, release-ready, prod, smoke, and idle restore |

## Hard Constraints

- Agent A and Agent B must not deploy.
- Agent C must not start release work until all selected Node 2 runs are GO and pushed.
- `C4` and `D3` must not run in parallel because both touch the `/distribute` flow.
- `D4` must not start until `D1` and `D2` are stable enough to accept the bridge.
- Keep the existing dirty plan file `docs/plans/2026-05-11-campaign-production-coverage-v2-adjustment-plan.md` out of Node 2 commits unless the run is explicitly about that file.

## Recommended Run IDs

| Plan label | Suggested run id |
|---|---|
| C1 | `2026-05-11-team-asset-visibility` |
| C2 | `2026-05-11-asset-preprocess-gap-fill` |
| C3 | `2026-05-11-drive-team-library-import` |
| C4 | `2026-05-11-distribution-bridge-upgrade` |
| D1 | `2026-05-11-production-wizard-split` |
| D2 | `2026-05-11-editor-workbench-split` |
| D3 | `2026-05-11-distribute-page-split` |
| D4 | `2026-05-11-production-editor-bridge` |
| D5 | `2026-05-11-publish-failure-guidance` |
| D6 | `2026-05-11-basic-onboarding` |

## Lane A Sequence

Keep the asset/storage/distribution-behavior chain on one lane to avoid cross-window collisions in backend schema and `/distribute` behavior.

| Order | Run | Why this lane owns it | Main touch zones |
|---|---|---|---|
| A-1 | `C1` Team Asset Visibility | introduces asset schema and visibility metadata that later asset/distribution work depends on | `h5-video-tool-api/src/db/assetDb.ts`, asset routes/services, Asset Library UI |
| A-2 | `C2` Asset preprocess gap fill | extends the same asset ingest path and metadata contract | `assetIngestService.ts`, asset tagging/thumbnail flow, asset detail surfaces |
| A-3 | `C3` Google Drive -> Team Library | depends on the asset ingest path and should write into the same asset contract | `src/routes/googleDrive.ts`, Drive service integration, asset ingest handoff |
| A-4 | `C4` Distribution Bridge upgrade | consumes B2/B3 outputs plus asset readiness, and lands the behavior before the distribute refactor | campaign distribution package files, `/distribute` copy/package bridge, backend distribution route |
| A-5 | `D3` TabDistribute split | should happen after `C4` so the refactor preserves the upgraded distribution behavior instead of forcing a second merge | `TabDistribute.tsx`, distribute state/utilities, history/publish sections |
| A-6 | `D5` publish failure guidance | same `/distribute` lane, lower-risk follow-up after the page split | `DistributeStepPublish.tsx`, `distributePageViewModel.ts` |

## Lane B Sequence

Keep the large UI refactors and the Production/Editor bridge on the second lane.

| Order | Run | Why this lane owns it | Main touch zones |
|---|---|---|---|
| B-1 | `D1` ProductionWizard split | large isolated refactor in one surface | `ProductionWizard.tsx`, `src/studio/steps/*`, new page/state modules |
| B-2 | `D2` EditorWorkbench split | large isolated refactor in a different surface | `EditorWorkbench.tsx`, editor components, editor state modules |
| B-3 | `D6` basic onboarding | light, independent UI work that can land whenever the lane has a short gap | `Home.tsx`, local onboarding state/copy |
| B-4 | `D4` Production -> Editor bridge | depends on both Production and Editor structures being stable | `StepExportWorkspace.tsx`, `SyncProductionModal.tsx`, editor timeline types |

`D6` may be pulled earlier if Agent B needs a short filler run while `D1` or `D2` is waiting for review.

## Cross-Lane Dependencies

| Dependency | Rule |
|---|---|
| `B3` -> `C4` | `C4` should not start from a baseline that lost Banner prompt context |
| `C1` -> `C3` | Drive import should write the new Team/visibility fields instead of inventing a second shape |
| `C2` -> `C3` | Drive import should reuse the finalized ingest/preprocess path |
| `C4` -> `D3` | refactor `/distribute` only after the upgraded behavior lands |
| `D1` + `D2` -> `D4` | bridge work should target stable Production/Editor module boundaries |

## Suggested Wave Order

### Wave 0

- Reconcile `B3` baseline.
- Bootstrap all Node 2 runs with `SESSION-ANCHOR.md` and `planner-spec.md`.
- Lock editable scopes so A and B do not overlap.

### Wave 1

- Agent A: `C1`
- Agent B: `D1`

### Wave 2

- Agent A: `C2`
- Agent B: `D2`

### Wave 3

- Agent A: `C3`
- Agent B: `D6`

### Wave 4

- Agent A: `C4`
- Agent B: `D4`

### Wave 5

- Agent A: `D3`
- Agent B: verifier/fix support, or queue polish work only if it does not overlap `D3`

### Wave 6

- Agent A: `D5`
- Agent B: final verifier/fix support

## Commit Strategy

- Commit at each run's GO boundary, not as one giant unstructured WIP.
- Push after verifier GO so the Release Owner can always pick up a clean SHA.
- Keep one handoff packet per run: run id, branch/SHA, changed areas, test/build evidence, skipped validations, and explicit no-deploy note.
- If you want one visible integration point before release, create a final Node 2 merge commit on `main` only after all ten runs are GO.

## Release Owner Plan

Agent C should stay idle until all Node 2 runs are verified and pushed.

Before deployment:

1. Confirm the target integration SHA on `origin/main`.
2. Back up `assets.db` before any staging/prod schema migration.
3. If prod/staging use `API_DATA_DIR=/home/ubuntu/qas-h5/<env>/shared-data`, the likely DB path is:
   - staging: `/home/ubuntu/qas-h5/staging/shared-data/db/assets.db`
   - prod: `/home/ubuntu/qas-h5/prod/shared-data/db/assets.db`
4. Deploy staging first.
5. Run smoke for:
   - Asset Library visibility/team filters
   - asset upload + preprocess metadata
   - Google Drive import into Team Library
   - Campaign -> Distribution package handoff for text/Banner context
   - `/distribute` page behavior after `C4` and `D3`
   - Production -> Editor bridge
   - Home onboarding card
6. Mark release-ready only after staging smoke is green.
7. Deploy prod.
8. Re-run focused prod smoke and restore deployment state to `idle`.

## Orchestrator Notes

- If Agent A or B discovers a forbidden-file change, new env var, or product behavior tradeoff, stop auto-advance and escalate.
- If another window moves `origin/main` during Node 2 development, fetch and reconcile before the next push.
- If `/distribute` or asset schema work falls behind, do not let the other lane start overlapping rescue edits; keep ownership clean and re-sequence instead.
