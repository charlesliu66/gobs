# PlannerSpec - 2026-05-09-distribution-center-ops-mvp

## 1) Project Goal
- Business goal: Optimize `/distribute` into a lower-friction operator publish flow MVP while preserving the existing GeeLark publish payload and Campaign Distribution Package backend contract.
- User value: Market/ops users can load a Campaign Package or publish directly with less duplicate input, faster account targeting, clearer copy/account mapping, and better package readiness cues.
- Success metrics:
  - Campaign Package path no longer shows seven editable campaign brief fields, but still exposes inherited context for review and caption generation.
  - Direct publish path can generate copy from a lightweight hint plus asset/prompt/account context.
  - Repeated account selection can be handled by one-click group chips.
  - Publish behavior remains grouped by platform and uses the existing `publishVideo` client/server contract.

## 2) Scope
### In Scope
- Remove duplicate editable campaign brief form from `TabDistribute`.
- Preserve package-derived campaign context as a read-only summary and pass it into caption generation.
- Add a direct-path `captionHint` input for lightweight copy guidance.
- Add account group parsing from permitted GeeLark account `remark` values and custom localStorage groups.
- Add account group quick-select UI scoped to accounts the current user can publish to.
- Replace platform draft tabs with visible platform copy cards that show selected-account counts.
- Enhance Pending Package cards with platform/market, angle, hook, publishability, and next-action status.
- Update i18n copy, product changelog, and run artifacts.

### Out of Scope
- Scheduled publishing, approval workflows, publish calendar, CSV export, A/B tests, and performance/effect data feedback loops.
- Backend DB/storage for account groups.
- GeeLark publish/task service changes.
- Distribution Package backend shape changes.
- Full page state rewrite or route restructuring beyond this MVP.

## 3) Module Breakdown
- `TabDistribute` orchestration:
  - Owns existing state, package loading, caption generation, publish grouping, latest batch tracking, and history loading.
  - Removes the editable campaign brief form and adds a compact caption hint plus package context summary wiring.
- Account group utilities and UI:
  - Parses `group:<name>` markers from permitted account remarks.
  - Stores custom groups in `localStorage` under `gobs:distribute:account-groups`.
  - Filters stale or unauthorized custom group account IDs before selection.
- Platform copy UI:
  - Keeps `platformDrafts` shape unchanged.
  - Renders each platform draft as a card with caption/hashtags editors and selected account count.
  - Keeps `resolveDraftForPlatform` publish fallback semantics unchanged.
- Pending Package panel:
  - Adds richer readiness/readable context while preserving `onUsePackage`, asset actions, and explicit account selection.

## 4) Technical Approach
- Keep this as an MVP UI refactor, not a state-machine rewrite: existing hooks and publish functions remain in `TabDistribute`.
- Add focused presentational/helper modules under `h5-video-tool/src/components/distribute` and `h5-video-tool/src/utils`.
- Treat Campaign Package context as immutable inherited context:
  - `packageToDistributeDraft` should no longer be a form prefill source for seven editable fields.
  - It should continue to expose campaign context and selected platform drafts.
  - Caption generation should receive package objective/CTA/market/tone/forbidden terms from the active package draft.
- For direct path, `captionHint` becomes optional supplemental prompt context. Empty caption and no prompt still blocks generation as today.
- For account groups:
  - Config groups come only from currently permitted `accounts`.
  - Custom groups are saved locally, but every render filters their `accountIds` through the permitted-account set.
  - Clicking a fully selected group toggles it off; otherwise it selects all permitted group accounts.
- Do not touch `h5-video-tool-api/src/routes/geelark.ts`, `h5-video-tool-api/src/services/geelark.ts`, or `config/geelark-accounts.json`.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Package context loss | Removing `formPrefill` fields without replacement | AI copy quality/regulatory context regresses | Build a dedicated context summary and caption-generation adapter from active package draft | Builder |
| Account permission mismatch | localStorage group contains accounts user cannot publish to | Selection confusion or 403 on publish | Filter group IDs against permitted accounts before display/selection | Builder |
| Platform copy mismatch | User changes selected accounts after generating platform drafts | Wrong draft could be used or missing copy unclear | Cards recompute selected account counts and retain default fallback semantics | Builder |
| Refactor regression | Large `TabDistribute` edit breaks latest batch/history/publish flow | Publishing path regresses | Keep core publish functions unchanged and test tsc/build plus targeted code inspection | Builder/Verifier |
| Scope creep | History filters or backend query params enter this MVP | Wider backend risk | Defer publish history filtering to later version | Orchestrator |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Campaign Package path keeps package context as read-only summary while removing duplicate editable campaign fields | Code inspection, TypeScript build | Seven editable campaign fields are gone from UI/state; package context remains visible and feeds caption generation |
| AC-02 | Direct distribute path uses a lightweight caption hint for copy generation | Code inspection, TypeScript build | Direct path shows one optional hint input and passes it as supplemental copy seed |
| AC-03 | Account group quick selection supports config groups and user custom groups scoped to permitted accounts | Code inspection, utility behavior review, TypeScript build | Config `group:` chips appear from remarks; custom groups can be saved/deleted; all IDs are permission-filtered |
| AC-04 | Platform copy cards make copy-to-account-platform mapping visible without changing publish payload semantics | Code inspection, TypeScript build | Each draft platform renders as editable card with selected account count; publish still groups accounts by normalized platform |
| AC-05 | Pending package cards show publishability, target platform/market, angle, hook, and next actions | Code inspection, TypeScript build | Package cards show richer readiness context and preserve asset-library/quick-film actions |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Campaign Package loads, preselects package asset/copy, shows context summary, accounts remain explicit, publish button behavior unchanged. |
| Happy path | Direct `/distribute` selects asset, optional caption hint, generates or edits copy, selects account group, publishes by platform. |
| Edge cases | No package, no accounts, no permitted accounts, stale custom group IDs, accounts with no `group:` remark. |
| Error path | Caption generation with no prompt/copy/hint still shows validation; package needing asset shows next actions. |
| Regression | Existing `publishVideo` request shape, latest batch tracking, history detail loading, and package query loading remain intact. |
| i18n | All new text has Chinese and English message keys. |

## 8) Delivery Artifacts
- Code changes: distribution UI/components/helpers only within session anchor scope.
- Test evidence: frontend `npx tsc --noEmit`, frontend `npm run build`, backend `npx tsc --noEmit`, backend `npm run build`, and `bash scripts/eval.sh 2026-05-09-distribution-center-ops-mvp` when feasible.
- Documents to update: `PRODUCT.md`, `CHANGELOG.md`, run reports, and release decision.
