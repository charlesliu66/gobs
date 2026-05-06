# PlannerSpec - 2026-05-06-english-i18n-mainline-closeout

## 1) Project Goal
- Business goal: Finish the last high-traffic English-localization cleanup for the current Editor + ProductionWizard mainline and validate the English path through staging and prod.
- User value: English-speaking users can move through advanced production, storyboard execution, export handoff, and editor-agent collaboration without visible Chinese copy appearing in status panels, helper text, logs, or toasts.
- Success metrics: the scoped files stop using `pickUiText(...)`, the English smoke path shows consistent localized UI feedback, and the released SHA passes build/tests plus staging/prod smoke.

## 2) Scope
### In Scope
- `EditorWorkbench` localization cleanup for the remaining user-visible logs, toasts, default inserted text, clip-summary text, and handoff/status messages.
- ProductionWizard localization cleanup for:
  - `ShotExecutionSegmentsPanel`
  - `StepDesignActions`
  - `StepDesignHeader`
  - `StepExportWorkspace`
  - `StepStoryboardGenerateActions`
  - `StepStoryboardMainHeader`
  - `StepStoryboardPreviewPanel`
  - `StepStoryboardShotStrip`
- Shared locale-key additions and targeted locale tests needed to support the above.
- Repo scan for `pickUiText(` residue inside `h5-video-tool/src` after the cleanup, plus release/run artifacts and English smoke notes.

### Out of Scope
- Backend API or provider-service changes
- New environment variables
- Whole-repo migration of every inline `uiLocale === 'en' ? ... : ...` helper outside the scoped files
- New product workflows unrelated to localization correctness

## 3) Module Breakdown
- Editor shell residue:
  - Responsibilities: Remove the remaining `pickUiText(...)` usage plus hardcoded Chinese logs/toasts/default strings from `EditorWorkbench`.
  - Dependencies: `useLocale`, `messages.ts`, `formatMessage`, editor agent APIs, timeline helpers.
- ProductionWizard residue:
  - Responsibilities: Move the remaining storyboard/design/export shell copy in the scoped panels onto shared locale keys or locale-aware formatting.
  - Dependencies: `useLocale`, `messages.ts`, `formatMessage`, `storyboardQueueState`, `RunningStatus`, export helpers.
- Verification and release:
  - Responsibilities: Run locale scan/tests/builds, update changelog/run docs, deploy staging, smoke English mode, then promote prod and verify.
  - Dependencies: frontend build, locale tests, repo scan, deploy scripts, `/api/system/version`.

## 4) Technical Approach
- Architecture decisions:
  - Prefer `messages.ts + t(...) + formatMessage(...)` for static and interpolated strings in the scoped files.
  - Reuse existing bilingual helper payloads from `resolveFriendlyVideoProgress(...)` only for dynamic status text already produced as `zh/en` pairs.
  - Normalize similar copy across editor logs/toasts where possible instead of keeping near-duplicate inline strings.
- Data flow:
  - Shared locale keys live under `editorWorkbench.*` and `productionWizard.*`.
  - Components consume `useLocale()` and interpolate through `formatMessage(...)` when counts, durations, names, or dimensions are involved.
  - Repo scans for `pickUiText(` and localized smoke findings feed verifier/release artifacts.
- API or interface changes:
  - No backend contract changes.
  - Frontend-only locale keys and tests.
- Migration or compatibility notes:
  - Chinese behavior should remain unchanged.
  - Dynamic agent replies still follow the user/request locale pipeline already in place; this run only removes shell-level mixed-language residue around them.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Editor residue is deeper than the original nine-file grep | `EditorWorkbench` contains hardcoded Chinese logs beyond `pickUiText` | English smoke still shows mixed copy | Scan for Chinese literals in the scoped files before/after the patch and fold those strings into shared keys too | Builder |
| Message-key sprawl | Many small keys are added quickly across one run | Missing keys or inconsistent naming | Group new keys by component area and extend locale tests with representative assertions | Builder |
| Release confidence gap | Local tests pass but English path still mixes in staging/prod | User-facing regression after deployment | Do explicit English-mode smoke on both staging and prod and capture the exact SHA served | Integrator |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | The scoped Editor + ProductionWizard files render English-mode copy without visible Chinese residue in their targeted UI paths | Local code scan, targeted smoke, and manual inspection | English operators can use the targeted storyboard/editor surfaces without seeing mixed Chinese helper text, logs, or action labels |
| AC-02 | The scoped files stop using `pickUiText(...)` and `EditorWorkbench` no longer has hardcoded Chinese user-facing strings in the targeted paths | Repo grep and file scan | `git grep "pickUiText(" -- h5-video-tool/src` returns no scoped residue; user-facing hardcoded Chinese strings in these files are removed or localized |
| AC-03 | Shared locale keys and tests cover the new copy | `node --test src/i18n/locale.test.ts` plus message-key assertions | Representative new keys for editor logs and production panels resolve in English and Chinese |
| AC-04 | Release follows `staging -> verify -> mark_release_ready -> prod -> verify -> idle` | Build/test/deploy logs and `/api/system/version` checks | Staging and prod both serve the intended SHA and the English mainline smoke path behaves correctly |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | English mode through ProductionWizard design -> storyboard -> export -> Editor handoff shows localized headers, helper text, action buttons, logs, and toasts. |
| Edge cases | Dynamic counts/durations/queue positions interpolate correctly in both languages. |
| Error path | Agent intent/chat failures, asset-duration probe fallbacks, and storyboard queue reminders still show safe localized messages. |
| Regression | Chinese mode remains unchanged, prior i18n keys still resolve, and editor/production builds still pass. |
| Stress/Stability | Repo scan confirms the scoped `pickUiText` residue is gone and staging/prod both serve the released SHA. |

## 8) Delivery Artifacts
- Code changes: scoped frontend components/pages, shared locale messages, locale tests, `PRODUCT.md`, and run docs.
- Test evidence: locale test run, frontend build, repo residue scans, staging smoke, prod smoke.
- Documents to update: run artifacts and `PRODUCT.md`.
