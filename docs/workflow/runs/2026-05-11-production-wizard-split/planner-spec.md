# PlannerSpec - 2026-05-11-production-wizard-split

## 1) Project Goal
- Business goal: Split ProductionWizard into smaller bounded modules without changing production behavior.
- User value: Make the production flow safer to iterate on by reducing the page entry surface and clarifying module ownership for follow-up runs.
- Success metrics: `ProductionWizard.tsx` becomes a thinner orchestrator, extracted modules compile without contract drift, and local verification shows no production-flow behavior change.

## 2) Scope
### In Scope
- `h5-video-tool/src/pages/ProductionWizard.tsx`
- New helper/render modules under `h5-video-tool/src/studio/steps/`
- Frontend tests under `h5-video-tool/tests/` only if needed to lock refactor behavior
- Run artifacts under `docs/workflow/runs/2026-05-11-production-wizard-split/`

### Out of Scope
- Editor workbench refactor
- Production to Editor bridge enhancements
- Provider service logic changes
- Backend/API route changes
- Product behavior or data-contract changes
- Deployment work

## 3) Module Breakdown
- ProductionWizard entry page:
  - Responsibilities: Keep async handlers, persistence wiring, queue polling, and state ownership in one place while delegating derived composition outward.
  - Dependencies: existing production hooks, API clients, storage helpers.
- ProductionWizard step/state helpers:
  - Responsibilities: Hold pure step constants, bootstrap source resolution, and derived shell state such as localized steps and max reachable step.
  - Dependencies: `productionTypes`, `productionWizardStorage`.
- ProductionWizard render surfaces:
  - Responsibilities: Render conditional step content and modal/overlay surfaces without owning business logic.
  - Dependencies: existing `Step*` modules, `ProductionContext`, `ProductionWizardShell`, lightbox/project-list components.

## 4) Technical Approach
- Architecture decisions:
  - Extract only pure or presentational boundaries in this run.
  - Keep async side effects, network calls, queue reconciliation, and storage mutation in `ProductionWizard.tsx`.
- Data flow:
  - Move bootstrap/source selection and shell-derived step state into a pure helper module.
  - Move step rendering and overlay rendering into separate components that receive existing state and handlers as props.
- API or interface changes:
  - No backend contract, route, or persisted project schema changes.
  - No new environment variables.
- Migration or compatibility notes:
  - Refactor must preserve step gating, project loading precedence, asset import behavior, queue controls, and export wiring exactly as before.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Render prop drift | Extracted step/overlay modules miss a handler or derived value | Broken step behavior despite a compile-success refactor | Keep state ownership in the page and validate with targeted tests plus builds | Builder |
| Bootstrap regression | URL/localStorage precedence changes during extraction | Wrong project loads or local draft overwrites remote state | Cover bootstrap helper with focused tests and keep precedence unchanged | Builder |
| Dirty worktree noise | Other windows continue writing docs outside this run | Guard noise or accidental staging risk | Treat out-of-scope docs as warnings and stage only builder-owned files | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | `ProductionWizard.tsx` becomes a thinner entry surface with extracted step and state modules. | Code diff review plus TypeScript/build success. | Page imports new helper/render modules and no longer inlines all step/overlay composition logic. |
| AC-02 | Existing production flow behavior, data contracts, and exported outputs remain unchanged. | Targeted helper tests plus existing relevant step/export tests and build verification. | Step gating, bootstrap precedence, queue/export callbacks, and project modals compile and test without interface changes. |
| AC-03 | Targeted tests and local frontend/backend builds validate the refactor boundary. | `tsx --test`, frontend build, backend build, workflow guard, and `eval.sh`. | All scoped verification commands pass and Gate 3 records zero P0/P1 defects. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Wizard shell still renders all five steps through extracted step content wiring. |
| Edge cases | URL `projectId` / stored project id precedence remains unchanged; max reachable step stays consistent with story/design/video state. |
| Error path | Missing story/design/shot prerequisites still show the same fallback guidance. |
| Regression | Existing step-input and export-status tests continue to pass after the split. |
| Stress/Stability | Frontend/backend production builds and `eval.sh` stay green with unrelated dirty docs still present. |

## 8) Delivery Artifacts
- Code changes: `ProductionWizard.tsx`, new `src/studio/steps/*` modules, optional focused frontend tests.
- Test evidence: `python scripts/workflow_guard.py --run-id 2026-05-11-production-wizard-split --stage build`, targeted `npx tsx --test`, `npm run build` in frontend/backend, `bash scripts/eval.sh 2026-05-11-production-wizard-split`.
- Documents to update: run artifacts for Planner/Challenger/Builder/Verifier/Release Decision.
