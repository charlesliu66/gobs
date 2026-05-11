# PlannerSpec - 2026-05-11-campaign-output-coverage-map

## 1) Project Goal
- Business goal: Add a coverage summary compatibility layer to Campaign Output Workbench without changing stored capability enums.
- User value: Marketers can immediately see how much of a Campaign is directly producible, what still needs assets, and which items are only assistive/manual, instead of reverse-engineering raw `status` and `gobsCanProduce` flags.
- Success metrics: Workbench exposes quantity-weighted coverage counts and business-facing readiness labels; blocked items call out missing source assets; no enum/schema/API migrations are introduced.

## 2) Scope
### In Scope
- Add a new frontend-only coverage compatibility layer that maps existing `ProductionCapability` plus source-asset readiness into business-facing readiness buckets.
- Update `CampaignOutputWorkbench` summary and item cards to surface true coverage, assistive coverage, blocked deliverables, and per-item readiness.
- Add targeted unit/source-presence tests and update user-visible product changelog artifacts.

### Out of Scope
- Replacing or migrating `ProductionCapability`, `ProductionItemType`, or stored Output Plan data.
- Editing backend routes/services, Asset Library ingestion/querying, Google Drive flows, or Banner generation logic.
- Refactoring unrelated large components or navigation surfaces.
- Adding persistent analytics/event storage for coverage tracking.

## 3) Module Breakdown
- Coverage view-model:
  - Responsibilities: Map existing output-plan capability/state into readiness buckets and quantity-weighted summary counts.
  - Dependencies: `h5-video-tool/src/components/campaign/outputPlan.ts`.
- Workbench UI:
  - Responsibilities: Show coverage summary, per-item readiness badges, and blocked/unsupported details without changing output-plan data structures.
  - Dependencies: `CampaignOutputWorkbench.tsx`, `CampaignCreative.tsx`, `messages.ts`.
- Tests and docs:
  - Responsibilities: Lock the compatibility behavior with unit/source-presence tests and record the user-visible change.
  - Dependencies: frontend tests, run docs, `PRODUCT.md`, `CHANGELOG.md`.

## 4) Technical Approach
- Architecture decisions: Introduce a small frontend view-model (`outputCoverageViewModel.ts`) instead of editing `outputPlan.ts`, so readiness mapping stays additive and easy to delete or replace later.
- Data flow: `CampaignOutputWorkbench` reads the active plan, feeds it into the view-model, renders quantity-weighted summary metrics and per-item readiness, and leaves all persisted plan data untouched.
- API or interface changes: None beyond new frontend copy fields and a new local helper import.
- Migration or compatibility notes: Existing stored `ProductionCapability` / `ProductionItemType` values remain unchanged; readiness is a UI-only compatibility layer.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Coverage overstates real production ability | `supported_with_source_assets` or manual flows are mapped too optimistically | Marketers may think blocked/manual work is fully automated | Keep `manual_recommended -> brief_ready` out of true coverage, and show direct/template/blocked breakdowns explicitly | Builder |
| Summary counts drift from user perception | Counting item rows instead of quantities understates bundle size | Coverage card becomes misleading for packs like Facebook posts or banner specs | Use `item.quantity` as the summary numerator/denominator in the view-model and test it explicitly | Builder |
| Scope leak into `outputPlan.ts` or backend | Workbench work starts changing enums/contracts | Raises merge risk with adjacent output-plan work | Keep `outputPlan.ts` read-only in this run; isolate logic to new helper plus UI/tests | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Workbench top summary shows quantity-weighted true coverage, assistive coverage, blocked deliverables, and link health. | Source-presence checks plus frontend manual review/build. | `CampaignOutputWorkbench.tsx` renders the new summary using the view-model, not ad hoc raw counts. |
| AC-02 | Existing `ProductionCapability` values are mapped into UI-only readiness buckets without contract changes. | Unit tests for the new view-model. | `outputCoverageViewModel.test.ts` covers mapping for supported, supported-with-source-assets, manual, and unsupported cases. |
| AC-03 | Blocked items call out missing source assets and business-facing next steps. | Unit test plus source review of `CampaignOutputWorkbench.tsx`. | Item cards render readiness labels plus missing-asset detail for `needs_source_asset`. |
| AC-04 | User-visible coverage UI changes are documented and builds remain green. | `npm run build` for frontend/backend, targeted tests, run docs, `PRODUCT.md`, `CHANGELOG.md`. | Verification artifacts show passing builds/tests and changelog updates for the Workbench change. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Campaign plans with mixed item types show direct/template/assistive/blocked coverage correctly. |
| Edge cases | Quantity-weighted bundles (for example banner spec packs) report counts using `item.quantity`, not item row count. |
| Error path | Missing source assets keep `supported_with_source_assets` items in `needs_source_asset` and render missing requirement labels. |
| Regression | Existing Workbench sections, Banner quality controls, and Campaign page wiring remain present. |
| Stress/Stability | Frontend/backend builds still pass without backend schema/API changes. |

## 8) Delivery Artifacts
- Code changes: frontend view-model, Workbench UI, page copy wiring, tests.
- Test evidence: targeted frontend tests, frontend/backend builds, workflow guard checks, and `bash scripts/eval.sh 2026-05-11-campaign-output-coverage-map` if environment allows.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
