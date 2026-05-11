# Editor Effects Sprint Plan

> Date: 2026-05-11
> Run: `2026-05-11-editor-effects-sprint`
> Source checklist: `docs/plans/2026-05-10-gobs-next-optimization-checklist.md` Run 12

## Goal

Add a small, tested set of editor packaging templates for game-ad finishing without changing the render or export engines.

## Scope

- Template catalog for common packaging needs:
  - safe-frame / product frame
  - gameplay flash transition
  - character entry
  - battle cut-in
  - reward CTA
  - end-card CTA
- Deterministic helper that turns a template into existing `TextClip` records.
- Optional transition recommendation using the existing `crossfade` flag.
- Compact editor workbench application menu.
- Targeted tests for category coverage, preset compatibility, and timing clamps.

## Non-goals

- No AE compatibility.
- No FFmpeg/export-service edits.
- No video provider or backend route changes.
- No new persistent model.
- No broad editor redesign.

## Verification

- `cd h5-video-tool && npx tsx --test tests/editorEffectTemplates.test.ts`
- `cd h5-video-tool-api && npm run build`
- `cd h5-video-tool && npm run build`
- `bash scripts/eval.sh 2026-05-11-editor-effects-sprint`

## Release Notes

This is a frontend-only editor improvement. Templates persist as normal text clips plus existing transition fields, so older projects and export behavior remain compatible.
