# SESSION-ANCHOR - 2026-05-15-advanced-studio-video-generation-ux

## Run Summary
- Run ID: 2026-05-15-advanced-studio-video-generation-ux
- Goal: Unify Advanced Studio Seedance reference asset intake and duration limits across quick single, motion transfer, and character showcase modes.
- Owner: codex
- Branch or commit context: codex/2026-05-15-advanced-studio-video-generation-ux@8a9de8b
- Last updated: 2026-05-15T07:24:00Z

## Acceptance Criteria Snapshot
- AC-01: Seedance duration options are capped at 15 seconds for all three Advanced Studio modes.
- AC-02: All three modes use UnifiedAssetSelector slots that support local upload and asset-library selection.
- AC-03: Seedance reference constraints reject unsupported formats, excessive counts, and audio-only generation.
- AC-04: Legacy Drive sourcing is folded under a collapsed 更多素材来源 section.
- AC-05: Ark Seedance backend clamps duration into the 4-15 second range.

## Editable Files (Builder Ownership)
- h5-video-tool/src/config/studioTemplateOptions.ts
- h5-video-tool/src/config/seedanceSourceConstraints.ts
- h5-video-tool/src/components/UnifiedAssetSelector.tsx
- h5-video-tool/src/components/DreaminaMultimodalRefs.tsx
- h5-video-tool/src/components/StepVideo.tsx
- h5-video-tool/src/pages/TabGenerate.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/tests
- h5-video-tool-api/src/services/arkSeedanceVideo.ts
- h5-video-tool-api/tests/arkSeedanceVideo.test.ts
- PRODUCT.md
- CHANGELOG.md

## Read-Only References
- docs/TASK-INDEX.md
- .claude/memory/feedback.md

## Additional Forbidden Paths
- h5-video-tool-api/src/services/dreaminaVideo.ts
- h5-video-tool-api/src/services/klingVideo.ts
- h5-video-tool-api/src/services/veoPython.ts
- h5-video-tool-api/src/services/studioPipeline.ts
- h5-video-tool-api/src/types/productionTypes.ts
- h5-video-tool-api/src/config/productionAssets.ts

## Out of Scope
- Do not add new model/provider capability.
- Do not deploy from this Dev Worker window.

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
