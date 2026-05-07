# PlannerSpec - 2026-05-07-campaign-advanced-studio-phase1

## 1) Project Goal
- Business goal: Finish the next Advanced Studio demotion slice so marketers stay on the Mission Control path by default and only discover project-level tools inside the professional boundary.
- User value: Operators see fewer tool-first entry points and a clearer “review pending decisions first” flow, while power users still keep access to the same advanced routes.
- Success metrics:
  - `/projects` is grouped under `Advanced Studio`, not `Mission Control`
  - Home emphasizes review/pending-action follow-on over direct professional tooling
  - No route or handler behavior changes are introduced

## 2) Scope
### In Scope
- Move the `/projects` nav item from the primary `Mission Control` nav group into the `Advanced Studio` group.
- Normalize the related nav/home copy so `/projects` reads as an advanced review workspace instead of a campaign-first entry point.
- Strengthen Home’s pending-review CTA hierarchy while keeping `Campaign Creative` as the primary recommended path.
- Add targeted locale regression coverage for the new or revised copy.

### Out of Scope
- Any route change, redirect, or deep-link change for `/projects`, `/studio`, `/studio/production`, or `/campaign-creative`
- Any project storage, editor, or production behavior change
- Any backend/API, knowledge, feedback, or distribution behavior change
- Any new component-test harness beyond the existing lightweight locale regression pattern

## 3) Module Breakdown
- Navigation shell:
  - Responsibilities: Keep the top-level IA marketer-first and move advanced project entry behind `Advanced Studio`.
  - Files: `h5-video-tool/src/components/Layout.tsx`
- Mission Control landing:
  - Responsibilities: Keep the homepage focused on creating campaigns and handling pending review before deeper production work.
  - Files: `h5-video-tool/src/pages/Home.tsx`
- Copy system:
  - Responsibilities: Keep the nav and home strings aligned in both locales.
  - Files: `h5-video-tool/src/i18n/messages.ts`, `h5-video-tool/src/i18n/locale.test.ts`

## 4) Technical Approach
- Architecture decisions:
  - Treat this as an IA/copy slice only. The safest path is to regroup existing nav items and retune CTA hierarchy without touching route or state behavior.
  - Keep `/projects` reachable, but only from `Advanced Studio` surfaces.
- Data flow:
  - No data-flow changes. Home and Layout continue to navigate to existing routes with the same handlers.
- API or interface changes:
  - None.
- Migration or compatibility notes:
  - Existing bookmarks to `/projects` remain valid because the route definition stays untouched in `App.tsx`.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Discoverability regression for existing power users | `/projects` moves to a different nav group | Users accustomed to its old location may need one extra click | Keep `/projects` near the top of the `Advanced Studio` group and keep route behavior unchanged | Builder |
| Label mismatch | Nav label still sounds campaign-first after the move | UI says “primary” in one place and “advanced” in another | Update `layout.projects` and related home copy in the same slice | Builder |
| Scope drift into route changes | Attempting to “clean up” the route map while regrouping nav | Unnecessary risk to existing bookmarks and flows | Keep `App.tsx` read-only and explicitly out of scope | Challenger |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | `/projects` is no longer shown under the primary `Mission Control` group and is shown under `Advanced Studio` instead. | Code review + frontend build + locale assertions | `Layout.tsx` nav groups place `/projects` under the advanced group, and the build passes. |
| AC-02 | Home makes `pending review` the clearer default follow-on action while preserving `Campaign Creative` as the recommended primary path. | Code review + locale assertions + frontend build | Home CTA/copy hierarchy favors `Campaign Creative` and review actions, while advanced entry copy becomes more explicitly optional. |
| AC-03 | Route behavior remains unchanged for `/projects`, `/studio`, `/studio/production`, and `/campaign-creative`. | Code review | No route definitions or handlers are altered; only nav grouping and copy are touched. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Updated locale keys resolve in English and the frontend bundle builds successfully after the nav/home regrouping. |
| Edge cases | Existing advanced-entry labels still resolve correctly after the new copy changes. |
| Error path | Locale fallback still returns Chinese when a key is missing in English. |
| Regression | `campaignCreative.strategy.launchEditor`, `projectListPage.reviewBeforePublish`, and the new home/layout keys still match the intended marketer-first wording. |
| Stress/Stability | `workflow_guard` must treat the slice as in-scope with no unrelated code-path edits. |

## 8) Delivery Artifacts
- Code changes: `Layout.tsx`, `Home.tsx`, `messages.ts`, `locale.test.ts`
- Test evidence: targeted locale test, frontend build, `workflow_guard`, `eval.sh`
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`
