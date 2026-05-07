# PlannerSpec - 2026-05-06-campaign-knowledge-brain-foundation

## 1) Project Goal
- Business goal: Land the first real Knowledge Brain slice with local knowledge pack storage, import APIs, and Platform Framework integration.
- User value: Let a market or creative operator see real game-scoped knowledge packs in GOBS instead of mock upload state, so the product can start accumulating reusable creative knowledge.
- Success metrics:
  - A selected game can persist and reload knowledge packs after refresh.
  - The frontend can trigger a template import and show returned packs without mock-only fallback.
  - A selected set of packs can be reduced into a stable derived knowledge context for future Campaign Creative and editor runs.

## 2) Scope
### In Scope
- Backend local storage for campaign knowledge sources and packs through `h5-video-tool-api/src/infra/storage/resolver.ts`.
- Backend import/template bootstrap path for a first batch of fastpublish-inspired knowledge packs.
- Backend derive-context API that converts selected pack ids into structured campaign knowledge context.
- Frontend API wiring, platform memory state wiring, and `Platform Framework` Knowledge Brain UI replacement from mock to persisted data.
- Explicit safe-id validation for `gameId` and request payload ids that can touch disk or select persisted packs.
- Targeted tests for backend storage/import/derive behavior and frontend Knowledge Brain rendering/API wiring.

### Out of Scope
- Campaign Creative strategy generation changes
- Editor prompt and memory injection changes
- GitHub live sync against fastpublish master
- Persistent custom game registry for newly added games

## 3) Module Breakdown
- Backend knowledge store:
  - Responsibilities: Persist game-scoped sources/packs and list them deterministically.
  - Dependencies: `h5-video-tool-api/src/infra/storage/resolver.ts`, filesystem JSON storage patterns.
- Backend import and derivation:
  - Responsibilities: Seed default packs, normalize raw source input, and derive `marketTruth / toneRules / forbiddenClaims / hookCandidates`.
  - Dependencies: store service, lightweight fastpublish-inspired preset mapping.
- Backend route surface:
  - Responsibilities: expose list, import-template, create-source, and derive-context APIs.
  - Dependencies: Express route registration in `src/index.ts`.
- Frontend Knowledge Brain integration:
  - Responsibilities: replace mock-only upload state with persisted pack list and import action on the Platform Framework page.
  - Dependencies: `src/api/client.ts`, `PlatformMemoryContext`, `PlatformFramework`.
  - Boundary: Knowledge actions only apply to stable seeded game ids in this run; ad-hoc `addGame` remains demo-only.

## 4) Technical Approach
- Architecture decisions:
  - Extend `resolver.ts` with a canonical campaign knowledge storage root so business code does not join `API_DATA_DIR` directly.
  - Use local JSON storage under the resolver-managed campaign knowledge root with per-user and per-game subfolders.
  - Keep preset import inside GOBS codebase rather than live-reading `fastpublish/master` at runtime.
  - Keep Knowledge Brain foundation independent from Campaign Creative and editor injection so this run stays vertically useful but scope-safe.
  - Keep newly added games outside the persisted Knowledge Brain path for this run to avoid a half-persistent UX.
- Data flow:
  - Frontend chooses current game id from `PlatformMemoryContext`.
  - If the selected game id is not part of the stable seeded game set, the Knowledge Brain block shows a disabled state or guidance instead of writing persisted packs.
  - User triggers template import or source creation.
  - Backend persists sources and packs, then returns the updated pack list.
  - Frontend reloads and renders persisted packs for the selected game.
  - Future consumers call derive-context with selected pack ids to receive a structured, prompt-safe context object.
- Route safety:
  - `gameId` must satisfy the same safe-id contract used by existing project-style routes: `/^[\\w-]{1,64}$/`.
  - `packId` and `sourceId` are server-generated; any incoming ids used for selection must be validated as safe strings before lookup.
  - Invalid route ids return `400` before any filesystem access.
- API or interface changes:
  - Add `/api/campaign-knowledge/games/:gameId/packs`
  - Add `/api/campaign-knowledge/games/:gameId/import-template`
  - Add `/api/campaign-knowledge/games/:gameId/sources`
  - Add `/api/campaign-knowledge/games/:gameId/derive-context`
- Migration or compatibility notes:
  - Existing `Platform Framework` metrics and non-knowledge mock sections stay intact.
  - If no persisted packs exist, the UI should render an empty state rather than fail.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Dirty worktree | Unrelated docs are already dirty in this repo | Guard noise or accidental staging | Keep build scope narrow and stage only run-owned files | Integrator |
| Over-coupling to future creative flow | Knowledge model tries to solve strategy/editor needs too early | Scope blow-up and brittle interfaces | Keep Phase A contract limited to pack persistence and derive-context fields needed by planned downstream work | Planner |
| Storage sprawl | Per-game JSON files diverge without a manifest contract | Hard-to-debug reload failures | Centralize reads/writes through one store service and cover with node tests | Builder |
| Unsafe path segments | Invalid `gameId` or selected ids reach disk operations | Traversal or broken manifest writes | Validate ids at route boundary before store calls and test invalid cases explicitly | Builder |
| UI regressions in Platform Framework | Replacing mock upload state breaks the broader storytelling page | Lost demo value on existing platform page | Preserve current layout and swap only the knowledge block data source | Builder |
| Half-persistent custom game UX | User creates a new game, imports packs, then loses the selector entry after refresh | Confusing broken experience | Treat `addGame` as demo-only in this run and disable persisted Knowledge Brain actions for ad-hoc ids | Planner |
| PRODUCT gate slip | Verify/release stage runs without PRODUCT update | Guard failure late in the run | Update PRODUCT.md when code scope is complete, before verify/release | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Backend can persist and list game-scoped campaign knowledge packs through the resolver-managed storage root. | `node --import tsx --test h5-video-tool-api/tests/campaignKnowledgeStore.test.ts` plus manual file inspection of resolver-backed JSON path | Calling list after save returns deterministic packs for the same user/game and survives a second read |
| AC-02 | Backend can derive structured knowledge context from selected packs with empty-safe defaults. | `node --import tsx --test h5-video-tool-api/tests/campaignKnowledgeDerivation.test.ts` | Selected pack ids yield stable `marketTruth`, `toneRules`, `forbiddenClaims`, and `hookCandidates` without raw markdown leakage, and empty selection returns arrays instead of `undefined` |
| AC-03 | Platform Framework Knowledge Brain can import template packs and display real persisted packs for a stable selected game id. | frontend targeted test plus manual browser flow | Clicking template import for a seeded/stable game updates persisted pack list for that game and renders pack cards from API-backed state; ad-hoc games show a non-persistent disabled or guidance state |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Import template for a game, persist packs, reload packs, derive context from selected packs, and render cards in Platform Framework. |
| Edge cases | Unknown but safe game id with no packs returns empty list; derive-context with empty selected ids returns an empty-safe structure; duplicate template import does not crash or leave unstable manifest state. |
| Error path | Unsafe `gameId` returns 400 before disk access; unknown or unsafe pack ids are ignored or rejected predictably; malformed source payload returns 400; missing required route inputs do not write broken files. |
| Regression | Existing Platform Framework sections outside `knowledge-brain` remain renderable; existing API client auth/locale headers still apply. |
| Stress/Stability | Repeated template import and list operations for the same game stay deterministic and do not duplicate unstable ids unexpectedly. |
| Race/Concurrency | Consecutive imports for the same game do not leave partial manifest state. |

## 8) Delivery Artifacts
- Code changes:
  - Backend route/store/import/derivation services and tests
  - Frontend knowledge API/context/page/card wiring and tests
- Test evidence:
  - `node --import tsx --test` targeted backend tests
  - `node --import tsx --test` targeted frontend tests
  - `cd h5-video-tool-api && npx tsc --noEmit`
  - `cd h5-video-tool && npm run build`
  - workflow guard build/verify checks
- Documents to update:
  - run artifacts in this folder
  - `PRODUCT.md`
  - `CHANGELOG.md`
