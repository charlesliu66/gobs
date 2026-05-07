# Builder Report - English I18n Mainline Closeout

Status: `pass (Gate 2)`

## Scope Delivered

- Localized the remaining Editor mainline shell feedback in `h5-video-tool/src/pages/EditorWorkbench.tsx`.
- Localized the remaining ProductionWizard helper panels:
  - `h5-video-tool/src/studio/components/ShotExecutionSegmentsPanel.tsx`
  - `h5-video-tool/src/studio/steps/StepDesignActions.tsx`
  - `h5-video-tool/src/studio/steps/StepDesignHeader.tsx`
  - `h5-video-tool/src/studio/steps/StepExportWorkspace.tsx`
  - `h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`
  - `h5-video-tool/src/studio/steps/StepStoryboardMainHeader.tsx`
  - `h5-video-tool/src/studio/steps/StepStoryboardPreviewPanel.tsx`
  - `h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`
- Extended shared locale keys in `h5-video-tool/src/i18n/messages.ts`.
- Added regression coverage in `h5-video-tool/src/i18n/locale.test.ts`.
- Updated `PRODUCT.md` with a v0.146 release note and mainline-English overview entry.

## AC Mapping

- AC-01
  - Delivered shared locale-key coverage for the targeted design, storyboard, export, and editor surfaces.
  - Removed the remaining mixed-language helper text, status labels, logs, and toasts from the scoped mainline files.
- AC-02
  - Removed scoped `pickUiText(...)` and `uiText(...)` residue from the nine-file cleanup target.
  - Replaced remaining EditorWorkbench hardcoded user-visible Chinese feedback with shared locale messages.
- AC-03
  - Added representative locale lookup/interpolation assertions for the new editor and production-wizard message groups.
- AC-04
  - Local verification is complete.
  - Staging/prod release and smoke remain gated on commit/push plus environment promotion.

## Notable Implementation Notes

- Kept dynamic bilingual progress payloads from `resolveFriendlyVideoProgress(...)` where they already provide trusted `zh/en` pairs.
- Normalized interpolated UI copy through `formatMessage(...)` for counts, durations, queue positions, provider names, and shot labels.
- Fixed two user-visible encoding artifacts discovered during the sweep:
  - `StepDesignActions.tsx` leading bullet marker
  - `StepStoryboardMainHeader.tsx` separator / truncation suffix

## Local Evidence

- `h5-video-tool-api`: `npx tsc --noEmit`
- `h5-video-tool-api`: `npm run build`
- `h5-video-tool`: `node --test src/i18n/locale.test.ts`
- `h5-video-tool`: `npm run build`
- Repo residue scans:
  - `git grep -n "pickUiText(" -- h5-video-tool/src` -> no matches
  - `git grep -n "uiText(" -- <scoped files>` -> no matches

## Remaining Work Before Final GO

- Commit and push the release SHA to `origin/main`.
- Deploy staging and run English-mode smoke.
- Mark release ready, promote prod, rerun smoke, then finalize Gate 5.
