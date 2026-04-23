# Builder Report: Production Wizard Usability Trim

## Scope

Implemented the full local optimization slice from `docs/plans/2026-04-23-production-wizard-usability-trim.md`:

- Phase 0 run baseline.
- Phase 1 default / advanced tool split.
- Phase 2 shot status list, filters, and previous / next navigation.
- Phase 3 first Production Wizard use of a shared shot user status helper.
- Phase 3 follow-up: shot strip status labels now also read from the shared status helper label keys.
- Phase 4 product governance docs and changelog split baseline.

## AC Mapping

| AC | Implementation |
|---|---|
| Default path is clear | `StepStoryboardWorkspace` now keeps video generation, batch generation, sync, status, and preview in the default path. |
| Advanced tools are tucked away | First-frame generation, quick adjust, AI review, continuous play, A/B compare, and continuity check are behind an “高级工具 / Advanced tools” toggle. |
| “生成分镜图” no longer looks required | Default button is hidden; advanced button is renamed “生成首帧 / Generate first frame”. Image-to-video without a still shows a first-frame hint. |
| Character look tree is not default | `ProductionWizard` no longer auto-selects the first character for the tree; card action opens “编辑形象变体”. |
| Shot states are user-facing | Added `h5-video-tool/src/studio/shotUserStatus.ts` and wired it into generate actions, preview, and shot strip. |
| Status labels use one source of truth | `StepStoryboardShotStrip` now resolves filter and card labels through `getShotUserStatusLabelKey`, keeping UI copy aligned with `productionWizard.status.*`. |
| Shot list supports filtering | `StepStoryboardShotStrip` now filters by all user-facing states and shows counts. |
| Previous / next shot navigation | Added buttons and `[` / `]` shortcuts in `StepStoryboardWorkspace`, disabled at boundaries and ignored during text input. |
| Docs and governance | Added `CHANGELOG.md`, `docs/product/status-model.md`, `docs/product/data-ownership-invariants.md`, and `docs/product/user-journeys.md`; updated `PRODUCT.md`. |

## Files Changed

- `h5-video-tool/src/pages/ProductionWizard.tsx`
- `h5-video-tool/src/studio/shotUserStatus.ts`
- `h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardPreviewPanel.tsx`
- `h5-video-tool/src/studio/steps/StepDesignCharactersPanel.tsx`
- `h5-video-tool/src/components/production/CharacterLookTreeCanvas.tsx`
- `h5-video-tool/src/components/production/CharacterPortraitEditorModal.tsx`
- `h5-video-tool/src/i18n/messages.ts`
- `h5-video-tool/src/i18n/locale.test.ts`
- `h5-video-tool/tests/shotUserStatus.test.ts`
- `PRODUCT.md`
- `CHANGELOG.md`
- `docs/product/*.md`

## Verification Evidence

- `node --test tests\shotUserStatus.test.ts`: 8 tests passed.
- `node --test src\i18n\locale.test.ts`: 9 tests passed.
- `cd h5-video-tool && npm run build`: passed.
- `cd h5-video-tool-api && npx tsc --noEmit`: passed.

## Notes

- No forbidden backend generation service files were modified.
- No `.env` file or secret was modified.
- New component copy follows the existing `uiText(zh, en)` pattern used in these legacy step components; canonical status labels were also added to `messages.ts`.
- Follow-up removed the remaining local status-label switch from `StepStoryboardShotStrip`; the only local label left there is the filter-specific "All" option.
