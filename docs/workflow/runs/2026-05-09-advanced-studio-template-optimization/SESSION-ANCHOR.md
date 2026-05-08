# SESSION-ANCHOR - 2026-05-09-advanced-studio-template-optimization

## Run Summary
- Run ID: 2026-05-09-advanced-studio-template-optimization
- Goal: Implement Phase 1 Advanced Studio template cleanup and baseline optimization from the 2026-05-08 plan.
- Owner: codex
- Branch or commit context: main@6c0c513
- Last updated: 2026-05-09

## Acceptance Criteria Snapshot
- AC-01: Studio template picker shows only three creation entries: Quick Single (`custom`), Motion Transfer (`viral-dance`), and Character Showcase (`boss-showcase`).
- AC-02: `short-drama` and `cat-harem` are removed from template loading, front-end fallback data, and Studio UI; the legacy presets endpoint remains compatibility-safe by returning an empty list.
- AC-03: `cg-trailer` remains on disk for Production Wizard follow-up, but is hidden from `/api/prompt/templates`, TemplatePicker, and Generate pipeline choices.
- AC-04: Quick Single exposes 4/6/8/10s and 9:16/16:9/1:1 choices plus prompt inspirations; Motion Transfer exposes 5/8/10s; Character Showcase supports 9:16 and 16:9 without prompt-polish overwriting user-selected parameters.
- AC-05: No protected video-service files, new providers, new env vars, AI image API, BGM, FFmpeg transition, or prod release are introduced in this run.

## Editable Files (Builder Ownership)
- docs/workflow/runs/2026-05-09-advanced-studio-template-optimization
- docs/TASK-INDEX.md
- PRODUCT.md
- CHANGELOG.md
- h5-video-tool-api/src/config/prompt-templates
- h5-video-tool-api/src/routes/prompt.ts
- h5-video-tool-api/src/services/promptPolish.ts
- h5-video-tool-api/tests
- h5-video-tool/src/api/promptPolish.ts
- h5-video-tool/src/components/TemplatePicker.tsx
- h5-video-tool/src/pages/TabGenerate.tsx
- h5-video-tool/src/context/CreateFlowContext.tsx
- h5-video-tool/src/components/StepVideo.tsx
- h5-video-tool/src/components/ViralDanceMaterialPicker.tsx
- h5-video-tool/src/components/ShortDramaMaterialPicker.tsx
- h5-video-tool/src/config
- h5-video-tool/src/utils/materialPlaceholders.ts
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/tests

## Read-Only References
- docs/TASK-INDEX.md
- /Users/wei.liu/Downloads/2026-05-08-advanced-studio-template-optimization.md

## Additional Forbidden Paths
- h5-video-tool-api/src/services/studioPipeline.ts
- h5-video-tool-api/src/services/dreaminaVideo.ts
- h5-video-tool-api/src/services/klingVideo.ts
- h5-video-tool-api/src/services/veoPython.ts
- h5-video-tool-api/src/types/productionTypes.ts
- h5-video-tool-api/src/config/productionAssets.ts

## Out of Scope
- Phase 2+ items requiring new APIs/assets/providers are documented but not implemented in this run: AI image generation API, BGM asset library, FFmpeg transitions, Runway/MiniMax/Kling upgrades, and prod release.

## Progress Checklist
- [x] Planner approved
- [x] Challenger approved
- [x] Builder self-test recorded
- [x] Verifier P0/P1 count is zero
- [x] Release decision written

## Escalation Rules
- Escalate if a change requires touching any AGENTS.md forbidden file.
- Escalate if a new env var is required and `.env.example` is not yet updated.
- Escalate if acceptance criteria need to expand beyond this run scope.
- Escalate before any prod release decision.
