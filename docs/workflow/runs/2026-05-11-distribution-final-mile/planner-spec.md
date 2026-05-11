# PlannerSpec - 2026-05-11-distribution-final-mile

## 1) Project Goal
- Business goal: Improve Distribution final-mile publishing flow with restore-ready context, current batch summary navigation, account-group preview/edit, and actionable failure guidance
- User value: Let operators recover the current package/config after refresh, inspect the target account group, and understand what to do after publish failures.
- Success metrics: Active context restore is deterministic, account groups are preview/update capable, latest batch actions stay visible, and failure messages include next-step guidance.

## 2) Scope
### In Scope
- Frontend active-context persistence for `/distribute`.
- Recent publish context reuse without auto-publish.
- Account group member preview and custom-group update from current selection.
- Latest publish batch summary/navigation hardening.
- Failure next-step guidance for page-level and batch-item errors.
- Targeted tests, builds, eval, and release artifacts.

### Out of Scope
- Backend GeeLark publish route changes.
- Provider/service changes or new env vars.
- Real live GeeLark posting.
- Large Distribution page redesign or route deletion.

## 3) Module Breakdown
- Active context persistence:
  - Responsibilities: Save and restore package id, selected asset id, account ids, platform drafts, active draft, and publish options.
  - Dependencies: `distributionRecentContext.ts`, `TabDistribute.tsx`.
- Account group final mile:
  - Responsibilities: Show group member previews and allow custom group membership updates from current selection.
  - Dependencies: `accountGroups.ts`, `AccountGroupPicker.tsx`.
- Failure and batch guidance:
  - Responsibilities: Keep current batch summary visible and pair failure reasons with next actions.
  - Dependencies: `distributePageViewModel.ts`, `DistributeStepPublish.tsx`.

## 4) Technical Approach
- Architecture decisions: Keep this as frontend helper/state hardening; do not change GeeLark backend publish semantics.
- Data flow: selected package/asset/accounts/copy/options -> active-context storage -> restore on `/distribute` load -> explicit operator review -> manual publish.
- API or interface changes: None.
- Migration or compatibility notes: Existing recent-context storage remains valid; active-context storage is additive and browser-local.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Auto-restore publishes unexpectedly | Restore triggers side effects | Accidental posts | Restore only updates local UI state and never calls `publishVideo` | Builder |
| Stale account IDs | Saved account unavailable after refresh | Invalid selection | Filter restored ids against current account permissions | Builder |
| Failure guidance over-promises | Copy suggests provider is fixed | Misleading ops workflow | Guidance says what to check next and preserves raw error | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Active distribution context survives refresh. | Unit tests + source test | Latest active Package/account/copy/options context can be loaded and restored without auto-publish. |
| AC-02 | Recent contexts stay restore-ready. | Existing + extended tests | Recent panel still renders package, asset, platform, account, and option clues. |
| AC-03 | Account groups support preview and edit. | Unit/render tests | Group member preview is available and custom groups can be overwritten from current selection. |
| AC-04 | Latest publish batch remains the current summary. | Source/render tests | Batch panel contains review-current and history actions after submit. |
| AC-05 | Failures show reason plus next step. | Unit/render tests | Page-level and batch-level failures expose next action guidance. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Package + accounts + platform copy + options restore after refresh. |
| Edge cases | Saved account ids not available to current user are ignored. |
| Error path | Auth/provider/generic publish failures produce distinct next-step guidance. |
| Regression | Existing recent contexts, publish history, preflight, and account-group config behavior still pass. |
| Stress/Stability | Malformed local storage is ignored and does not break `/distribute`. |

## 8) Delivery Artifacts
- Code changes: distribution active-context helpers, account group preview/update, batch failure guidance, tests.
- Test evidence: targeted frontend tests, backend/frontend builds, workflow guard, `bash scripts/eval.sh 2026-05-11-distribution-final-mile`.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`.
