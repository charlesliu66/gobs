# Builder Report - Advanced Studio Prompt Reference UX

## Implemented

- Added `promptReferenceTokens` helpers for media-kind token numbering, cursor insertion, duplicate prevention, and reference usage detection.
- Extended `UnifiedAssetSelector` with `token`, `status`, `error`, reading overlay, file/source status text, and Insert to Prompt action.
- Reworked `TabGenerate` to compute stable slot tokens, sort Dreamina multimodal items by slot order, pass reference asset context into one-click Prompt, collapse Quick Inspirations, remove visible Veo tips and quality preset controls, and show a Prompt reference preview strip.
- Extended frontend `polishPrompt` and backend `/api/prompt/polish` with `mode` and `referenceAssets`.
- Added backend optimizer guidance and deterministic reference-token normalization so generated prompts do not invent unavailable `@图片n` / `@视频n` / `@音频n` tokens.
- Updated `PRODUCT.md` and `CHANGELOG.md` to v0.205.

## Files

- `h5-video-tool/src/components/UnifiedAssetSelector.tsx`
- `h5-video-tool/src/pages/TabGenerate.tsx`
- `h5-video-tool/src/utils/promptReferenceTokens.ts`
- `h5-video-tool/src/api/promptPolish.ts`
- `h5-video-tool/src/i18n/messages.ts`
- `h5-video-tool-api/src/routes/prompt.ts`
- `h5-video-tool-api/src/services/promptPolish.ts`
- Frontend/backend tests and product docs.

## Notes

- Local uploads remain one-off for the current generation and are not imported into Asset Library.
- Runtime provider services in the forbidden list were not modified.
