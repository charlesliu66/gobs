# PlannerSpec - 2026-05-06-video-distribution-marketer-ux-initial

## 1) Project Goal
- Business goal: Land the first marketer-facing distribution workflow upgrade across P0 foundations plus light P1/P2 scaffolding
- User value: Let marketing teammates publish approved videos more safely, with clearer platform copy and better confidence before and after publish.
- Success metrics: Users can select an asset without relying on fresh Studio state, no account is implicitly preselected, publish history survives refresh, and campaign-framing inputs are visible without new infrastructure.

## 2) Scope
### In Scope
- Distribution-page UX and API wiring inside the approved builder scope.
- P0 implementation for:
  - asset-first publish entry
  - explicit account selection
  - platform-aware copy handling
  - persistent publish-history surface
- Light P1 scaffolding for:
  - campaign objective / audience / CTA / market inputs
  - preflight checklist
  - surfacing existing publish options where already supported
- P2 follow-up design spike only, with no runtime scheduling or approval behavior.

### Out of Scope
- h5-video-tool-api/src/services/dreaminaVideo.ts
- h5-video-tool-api/src/services/klingVideo.ts
- h5-video-tool-api/src/services/veoPython.ts
- scheduling-runtime
- approval-workflow

## 3) Module Breakdown
- Distribution page orchestration:
  - Responsibilities: Manage selected asset, account selection, caption generation, publish review, and latest/history views.
  - Dependencies: `TabDistribute.tsx`, localized copy, existing CreateFlow context.
- Distribution UI components:
  - Responsibilities: Factor asset picker, publish history, preflight review, and any platform-card UI into smaller pieces.
  - Dependencies: `h5-video-tool/src/components/distribute/`.
- Frontend API helpers:
  - Responsibilities: Expose recent output videos, publish history, and prompt-generation request shape cleanly to the UI.
  - Dependencies: `h5-video-tool/src/api/*.ts`, `videoHistory.ts`.
- Backend route and prompt-context wiring:
  - Responsibilities: Reuse existing GeeLark services, normalize task-history output, and extend caption-generation context with lightweight campaign-framing fields.
  - Dependencies: `h5-video-tool-api/src/routes/geelark.ts`, `prompt.ts`, `services/promptPolish.ts`, existing service contracts.
- Regression coverage:
  - Responsibilities: Lock UX rules and route-shape expectations with focused tests.
  - Dependencies: `h5-video-tool/tests`, `h5-video-tool-api/tests`.

## 4) Technical Approach
- Architecture decisions:
  - Keep the distribution workflow centered in `TabDistribute.tsx`, but split new presentation sections into `src/components/distribute/` to avoid deepening the existing monolith.
  - Reuse existing APIs before adding new backend behavior. Prefer exposing already-available data such as `/api/geelark/tasks` and `/api/video/output-recent`.
  - Keep low-level publish and generation services unchanged unless route-level wiring proves insufficient.
- Data flow:
  - Selected asset becomes a first-class UI state object derived from create-flow, local history, or recent server outputs.
  - Selected accounts remain explicit UI-owned state and are never auto-populated after load/filter changes.
  - Caption generation consumes selected asset metadata plus selected-account context and returns either per-platform variants or manual fallback text.
  - Recent publishes load from server task history and can merge with the current in-memory batch state for continuity.
- API or interface changes:
  - Frontend may add helper functions/types for output-recent assets and publish-history retrieval.
  - Backend route changes are allowed only inside `routes/geelark.ts` and `routes/prompt.ts`, and should remain backward-compatible where practical.
- Migration or compatibility notes:
  - Existing create-flow handoff should keep working as a suggested asset source.
  - P2 scheduling remains documentation-only in this run.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Dirty worktree | Unrelated local docs are already modified in the repo | Accidental staging or noisy guard output | Stage only builder-owned files; treat unrelated docs as warnings unless they enter release scope | Integrator |
| TabDistribute integration risk | New asset/copy/history states are layered into a large existing component | Regressions in publish, caption generation, or empty-state rendering | Extract focused components and lock key behaviors with node:test coverage before refactor depth increases | Builder |
| API-shape drift | Frontend expects richer history or prompt fields than routes currently expose | Runtime mismatch or partial UX | Add narrow route-level compatibility changes and pair them with backend tests | Builder |
| Scope creep from P1/P2 | Campaign framing or scheduling requests expand beyond initial slice | Run stalls or touches forbidden services | Keep P1 as scaffolding only and P2 as design-spike only; escalate if runtime behavior must expand | Orchestrator |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | P0 asset-first distribution flow works without implicit account selection | Frontend regression tests + manual code-path inspection | User can reach publish-ready state from a selected asset object, and no account is preselected automatically on load or filter changes |
| AC-02 | P0 platform-specific copy and publish-history UX no longer depend on transient page state | Frontend tests, backend route-shape tests, manual render review | Per-platform copy is represented explicitly, and recent publish information can be reloaded after refresh using server-backed history |
| AC-03 | P1 campaign framing and preflight scaffolding are visible in the distribution workflow without requiring new env vars | Frontend tests + backend request-shape tests | Campaign intent inputs and checklist/review affordances are wired into the page and prompt route contracts without new environment configuration |
| AC-04 | P2 scheduling and handoff remain out of runtime scope and are captured as a follow-up design spike | Documentation review | A dedicated design-spike artifact exists and no runtime code in this run adds scheduling or approval workflow behavior |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Select recent output/local asset, choose accounts intentionally, generate copy, and render publish review/history sections without create-flow-only assumptions. |
| Edge cases | No accounts selected, only `videoPath` available, filtered account list empty, history available but no active batch, translation invoked on selected platform payload. |
| Error path | Publish blocked when asset or accounts are missing; task-history load tolerates fetch failure; prompt route rejects malformed optional campaign fields safely. |
| Regression | Existing create-flow video handoff still pre-populates a candidate asset; current publish API still accepts legacy payload shape. |
| Stress/Stability | Page refresh or remount can reconstruct recent publish history without relying on transient `latestBatch` memory alone. |

## 8) Delivery Artifacts
- Code changes: distribution page UI/components, API helpers, route wiring, targeted tests, and a P2 design-spike doc.
- Test evidence: targeted `node --import tsx --test` runs, `npx tsc --noEmit`, frontend/backend builds, workflow guard stage checks, and repo eval where feasible.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
