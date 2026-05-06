# BuilderReport - 2026-05-06-english-i18n-surface-sweep

## 1) Inputs
- Spec file: `docs/workflow/runs/2026-05-06-english-i18n-surface-sweep/planner-spec.md`
- Spec version/date: 2026-05-06T10:37:14Z
- Acceptance criteria covered: AC-01, AC-02, AC-03

## 2) Implemented
| AC ID | What was implemented | Files changed | Notes |
|---|---|---|---|
| AC-01 | Localized `RunningStatus` and `GlobalJobsPanel` onto shared message keys / helpers, including relative time and job-count wording | `h5-video-tool/src/components/RunningStatus.tsx`, `h5-video-tool/src/components/GlobalJobsPanel.tsx`, `h5-video-tool/src/i18n/messages.ts`, `h5-video-tool/src/i18n/locale.ts`, `h5-video-tool/src/i18n/locale.test.ts` | Fixed the English `1 jobs` bug and removed page-local relative-time logic. |
| AC-02 | Localized the highest-traffic `EditorWorkbench` shell and directly related editor dialogs | `h5-video-tool/src/pages/EditorWorkbench.tsx`, `h5-video-tool/src/editor/components/EditorProjectManager.tsx`, `h5-video-tool/src/editor/components/ImportGuideModal.tsx`, `h5-video-tool/src/editor/components/SyncProductionModal.tsx`, `h5-video-tool/src/i18n/messages.ts` | Project naming, cleanup toasts, preview shell, top-bar controls, onboarding, sync entry, and modal copy now follow shared locale keys. |
| AC-03 | Carried forward the earlier locale preset/error/timestamp cleanup and audited remaining visible i18n residue | `h5-video-tool/src/api/auth.ts`, `h5-video-tool/src/api/editor.ts`, `h5-video-tool/src/components/LocalePresetSwitcher.tsx`, `h5-video-tool/src/context/PlatformMemoryContext.tsx`, `h5-video-tool/src/pages/ProjectList.tsx`, `h5-video-tool/src/pages/RiskSentimentPage.tsx`, `h5-video-tool/src/studio/components/VersionTimeline.tsx`, `h5-video-tool/src/studio/steps/StepExportStoryboardOverview.tsx`, `h5-video-tool/src/studio/steps/StepStoryboardAbCompare.tsx` | Repo scan shows no remaining direct `toLocale*('zh-CN')` hardcoding in `h5-video-tool/src`. |

## 3) Not Implemented
| AC ID | Reason | Impact | Proposed next step |
|---|---|---|---|
| AC-04 | Release flow is pending commit/push and environment deployment | No staging/prod evidence yet in this report | Complete staging -> prod release and update release artifacts with smoke evidence |

## 4) Self-Test Results
| Test type | Command/Method | Result | Evidence |
|---|---|---|---|
| i18n unit | `node --test src/i18n/locale.test.ts` | PASS | English key coverage plus interpolation and relative-time assertions passed |
| Frontend type/build | `npm run build` | PASS | Vite production build succeeded; only the known dynamic/static import warning remained |
| Backend typecheck | `npx tsc --noEmit` | PASS | Backend TypeScript check succeeded in `h5-video-tool-api` |
| Release preflight | `powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-release-guard/scripts/release_guard.ps1 -Mode preflight -RunId 2026-05-06-english-i18n-surface-sweep -Target staging` | BLOCKED (expected pre-commit) | Only blockers were uncommitted scoped files plus missing release artifacts before this report was added |

## 5) Known Risks and Uncertainties
- Risk:
  - Why it remains: `pickUiText(...)` residue is still concentrated in `AgentPanel`, `AgentMemoryPanel`, and the remaining `ProductionWizard` / `Studio` surfaces outside this run.
  - Possible impact: English UI still has mixed-language pockets outside the targeted shell/dialog batch.
  - Suggested follow-up: Run the next sweep on `AgentPanel` + `AgentMemoryPanel`, then the remaining `ProductionWizard` step stack.

## 6) Scope Compliance Statement
- I did not expand scope beyond the approved PlannerSpec: Yes
- If No, list deviations and reasons: None

## 7) Change Summary
- What changed: Shared i18n keys/helpers now cover the next visible progress and editor-shell surfaces, while the previously prepared locale preset/error/timestamp work stays bundled into the same release.
- Why changed: English-speaking operators were still hitting Chinese copy in queue status, editor shell flows, and project-governance dialogs.
- What did not change: Deep editor working panels (`AgentPanel`, `AgentMemoryPanel`, `BgmMixPanel`, timeline internals) and the remaining `ProductionWizard` / `Studio` stacks stayed out of scope for this run.
