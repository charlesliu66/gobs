# PlannerSpec - 2026-05-09-distribution-step-readiness-nav

## 1) Project Goal
- Business goal: Add a low-risk Distribution Center four-step readiness navigation so operators can see what is complete and jump between asset, copy, account, and publish sections.
- User value: Operators can scan the whole publish path before scrolling through the dense `/distribute` page, then jump directly to the step that needs attention.
- Success metrics: Four navigation items render in order, reflect the existing asset/copy/account/publish readiness state, and link to stable step anchors without changing publish behavior.

## 2) Scope
### In Scope
- A presentational readiness navigation component for the four Distribution Center steps.
- Stable section wrapper ids around the existing step components.
- `TabDistribute` wiring that derives navigation items from existing computed values only.
- Bilingual i18n labels, focused render/source tests, and product changelog docs.

### Out of Scope
- GeeLark publish API changes, task history query/pagination/export, approval flow, scheduling, analytics, or non-GeeLark channels.
- Forced linear wizard navigation.
- Global state management or broad `TabDistribute` rewrite.
- Distribution Package schema changes or backend persistence changes.

## 3) Module Breakdown
- Readiness navigation component:
  - Responsibilities: Render four status-aware anchors with accessible labels and stable layout.
  - Dependencies: existing design tokens and React only.
- Step anchors:
  - Responsibilities: Wrap each existing step component with a stable `id` in `TabDistribute`.
  - Dependencies: `DistributeStepAsset`, `DistributeStepCopy`, `DistributeStepAccounts`, `DistributeStepPublish`.
- Page wiring:
  - Responsibilities: Build readiness items from existing `preflightItems`, `selectedAsset`, `selectedIds`, `pushing`, `pushError`, and publish-disabled logic.
  - Dependencies: current `TabDistribute` memoized values and i18n messages.
- Tests/docs:
  - Responsibilities: Assert composition and static rendering, record workflow artifacts, update product history.
  - Dependencies: existing Node render tests.

## 4) Technical Approach
- Architecture decisions: Add one small presentational component instead of changing publish state ownership or step component APIs.
- Data flow: `TabDistribute` already computes preflight and publish readiness; reuse those values to produce `DistributeStepReadinessItem[]`.
- API or interface changes: Frontend component props only; no HTTP/API changes.
- Migration or compatibility notes: Existing routes remain scroll-based; anchors are additive and safe if browser hash navigation is unchanged.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Status mismatch | Navigation defines readiness differently from preflight/publish | Operators see conflicting state | Reuse existing `preflightItems`, `selectedAsset`, `selectedIds`, and publish-disabled values | Builder |
| Anchor drift | Step ids get renamed later | Quick-jump links stop landing correctly | Keep ids in one local object and assert source presence | Builder |
| Visual clutter | New nav makes the dense page heavier | Operators lose scan efficiency | Keep it compact, one row/grid, no sticky behavior or long instructions | Builder |
| Scope creep | Adding readiness leads to state refactor | Regression risk in GeeLark publish flow | Keep all publish, polling, package hydration, and history behavior untouched | Integrator |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Four-step readiness navigation renders after pending packages and before Step 1. | Source/render test | Navigation includes asset, copy, accounts, and publish items with `01`-`04` markers. |
| AC-02 | Navigation status derives from existing page state and does not add a new state model. | Source review + tests | No new reducer/global state; items are built from existing computed values in `TabDistribute`. |
| AC-03 | Each navigation item links to a stable section anchor. | Source/render test | Four wrapper ids exist and nav item hrefs point to those ids. |
| AC-04 | Existing distribution behavior remains covered. | Test commands | Focused distribution tests, frontend build, backend build, and eval pass or record explicit blocker. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Asset selected, copy present, accounts selected: nav shows all expected steps and publish ready. |
| Edge cases | Copy is empty: nav marks copy as optional/attention without blocking publish. |
| Error path | No asset or no accounts: nav points to missing step and publish stays blocked. |
| Regression | Existing distribution step render tests still pass. |
| Visual | `/distribute` keeps a compact scan surface and stable anchors for the four sections. |

## 8) Delivery Artifacts
- Code changes: `TabDistribute`, one readiness nav component, i18n labels.
- Test evidence: focused Node render/source tests, frontend/backend builds, workflow guard, `bash scripts/eval.sh 2026-05-09-distribution-step-readiness-nav`.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`.
