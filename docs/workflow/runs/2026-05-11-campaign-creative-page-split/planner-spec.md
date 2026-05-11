# PlannerSpec - 2026-05-11-campaign-creative-page-split

## 1) Project Goal
- Business goal: Split the monolithic `CampaignCreative` page into bounded modules so Window B can keep landing campaign optimizations without every change colliding inside one 1k+ line file.
- User value: Operators keep the same Campaign Creative behavior and route, while the codebase becomes safer to evolve for future mission/output/distribution work.
- Success metrics: Route behavior is unchanged, the page entry becomes thin, state/render responsibilities are clearly separated, and targeted regression/build checks stay green.

## 2) Scope
### In Scope
- Move the current `CampaignCreative` page implementation behind a thin route wrapper.
- Extract shared state/handlers into a dedicated hook or state module under `src/pages/campaignCreative/`.
- Split the page render surface into bounded modules for the brief, output, strategy, and distribution areas.
- Update source-presence tests and changelog/product docs to reflect the refactor.

### Out of Scope
- Any backend/API/schema change in `h5-video-tool-api/`.
- New campaign features, output-plan semantics, or Asset Library behavior changes.
- URL/routing changes away from `/campaign-creative`.
- Deployment, staging/prod validation, or release-owner work.

## 3) Module Breakdown
- Route entry:
  - Responsibilities: Keep the existing page import path stable for the router and export the new page container.
  - Dependencies: `h5-video-tool/src/pages/CampaignCreative.tsx`.
- State module:
  - Responsibilities: Own page state, derived values, and event handlers for mission brief generation, output plan production, editor handoff, and distribution handoff.
  - Dependencies: existing campaign API modules, strategy helpers, output-plan helpers, router hooks, locale hooks.
- Step sections:
  - Responsibilities: Render bounded slices of the page layout so future changes can target one surface at a time.
  - Dependencies: existing campaign presentation components such as `MissionComposer`, `GeneratedBriefReview`, `CampaignOutputWorkbench`, `CampaignStrategyCard`, and `DistributionPackagePanel`.
- Tests and docs:
  - Responsibilities: Lock the new file boundaries and preserve key behavior expectations after the split.
  - Dependencies: existing node tests, `PRODUCT.md`, `CHANGELOG.md`, run docs.

## 4) Technical Approach
- Architecture decisions: Keep this run as a pure frontend refactor. The route file becomes a thin wrapper, a new `campaignCreative/` module tree owns state/rendering, and existing lower-level components remain reused rather than rewritten.
- Data flow: `useCampaignCreativeState` (or equivalent) centralizes state and handlers, the page container reads locale copy and renders step modules, and those modules pass through the same props to existing child components.
- API or interface changes: None. All external routes, storage keys, API calls, and imported child component contracts must remain compatible.
- Migration or compatibility notes: Presence tests that previously inspected `CampaignCreative.tsx` will be updated to inspect the new module boundaries so the refactor remains intentional instead of brittle.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Behavior regression during extraction | A handler or derived memo is accidentally dropped while moving code | Mission/output/distribution actions silently break | Move logic in bounded chunks, keep handler names stable where possible, and preserve source-presence tests for critical flows | Builder |
| Refactor only moves file without improving boundaries | The new page container stays nearly as large as the old file | Future edits still collide in one file | Split state from rendering and create multiple step modules instead of a single renamed file | Builder |
| Test drift after source relocation | Existing tests keep asserting against the old file only | False failures or reduced regression coverage | Re-point tests to the new route wrapper plus module files that now own the relevant behavior | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | `CampaignCreative.tsx` is reduced to a thin route entry and delegates to new `campaignCreative/` modules. | Source-presence tests plus file inspection. | The old 1k+ page logic no longer lives in the route file, and the route still exports `CampaignCreative`. |
| AC-02 | Mission brief generation, output production, Advanced Studio handoff, and distribution package flows preserve their current behavior and storage keys. | Source-presence checks for key handlers/strings plus successful build/test pass. | Existing critical flows remain present in the new state/page modules without route or storage-key changes. |
| AC-03 | Render responsibilities are split into bounded modules for brief, output, strategy, and distribution surfaces. | Source inspection and updated tests. | At least four dedicated page-surface modules exist under `src/pages/campaignCreative/`, and the container composes them. |
| AC-04 | User-visible docs are updated and targeted verification stays green. | `node --test ...`, frontend build, backend build, run docs, `PRODUCT.md`, `CHANGELOG.md`. | Verification evidence is recorded and docs reflect the page split. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | The thin route entry composes the new page container, and the page container still renders the mission-first flow plus output/strategy/distribution surfaces. |
| Edge cases | Critical handlers such as editor handoff and output production remain in the extracted state module with unchanged storage keys. |
| Error path | Mission brief errors and output/distribution error state wiring remain owned by the extracted state module. |
| Regression | `CampaignCreative` does not reintroduce legacy selector surfaces and still wires `CampaignOutputWorkbench`. |
| Stress/Stability | Frontend/backend production builds pass after the refactor without touching backend contracts. |

## 8) Delivery Artifacts
- Code changes: new `src/pages/campaignCreative/` modules, thin route entry, updated tests.
- Test evidence: targeted node tests, frontend/backend builds, `workflow_guard.py --stage build/verify`, and `bash scripts/eval.sh 2026-05-11-campaign-creative-page-split` if environment allows.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
