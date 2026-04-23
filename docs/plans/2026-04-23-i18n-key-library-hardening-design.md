# GOBS I18n Key Library Hardening Design

## Goal

Turn the current English localization from a shell-level feature into a maintainable frontend system by:
- stabilizing the locale foundation,
- expanding the centralized key library,
- and replacing high-visibility hardcoded Chinese in the first batch of downstream pages.

## Current Problems

The current i18n work has already landed useful pieces:
- login and app shell locale switching,
- locale headers on API requests,
- partial English surfaces for QuickFilm, Distribution, Asset Library, Editor, and Production.

But the platform is still not consistently localizable because:
- the centralized key dictionary only covers a small subset of pages,
- many pages still inline Chinese strings or use ad hoc `pickUiText(uiLocale, zh, en)` branches,
- some pages are not localized at all,
- several time and status displays still hardcode `zh-CN`,
- locale tests and implementation are no longer fully aligned.

## Scope For This Batch

This batch focuses on the first hardening slice:

1. Locale foundation
- align locale helpers with current two-option language UX,
- keep `uiLocale` / `contentLocale` headers intact,
- add shared locale-aware formatting helpers.

2. Central key library expansion
- extend `messages.ts` beyond shell-only coverage,
- add namespaces for:
  - `gallery`
  - `history`
  - `batchJobs`
  - `errors`

3. First-priority surface replacement
- localize:
  - `Gallery.tsx`
  - `GalleryView.tsx`
  - `History.tsx`
  - `BatchJobsBoard.tsx`
- replace hardcoded Chinese status, empty states, CTA copy, and time formatting in those surfaces.

## Explicit Non-Goals

This batch does not attempt to fully localize:
- `TabGenerate.tsx`
- `ProductionWizard.tsx`
- `EditorWorkbench.tsx`
- `RiskSentimentPage.tsx`
- `Platform*` pages

Those remain the next phase because they contain the heaviest residual inline copy and deserve their own key-library expansion batch.

## Design Decisions

### 1. Keep the current locale transport contract

We keep:
- `X-UI-Locale`
- `X-Content-Locale`

The user-facing language switch stays as two options only:
- `简体中文`
- `English`

### 2. Prefer centralized keys over page-local bilingual branches

For new and migrated surfaces, use `t('namespace.key')` as the primary path.

`pickUiText` remains temporary compatibility glue for already-partially-localized large pages, but this batch will not extend that pattern further for the newly touched gallery/history surfaces.

### 3. Centralize time formatting

Any direct `toLocaleString('zh-CN')` usage in touched surfaces should move to locale-aware format helpers so English mode no longer leaks Chinese timestamps.

### 4. Stabilize tests before expanding usage

The locale test suite must reflect current runtime behavior before we use it as the guardrail for wider rollout.

## Expected Outcome

After this batch:
- gallery/history-facing English mode will be much more complete,
- batch progress/status text will no longer leak Chinese by default,
- the locale helper layer will be consistent with current two-language UX,
- and the codebase will have a clearer path for the next wave of namespace expansion.
