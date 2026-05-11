# SESSION-ANCHOR - 2026-05-11-character-showcase-validation

## Run Summary
- Run ID: 2026-05-11-character-showcase-validation
- Goal: Validate Character Showcase with 10 role-direction samples, a continue/experimental/pause decision, and Studio preset guidance
- Owner: codex
- Branch or commit context: codex/2026-05-11-character-showcase-validation@352e8bb
- Last updated: 2026-05-11T03:03:57Z

## Acceptance Criteria Snapshot
- AC-01: Character Showcase has 10 validation records covering 5 characters x 2 directions: reveal and skill/selling-point showcase.
- AC-02: Validation conclusion is exactly `continue`, `experimental`, or `pause`, with the <3/10 usable-rate exit rule enforced.
- AC-03: Report lists usable rate, recommended template directions, not-recommended template directions, video-vs-Banner fit, and high-risk cases.
- AC-04: Studio Character Showcase entry and preset guidance reflect the validation result without claiming provider-level stability.
- AC-05: Tests cover sample count, decision thresholds, fit classification, entry notice, and preset recommendation metadata.

## Editable Files (Builder Ownership)
- docs/workflow/runs/2026-05-11-character-showcase-validation/
- docs/plans/2026-05-10-character-showcase-validation.md
- h5-video-tool/src/studio/characterShowcaseValidation.ts
- h5-video-tool/src/studio/characterShowcaseValidation.test.ts
- h5-video-tool/src/config/studioTemplateOptions.ts
- h5-video-tool/src/config/studioQualityPresets.ts
- h5-video-tool/tests/studioTemplateOptions.test.ts
- h5-video-tool/tests/studioQualityPresets.test.ts
- PRODUCT.md
- CHANGELOG.md
- docs/TASK-INDEX.md

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-10-gobs-next-optimization-checklist.md
- docs/workflow/runs/2026-05-11-motion-transfer-validation/
- docs/workflow/runs/2026-05-09-advanced-studio-template-optimization/
- h5-video-tool/src/components/TemplatePicker.tsx
- h5-video-tool/src/pages/TabGenerate.tsx

## Additional Forbidden Paths
- h5-video-tool-api/src/services/dreaminaVideo.ts
- h5-video-tool-api/src/services/klingVideo.ts
- h5-video-tool-api/src/services/veoPython.ts
- h5-video-tool-api/src/services/studioPipeline.ts
- h5-video-tool-api/src/types/productionTypes.ts
- h5-video-tool-api/src/config/productionAssets.ts
- h5-video-tool-api/src/routes/
- scripts/deploy_all.py
- scripts/deploy_api.py
- scripts/deploy_frontend.py
- scripts/mark_release_ready.py
- scripts/set_deployment_state.py

## Out of Scope
- Provider changes, real generation retries, backend route changes, prompt backend changes, or new env vars.
- Claiming Character Showcase is universally stable or suitable for multi-character/UI-heavy scenes.
- Introducing new Studio templates beyond preset guidance.
- Deployment before the run is merged to pushed `origin/main` and release guard checks pass.

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
