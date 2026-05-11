# Legacy Surface Reduction Audit - 2026-05-09

## 1) Decision

Current recommendation: do not delete runtime routes in this run. Treat this as the safety audit for a follow-up `Legacy Surface Reduction` run.

The low-risk next move is:
- `sj-ui`: deletion candidate after one more build/source check removes tooling aliases and exclusions together with the directory.
- `RiskSentiment/TiktokMatrix`: parked but still user-visible through `/tiktok-matrix`; hide or relabel in navigation before deletion.
- Platform pages: parked/direct-link-accessible planning surfaces; keep direct routes for now, but keep them out of primary navigation.

## 2) Source Scan Summary

### `h5-video-tool/src/sj-ui`

No active app or test imports were found outside the parked directory:

```bash
rg -n "(from\s+['\"][^'\"]*(sj-ui|@sj)|import\(['\"][^'\"]*(sj-ui|@sj)|require\(['\"][^'\"]*(sj-ui|@sj)|@sj/|src/sj-ui|\.?\.?/sj-ui)" h5-video-tool/src h5-video-tool/tests -g '!src/sj-ui/**'
```

Observed references are tooling-only:
- `h5-video-tool/eslint.config.js` ignores `src/sj-ui/**`.
- `h5-video-tool/vite.config.ts` keeps `@sj` pointing to `src/sj-ui`.
- `h5-video-tool/tsconfig.app.json` excludes `src/sj-ui`.

Recommendation:
- In the deletion run, remove the directory and the three tooling references in the same commit.
- Re-run frontend build and import scan before release.

### RiskSentiment / TiktokMatrix

Observed active route/nav behavior:
- `/tiktok-matrix` is registered in `h5-video-tool/src/App.tsx`.
- Sidebar navigation includes `/tiktok-matrix` through `h5-video-tool/src/components/Layout.tsx`.
- Runtime route currently lazy-loads `RiskSentimentEmbed`, which imports `RiskSentimentPage`.
- `TiktokMatrix.tsx` exists but is not the active route component.

Classification:
- Current state: active visible legacy surface.
- Product fit: not core to `Campaign Creative Agent -> Studio -> Distribution` happy path.
- Risk: possible external/deep-link usage because the route is active.

Recommendation:
- Follow-up step 1: hide or relabel `/tiktok-matrix` as a parked analysis tool in navigation.
- Follow-up step 2: keep direct route available for one release.
- Follow-up step 3: delete or move behind an explicit experimental flag after no usage/support need is confirmed.

Run 10 update (2026-05-11):
- `/tiktok-matrix` is moved to direct-link-only by filtering it from the primary sidebar.
- `/tiktok-matrix`, `/geelark`, and `/geelark-batch` routes remain registered for the release transition.
- Source-presence tests now guard that hidden navigation does not become route deletion.

### Platform Framework / Memory / Learning Lab / Ops

Observed active route behavior:
- Routes exist in `h5-video-tool/src/App.tsx`: `/platform`, `/platform/memory`, `/platform/learning-lab`, `/platform/ops`.
- The main layout filters planning paths out of the visible primary navigation.

Classification:
- Current state: parked direct-link surfaces.
- Product fit: adjacent operating-system concepts, not current default marketer flow.
- Risk: lower than `/tiktok-matrix` because they are already hidden from primary navigation.

Recommendation:
- Keep direct links for now.
- Add a follow-up product decision: either archive into docs/experimental area or reframe as admin-only operating memory.
- Do not delete until Campaign/Distribution telemetry or user confirmation says they are unused.

Run 10 update (2026-05-11):
- Platform planning routes remain direct-link-only and are covered by source-presence tests.
- No Platform page deletion or route behavior change is included in Run 10.

## 3) Follow-Up Run Proposal

`2026-05-xx-legacy-surface-reduction-phase1`

Acceptance criteria:
- Remove `src/sj-ui` and matching Vite/TS/ESLint references if import scan is still clean.
- Hide `/tiktok-matrix` from primary navigation or relabel it as parked/experimental.
- Keep Platform routes direct-link-only unless the product owner explicitly approves deletion.
- Add source-presence tests proving Campaign, Studio, and Distribution routes remain unchanged.
- Run frontend build, backend build, workflow eval, staging smoke, and prod smoke before closing.

Run 10 implementation note:
- This run completes the hide-from-primary-nav step and adds tests.
- `src/sj-ui` deletion is still deferred because the checklist requires a separate rollback-friendly commit if the directory is removed.
