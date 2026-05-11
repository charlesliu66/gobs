# PlannerSpec - 2026-05-11-legacy-surface-reduction

## 1) Project Goal
- Business goal: Reduce legacy/non-mainline surfaces from primary navigation while keeping direct URLs and rollback boundaries intact.
- User value: Operators land on the Campaign -> Studio -> Distribution path without being distracted by parked historical tools.
- Success metrics: Primary sidebar no longer exposes `/tiktok-matrix`; direct legacy routes still build and remain reachable; `sj-ui` isolation is test-covered.

## 2) Scope
### In Scope
- Hide `/tiktok-matrix` from the primary sidebar by treating it as a legacy direct-only route.
- Preserve direct URL access for `/tiktok-matrix`, `/geelark`, `/geelark-batch`, and Platform planning routes.
- Add source-presence tests for legacy direct-only routing and `sj-ui` isolation.
- Update the legacy-surface audit and product/release docs.

### Out of Scope
- Deleting `h5-video-tool/src/sj-ui/` in this commit.
- Removing direct routes or redirects for legacy surfaces.
- Changing GeeLark publish, provider services, Campaign/Distribution contracts, or large component boundaries.

## 3) Module Breakdown
- Sidebar navigation:
  - Responsibilities: Keep main navigation focused while preserving direct-link legacy access.
  - Dependencies: `h5-video-tool/src/components/Layout.tsx`, existing `App.tsx` routes.
- Legacy isolation tests:
  - Responsibilities: Verify hidden-from-nav and direct-route behavior through source-presence checks.
  - Dependencies: `h5-video-tool/tests/legacySurfaceReduction.test.ts`.
- Documentation:
  - Responsibilities: Record what was hidden, what remains reachable, and why deletion is deferred.
  - Dependencies: run docs, audit doc, TASK index, PRODUCT/CHANGELOG.

## 4) Technical Approach
- Architecture decisions: Use a small `LEGACY_DIRECT_ONLY_PATHS` filter in `Layout.tsx` so parked surfaces stay routeable but disappear from the primary sidebar.
- Data flow: No runtime data migration. Navigation changes are static route visibility only.
- API or interface changes: None.
- Migration or compatibility notes: `/tiktok-matrix`, `/geelark`, `/geelark-batch`, and Platform pages remain direct-link accessible for one release cycle.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Hidden external usage of `/tiktok-matrix` sidebar entry | Operators relied on visible nav entry | Confusion finding parked tool | Keep direct route and legacy redirects for one release; document direct-only state | Builder |
| Accidental route removal | Nav hiding is coupled to route deletion | Legacy deep links break | Do not edit `App.tsx`; add source-presence tests for direct routes | Builder |
| `sj-ui` deletion risk | Large directory removed with nav change | Harder rollback and noisy review | Defer deletion to a separate commit/run after this release | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | `/tiktok-matrix` is no longer visible in primary sidebar navigation. | Source test plus manual/source review of `Layout.tsx`. | `LEGACY_DIRECT_ONLY_PATHS` filters the route from visible nav groups. |
| AC-02 | Direct legacy URLs remain available. | Source test of `App.tsx`. | `/tiktok-matrix`, `/geelark`, `/geelark-batch`, and Platform direct routes remain registered. |
| AC-03 | Platform planning pages remain direct-link-only. | Source test of `Layout.tsx`. | Platform paths remain in direct-only filter and are absent from visible navigation. |
| AC-04 | `src/sj-ui` isolation remains explicit. | Source scan test plus build. | No app source imports `sj-ui`/`@sj`; existing tooling references are documented as deletion boundary. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Sidebar shows Campaign/Studio/Distribution core surfaces without `/tiktok-matrix`. |
| Edge cases | Direct URL `/tiktok-matrix` and legacy redirects still route through `App.tsx`. |
| Error path | Source test fails if legacy paths are removed entirely or if `sj-ui` leaks into app source imports. |
| Regression | Campaign, Studio, Distribution, History, QuickFilm, and Asset Library nav targets remain unchanged. |
| Stress/Stability | Frontend/backend builds and eval pass without provider or data-contract changes. |

## 8) Delivery Artifacts
- Code changes: `Layout.tsx`, source-presence tests, docs.
- Test evidence: targeted frontend test, frontend/backend builds, workflow guard, `bash scripts/eval.sh 2026-05-11-legacy-surface-reduction`.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
