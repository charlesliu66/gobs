# PlannerSpec - 2026-05-06-english-i18n-surface-sweep

## 1) Project Goal
- Business goal: Finish the next English localization sweep for `RunningStatus`, `GlobalJobsPanel`, and `EditorWorkbench`, then ship the verified build through staging and prod.
- User value: English-speaking operators can follow progress, queue state, and editor workflows without mixed-language status copy.
- Success metrics: targeted surfaces render English UI copy consistently, no new hardcoded `zh-CN` time formatting remains in `h5-video-tool/src`, and staging/prod smoke verification passes.

## 2) Scope
### In Scope
- `RunningStatus` English i18n cleanup, including fallback status wording and theater-mode gating.
- `GlobalJobsPanel` English i18n cleanup, including queue stats, recent results, source labels, and relative time strings.
- Shipping the already-implemented first-batch i18n foundation changes together with this run, including locale presets, editor API fallback localization, project list/export overview/version timeline/A-B compare cleanup, and locale-aware timestamp helpers.
- High-impact `EditorWorkbench` top-bar / onboarding / project-governance / import-guide copy cleanup, plus any directly related editor modal components that must change to avoid mixed-language English UI.
- Shared i18n message keys, locale helpers, and lightweight tests needed to support the above.
- Repo-wide audit for additional visible English i18n gaps, with small follow-up fixes only if they are adjacent and low-risk.
- Run artifacts, verification evidence, release notes, staging/prod deployment, and post-release state reset.

### Out of Scope
- Backend route/service changes
- New environment variables or auth model changes
- Whole-repo conversion of every `pickUiText(...)` call site
- Product redesign unrelated to localization correctness

## 3) Module Breakdown
- Progress surfaces:
  - Responsibilities: Localize queue/progress wording in `RunningStatus` and `GlobalJobsPanel`, keep relative-time and source labels locale-aware, remove direct `pickUiText(...)` branching where practical.
  - Dependencies: `useLocale`, `messages.ts`, `locale.ts`, `useGlobalJobs`, `storyboardQueueState`.
- Locale foundation:
  - Responsibilities: Carry forward the already-prepared locale preset / helper / API fallback work that this release depends on, and keep it under the same run for deploy/verification.
  - Dependencies: `auth.ts`, `editor.ts`, `LocalePresetSwitcher.tsx`, `LocaleContext.tsx`, `locale.ts`, `locale.test.ts`, `messages.ts`, prior i18n-touched production pages/components.
- Editor workbench surfaces:
  - Responsibilities: Localize high-traffic `EditorWorkbench` UI copy and directly related modal flows that English users hit first.
  - Dependencies: `EditorWorkbench.tsx`, direct editor modal components, shared locale/message utilities.
- Verification and release:
  - Responsibilities: Guard scope, run tests/builds, update PRODUCT/run artifacts, deploy staging then prod, and verify each environment.
  - Dependencies: `scripts/workflow_guard.py`, `scripts/eval.sh`, deploy scripts, release guard, smoke-test skill.

## 4) Technical Approach
- Architecture decisions:
  - Prefer shared `messages.ts + t(...) + formatMessage(...)` for new/updated UI strings instead of expanding `pickUiText(...)`.
  - Keep locale-aware time wording on `locale.ts` helpers such as `formatRelativeTime` / `formatDateTime` instead of page-local `toLocale*` calls.
  - Limit Editor workbench cleanup to the most visible shell and modal surfaces in this run; do not refactor deep editing logic unless needed for string wiring.
- Data flow:
  - `SESSION-ANCHOR.md` is the source of truth for editable scope.
  - Builder changes only the files listed in the anchor; workflow guard checks those paths before build/release.
  - UI components consume `useLocale()` -> `t(path)` -> `messages.ts`, while dynamic copy interpolates through `formatMessage(...)`.
- API or interface changes:
  - No backend API contract changes are expected.
  - Frontend-only string-key additions and locale helper reuse are allowed.
- Migration or compatibility notes:
  - Existing `pickUiText(...)` callers outside scope remain untouched.
  - English mode should become more consistent without changing Chinese UI behavior.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Dirty worktree | Unrelated local edits already exist on `main` | Accidental staging/deploy of unrelated work | Stage only scoped files, inspect `git status`, and stop before commit if unrelated release content cannot be isolated | Integrator |
| Partial English cleanup | `EditorWorkbench` has many inline strings and nested dialogs | English UI still feels mixed after this batch | Prioritize top-bar/onboarding/project dialogs first, then run repo scan for remaining adjacent gaps | Builder |
| Message-key drift | Multiple files need new locale keys quickly | Missing keys or fallback-to-Chinese regressions | Add/extend locale tests and run build after integration | Builder |
| Release drift | Staging validated on one tree but prod picks up extra local edits | Mismatch between verified SHA and deployed bundle | Keep release flow on a pushed commit only, follow staging -> mark ready -> prod sequence | Integrator |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | `RunningStatus` and `GlobalJobsPanel` show English status/progress wording when `uiLocale=en` | Targeted component tests or helper tests, plus manual English-mode inspection on staging | No mixed Chinese status copy remains on these surfaces during normal English usage |
| AC-02 | `EditorWorkbench` shell and directly related dialogs no longer surface obvious Chinese copy in English mode | Static render or build-backed assertions for new keys, plus manual inspection | English operator can navigate project naming/import/onboarding/high-traffic shell controls without mixed-language blockers |
| AC-03 | Targeted repo scan documents remaining visible English i18n gaps and applies adjacent low-risk fixes | Search for `pickUiText(` and hardcoded locale formatting, summarize residue in verifier/release docs | No new direct `zh-CN` formatting exists in `h5-video-tool/src`; remaining residue is explicitly listed |
| AC-04 | Release follows `staging -> verify -> mark_release_ready -> prod -> verify -> idle` | Deployment logs + smoke verification evidence | Staging and prod both run the intended commit and key English surfaces behave correctly |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | English mode renders `RunningStatus`, `GlobalJobsPanel`, and the targeted `EditorWorkbench` controls with localized copy. |
| Edge cases | Relative time stays localized across just-now / minutes / hours / days transitions; Chinese mode remains unchanged. |
| Error path | Missing-key or fallback-error paths still render safe shared copy rather than raw `undefined` / mixed-language fragments. |
| Regression | Existing locale preset behavior, upload/editor error localization, and prior i18n helpers still pass tests/build. |
| Stress/Stability | Workflow guard tolerates unrelated dirty docs, while release flow still stages/deploys only the intended pushed commit. |

## 8) Delivery Artifacts
- Code changes: targeted frontend UI files, shared i18n files, targeted tests, run docs, `PRODUCT.md`.
- Test evidence: targeted node tests, frontend build, backend `tsc --noEmit`, workflow guard output, staging/prod smoke notes.
- Documents to update: run artifacts, `PRODUCT.md`, and release decision/verifier artifacts for this run.
