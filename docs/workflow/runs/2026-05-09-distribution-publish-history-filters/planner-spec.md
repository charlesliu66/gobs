# PlannerSpec - 2026-05-09-distribution-publish-history-filters

## 1) Project Goal
- Business goal: Add frontend-only publish history filtering and date grouping to the Distribution Center without changing GeeLark publish APIs.
- User value: Operators can quickly find recent successful, failed, or pending publishes and narrow the list to a platform/campaign clue without paging through an undifferentiated 20-item feed.
- Success metrics: `/distribute` history shows status filter chips, a platform/search filter, date-grouped results, clear filtered-empty copy, and preserved detail/share actions.

## 2) Scope
### In Scope
- Frontend-only status/platform/search filtering for the existing GeeLark task history payload.
- Date grouping for the currently loaded history list.
- Reuse of the existing `DistributePublishHistory` component inside `TabDistribute`.
- Focused tests for history normalization, filtering/grouping helpers, and rendered history behavior.
- Product/task/run documentation updates.

### Out of Scope
- Scheduled publishing, approval workflows, backend GeeLark task API filtering, CSV export, pagination, analytics feedback, and the full TabDistribute step-component split are out of scope.

## 3) Module Breakdown
- History data helpers:
  - Responsibilities: Normalize tolerant GeeLark history payloads, derive platform/search clues, filter by status/platform/query, and group filtered results by date.
  - Dependencies: `h5-video-tool/src/components/distribute/distributeSupport.ts`.
- History UI:
  - Responsibilities: Render filter chips, platform/search input, summary counts, date groups, filtered-empty state, task detail actions, and share links.
  - Dependencies: `h5-video-tool/src/components/distribute/DistributePublishHistory.tsx`, `h5-video-tool/src/i18n/messages.ts`.
- Distribution page wiring:
  - Responsibilities: Replace inline history cards with the reusable component while preserving refresh, detail loading, errors, and task detail panel.
  - Dependencies: `h5-video-tool/src/pages/TabDistribute.tsx`.

## 4) Technical Approach
- Architecture decisions: Keep the run frontend-only and derive filters from the 20 items already returned by `fetchTaskHistory({ size: 20 })`; do not add GeeLark route/service query params in this slice.
- Data flow: GeeLark task history response -> `normalizeTaskHistoryItems` -> UI-local filter state -> filtered/date-grouped list -> existing detail/share actions.
- API or interface changes: Extend the frontend `DistributionTaskHistoryItem` with optional platform clue fields only when the upstream payload provides them. No backend API or publish payload changes.
- Migration or compatibility notes: Existing history payloads without platform clues remain visible under the "All platforms" filter and can still be found by plan/task/status search.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| False platform inference | GeeLark history item has no platform metadata or plan name is ambiguous | Platform filter may hide relevant items if over-inferred | Only use explicit platform-like fields and token clues; keep "All platforms" as default | Builder |
| Existing detail flow regression | Inline history list is replaced by reusable component | Operators cannot inspect task logs | Preserve `onSelectTask`, active task id, loading label, and share link behavior | Builder |
| UI text overflow | Filter chips/search controls crowd the compact history panel | Mobile/desktop history panel becomes hard to scan | Use wrapping controls and small labels; no fixed-width text blocks | Builder |
| Backend scope creep | Adding query params to GeeLark route seems tempting | Requires provider behavior and backend verification | Keep filtering local; backend history filtering remains out of scope | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Publish history can be filtered by status without backend changes. | Helper/render test + source inspection | Status chips filter `all/success/failed/pending` from the existing in-memory list. |
| AC-02 | Publish history can be filtered by platform or plan clue when available. | Helper/render test | Platform filter options are derived from task metadata and search can match plan/task/status/platform clues. |
| AC-03 | Filtered history is grouped by date and keeps task detail/share-link actions. | Render test + TabDistribute wiring | Results show date headers, preserve select/detail callbacks, and still render share links. |
| AC-04 | Empty filtered states and summary copy stay clear in zh/en UI. | Source/render test | Component distinguishes no history from no matching filtered results and `messages.ts` has zh/en labels. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Mixed success/failed/pending history renders summary, filters, date headers, detail button, and share link. |
| Edge cases | Empty history and filtered-empty state show distinct messages; items without platform metadata remain available under all/search. |
| Error path | History load error still displays in `TabDistribute` and does not hide existing task detail panel behavior. |
| Regression | Existing `normalizeTaskHistoryItems`, summary, asset picker, preflight, and distribution package tests still pass. |
| Stress/Stability | Repeated filtering/grouping is deterministic and does not mutate the original history array. |

## 8) Delivery Artifacts
- Code changes: `DistributePublishHistory`, `distributeSupport`, `TabDistribute`, i18n labels, focused tests.
- Test evidence: targeted frontend test, frontend/backend builds or eval, workflow guard build/verify/release.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
