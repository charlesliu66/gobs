# SESSION-ANCHOR - 2026-05-06-english-i18n-surface-sweep

## Run Summary
- Run ID: 2026-05-06-english-i18n-surface-sweep
- Goal: Finish the next English localization sweep for RunningStatus, GlobalJobsPanel, EditorWorkbench, and release it through staging then prod.
- Owner: codex
- Branch or commit context: main@75ea1ba
- Last updated: 2026-05-06T10:37:14Z

## Acceptance Criteria Snapshot
- AC-01: `RunningStatus`, `GlobalJobsPanel`, and the highest-impact `EditorWorkbench` user-facing strings render in English when `uiLocale=en`, without falling back to mixed Chinese status copy.
- AC-02: This run removes the next visible batch of `pickUiText(...)` usage in the targeted files and keeps locale-aware time / status wording on shared helpers or message keys.
- AC-03: Repo scan after implementation leaves no new `toLocaleString('zh-CN'|'zh_CN')` hardcoding in `h5-video-tool/src`, and documents any remaining intentional Chinese-only surfaces outside this run.
- AC-04: Frontend build, targeted i18n tests, staging verification, and prod verification all pass before release closes.

## Editable Files (Builder Ownership)
- h5-video-tool/src/components/RunningStatus.tsx
- h5-video-tool/src/components/GlobalJobsPanel.tsx
- h5-video-tool/src/components/LocalePresetSwitcher.tsx
- h5-video-tool/src/api/auth.ts
- h5-video-tool/src/api/editor.ts
- h5-video-tool/src/context/PlatformMemoryContext.tsx
- h5-video-tool/src/pages/ProjectList.tsx
- h5-video-tool/src/pages/RiskSentimentPage.tsx
- h5-video-tool/src/pages/EditorWorkbench.tsx
- h5-video-tool/src/studio/components/VersionTimeline.tsx
- h5-video-tool/src/studio/steps/StepExportStoryboardOverview.tsx
- h5-video-tool/src/studio/steps/StepStoryboardAbCompare.tsx
- h5-video-tool/src/editor/components/EditorProjectManager.tsx
- h5-video-tool/src/editor/components/ImportGuideModal.tsx
- h5-video-tool/src/editor/components/SyncProductionModal.tsx
- h5-video-tool/src/i18n/LocaleContext.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/src/i18n/locale.ts
- h5-video-tool/src/i18n/locale.test.ts
- h5-video-tool/tests/
- PRODUCT.md
- docs/workflow/runs/2026-05-06-english-i18n-surface-sweep/

## Read-Only References
- docs/TASK-INDEX.md
- docs/i18n-中英文切换设计方案-v2.md
- docs/plans/2026-04-21-i18n-phase0-phase1-implementation-plan.md
- h5-video-tool/src/pages/ProjectList.tsx
- h5-video-tool/src/studio/components/VersionTimeline.tsx
- h5-video-tool/src/studio/steps/StepStoryboardAbCompare.tsx

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- Backend service refactors, route/auth redesign, and any new environment variables
- Reworking `uiLocale/contentLocale` architecture again in this run
- Converting every remaining `pickUiText(...)` caller in the repo; only target the named surfaces plus directly related editor dialogs
- Non-i18n product behavior changes except the minimum needed to keep localized copy accurate

## Progress Checklist
- [x] Planner approved
- [x] Challenger approved
- [ ] Builder self-test recorded
- [ ] Verifier P0/P1 count is zero
- [ ] Release decision written

## Escalation Rules
- Escalate if a change requires touching any AGENTS.md forbidden file.
- Escalate if a new env var is required and `.env.example` is not yet updated.
- Escalate if acceptance criteria need to expand beyond this run scope.
- Escalate before any prod release decision.
