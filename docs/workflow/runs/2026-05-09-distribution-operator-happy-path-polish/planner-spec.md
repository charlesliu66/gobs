# PlannerSpec - 2026-05-09-distribution-operator-happy-path-polish

## 1) Project Goal
- Business goal: Make `/distribute` feel safer for a real operator after the step split: publish outcomes should be reviewable immediately, recent working context should survive refresh, and exceptions should tell the operator what to do next.
- Product goal: Advance the approved `方案 C + 方案 A` path without overreaching into large architecture governance, while safely finishing the already-started publish-history backend compatibility carry-over in the worktree.
- Success metric: A marketer/operator can restore a recent package/config, publish, see the current batch, jump to history, and understand failures without re-entering Campaign/package/account/copy context.

## 2) Scope
### In Scope
- Run 1 happy path polish:
  - Add current-batch next actions after publish.
  - Add a stable publish-history jump anchor.
  - Add a recent package/publish-config panel backed by localStorage with explicit restore.
  - Improve preflight/publish error guidance copy.
  - Add refresh-boundary checks through helpers/tests.
- Run 2 safe reduction prep:
  - Audit `sj-ui` imports/tooling references.
  - Classify `RiskSentiment/TiktokMatrix` and Platform pages as active, parked, hidden, or deletion candidates.
  - Record a deletion/isolation recommendation without deleting routes/code in this run.
- Run 3 small boundary extraction:
  - Extract deterministic recent-context/publish-action helper/component boundaries.
  - Keep `TabDistribute` as the state owner and preserve existing GeeLark publish payloads.
- Carry-over GeeLark history compatibility:
  - Preserve the existing default `/api/geelark/tasks` response shape.
  - Add optional status/platform/search/offset/limit filtering and CSV export for publish history.
  - Wire the existing history component to use server-backed query/paging/export when callbacks are provided.
- Protected real GeeLark verification entry:
  - Add a dry-run-first script for operator-supervised real publish verification.
  - Require explicit account, material, caption, `--live`, and `--confirm REAL_GEELARK_POST` before any real post.
- Tests and docs:
  - Add focused helper/render/source tests.
  - Update run reports, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`, and a legacy-surface audit doc.

### Out of Scope
- No automatic live GeeLark posting during build, eval, staging smoke, or prod smoke.
- No provider service modifications or AGENTS.md forbidden service files.
- No global state library migration.
- No broad `ProductionWizard`, `EditorWorkbench`, or `TabGenerate` refactor.
- No deletion of `sj-ui`, RiskSentiment, TiktokMatrix, or Platform routes during this run.
- No new secrets or hardcoded credentials.

## 3) Module Breakdown
- Distribution recent context:
  - Responsibilities: Persist the latest package/config snapshot, sanitize stale localStorage, restore explicitly on operator action.
  - Dependencies: selected asset, selected accounts, platform drafts, active package id/title, publish options.
- Publish next actions:
  - Responsibilities: Keep latest batch visible, provide a jump to publish history, and preserve task-detail inspection.
  - Dependencies: existing `latestBatch`, `loadTaskHistory`, `fetchTaskDetail`, and `DistributePublishHistory`.
- Error guidance:
  - Responsibilities: Convert raw missing/preflight/provider failures into practical operator hints without masking the original error.
  - Dependencies: i18n messages and current selected asset/account state.
- Legacy-surface audit:
  - Responsibilities: Document current references and recommend the next low-risk isolation/deletion steps.
  - Dependencies: source scan findings for `src/sj-ui`, `App.tsx`, `Layout.tsx`, and relevant page entries.
- GeeLark history compatibility:
  - Responsibilities: Optional backend filtering/paging/CSV while keeping unfiltered default consumers compatible.
  - Dependencies: existing `/api/geelark/tasks`, frontend `fetchTaskHistory`, and `DistributePublishHistory`.

## 4) Technical Approach
- Add localStorage utilities as pure functions so stale/invalid recent context can be tested without rendering the full page.
- Add a small presentational recent-context component rather than pushing more JSX into `TabDistribute`.
- Add callbacks from `TabDistribute` into `DistributeStepPublish` for current-batch/history actions; do not change GeeLark request shape.
- Use stable DOM ids and `scrollIntoView` for navigation; if the browser lacks DOM APIs, no-op.
- Keep the legacy-surface work as documentation and source audit only.
- Keep GeeLark changes route/API-wrapper only; do not edit provider services or trigger live posting.
- Keep the real-post verifier safe by construction: dry-run default, explicit live confirmation token, and no secrets in source.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Recent context restores stale asset/account ids | Browser localStorage outlives available assets or permissions | Operator sees a partially restored config | Filter account ids against current permissions and let asset fallback behavior handle missing assets | Builder |
| Restore feels like hidden automation | Auto-applying old state on page load | Operator publishes wrong package | Require explicit "use again" action; never auto-publish | Builder |
| Error guidance hides provider detail | Replacing raw API error | Debugging becomes harder | Render raw error plus a separate guidance line | Builder |
| Publish-history jump races with history refresh | `loadTaskHistory` is still running | History appears empty momentarily | Trigger refresh and scroll; preserve existing loading state | Builder |
| Legacy deletion too early | Removing parked code without external-use certainty | Route or iframe regressions | Audit only; deletion requires a follow-up run | Builder |
| Backend history compatibility drift | Optional query changes replace default response shape | Existing history UI breaks | Preserve default `items` and `history`, add optional `page/filters`, and test default plus advanced query paths | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Publish completion exposes current-batch summary and history jump. | Render/source tests + manual source review | Latest batch panel has next actions; history section has a stable anchor; publish calls preserve history refresh. |
| AC-02 | Recent package/config can be restored after refresh. | Pure helper tests + source review | Recent contexts are saved, deduped, capped, sanitized, and restored only on explicit action. |
| AC-03 | Errors include actionable guidance. | Render/source tests | Missing asset/account and generic/provider failures show guidance alongside raw errors. |
| AC-04 | Legacy surfaces are audited, not deleted. | Doc review + source scan evidence | Audit document identifies `sj-ui`, RiskSentiment/TiktokMatrix, and Platform next steps. |
| AC-05 | TabDistribute boundary extraction stays low-risk. | Source review + build | New helpers/components reduce inline orchestration without moving publish ownership or adding global state. |
| AC-06 | GeeLark history query/export carry-over remains compatible. | API/helper tests + frontend source tests | Default history response still works; optional query/page/export is available without provider-service edits. |
| AC-07 | Workflow gates and builds are clean. | `workflow_guard`, tests, frontend/backend build, `eval.sh` | P0/P1 verifier issues are zero or blockers are explicitly recorded. |
| AC-08 | A protected real GeeLark publish verifier exists. | Python compile + backend guard test | Dry-run does not post; live mode refuses without `REAL_GEELARK_POST` confirmation. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Recent context helpers | Load empty/malformed storage, save/dedupe/cap contexts, build from representative asset/account/draft state. |
| Recent context UI | Render package, asset, account count, options, and restore CTA. |
| Publish next actions | Latest batch panel renders history/current-batch actions and preserves refresh/close behavior. |
| Error guidance | Missing asset/account and generic errors render separate guidance text. |
| Source regression | `TabDistribute` still composes asset/copy/accounts/publish steps and retains existing publish/history calls. |
| History backend carry-over | Default `buildTaskHistoryResponse`, status/platform/search/page filters, CSV allowlist/export, frontend query builder. |
| Real verifier | Dry-run payload preview and live mode blocked without explicit confirmation. |
| Legacy audit | Source-scan evidence recorded for `sj-ui`, RiskSentiment/TiktokMatrix, and Platform surfaces. |
| Regression | Existing distribution tests, frontend/backend builds, workflow guard, eval. |

## 8) Delivery Artifacts
- Code changes: recent context utility, recent context panel, publish next-action wiring, error guidance copy, compatible history query/page/export carry-over, and guarded real GeeLark verifier.
- Test evidence: focused Node tests plus frontend/backend builds and workflow eval.
- Documents: run artifacts, legacy-surface audit doc, `PRODUCT.md`, `CHANGELOG.md`, and `docs/TASK-INDEX.md`.
