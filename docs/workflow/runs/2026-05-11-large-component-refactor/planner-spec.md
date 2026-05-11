# PlannerSpec - 2026-05-11-large-component-refactor

## 1) Project Goal
- Business goal: Reduce one high-frequency large component boundary without changing product behavior.
- User value: Make `/distribute` easier to maintain after recent Campaign Package, active-context, and final-mile additions.
- Success metrics: `TabDistribute.tsx` shrinks by moving asset-option mapping/dedup/prompt helpers to a tested pure module; existing distribution behavior and builds remain green.

## 2) Scope
### In Scope
- Extract `TabDistribute.tsx` asset option helper functions into `components/distribute/distributeAssetOptions.ts`.
- Add a no-behavior-change `getVideoFileUrl` guard for Node test environments where `import.meta.env` is undefined.
- Keep the parent page responsible for React state, side effects, publish flow, account selection, and route interactions.
- Add targeted tests for current/package/local/output asset options, dedupe ordering, prompt fallback, and source labels.
- Update run/product docs.

### Out of Scope
- Any GeeLark publish API or request payload change.
- Large UI redesign or route/nav behavior change.
- Splitting `ProductionWizard`, `EditorWorkbench`, or `Studio`.
- Moving React state ownership into a new hook in this run.
- Deleting `sj-ui` or other legacy directories.

## 3) Module Breakdown
- Distribution asset helpers:
  - Responsibilities: Build current/package/local/output asset options, merge/dedupe options, resolve prompt seed, source labels.
  - Dependencies: `videoHistory`, `api/video`, pending package drafts.
- Distribution page:
  - Responsibilities: Keep state, effects, publishing, captions, history, and rendering in `TabDistribute.tsx`.
  - Dependencies: extracted helper module.
- Tests:
  - Responsibilities: Guard helper behavior independent of React rendering.
  - Dependencies: `node --test --experimental-strip-types`.

## 4) Technical Approach
- Architecture decisions: Extract pure helper functions first; avoid hook/state extraction until the behavior has a stable test surface.
- Data flow: Inputs and output shapes stay identical; only helper ownership changes.
- API or interface changes: None outside frontend module imports.
- Migration or compatibility notes: No persisted data, routes, API payloads, or publish behavior changes.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Hidden behavior change in asset selection | Helper extraction changes IDs, ordering, or URL priority | Existing Distribution drafts restore/select wrong asset | Add helper tests for package/current/local/output option ordering and dedupe | Builder |
| Publish regression | Refactor reaches publish code | Real distribution flow risk | Keep publish functions/payloads read-only; run existing distribution view-model tests | Builder |
| Scope creep | Large component refactor expands into UI/state rewrite | Higher release risk | Limit editable files and AC to asset helper extraction | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Asset-option helper implementations move out of `TabDistribute.tsx`. | Code review + line-count/source test. | Page imports helper functions/types from `distributeAssetOptions.ts`; helper implementations are absent from page. |
| AC-02 | Asset behavior remains stable. | `distributionAssetOptions.test.ts`. | Tests cover current/package/local/output assets, merge/dedupe ordering, prompt fallback, and labels. |
| AC-03 | Publish/caption/account/history behavior remains unchanged. | Diff review + existing `distributionPageViewModel.test.ts` + build/eval. | No publish API/payload code edited; tests/builds pass. |
| AC-04 | Docs and release artifacts are complete. | Workflow guard verify/release. | PRODUCT/CHANGELOG/TASK/run docs updated; guard PASS. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Current Studio result and package draft build the same selected asset options. |
| Edge cases | Duplicate video paths are deduped with package/current priority and newest ordering preserved. |
| Error path | Prompt fallback still uses explicit prompt before recent task prompt. |
| Regression | Existing distribution view-model tests still pass. |
| Stress/Stability | Frontend/backend builds and eval pass without API/publish changes. |

## 8) Delivery Artifacts
- Code changes: extracted asset helper module, import rewiring, tests, docs.
- Test evidence: targeted frontend helper tests, existing distribution view-model tests, workflow guard, `bash scripts/eval.sh 2026-05-11-large-component-refactor`.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
