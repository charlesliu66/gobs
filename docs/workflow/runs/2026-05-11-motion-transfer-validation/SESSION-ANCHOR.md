# SESSION-ANCHOR - 2026-05-11-motion-transfer-validation

## Run Summary
- Run ID: 2026-05-11-motion-transfer-validation
- Goal: Validate Motion Transfer with explicit sample records, an experimental/pause/continue decision, and a guarded Studio entry hint
- Owner: codex
- Branch or commit context: codex/2026-05-11-motion-transfer-validation@e90c11e
- Last updated: 2026-05-11T02:16:52Z

## Acceptance Criteria Snapshot
- AC-01: Motion Transfer has 10 explicit validation sample records with action type, character asset class, generated-result assessment, success/failure reason, and ad-usability flag.
- AC-02: Validation conclusion is exactly one of `continue`, `experimental`, or `pause`, with the <30% usable-rate exit rule enforced.
- AC-03: The report names suitable action types, high-risk action types, and the current usable rate.
- AC-04: Studio Motion Transfer entry shows an experimental validation hint and does not present the feature as stable.
- AC-05: Tests cover decision calculation, exit threshold, and Studio entry hint wiring.

## Editable Files (Builder Ownership)
- docs/workflow/runs/2026-05-11-motion-transfer-validation/
- docs/plans/2026-05-10-motion-transfer-validation.md
- h5-video-tool/src/studio/motionTransferValidation.ts
- h5-video-tool/src/studio/motionTransferValidation.test.ts
- h5-video-tool/src/config/studioTemplateOptions.ts
- h5-video-tool/src/components/TemplatePicker.tsx
- h5-video-tool/tests/studioTemplateOptions.test.ts
- PRODUCT.md
- CHANGELOG.md
- docs/TASK-INDEX.md

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-10-gobs-next-optimization-checklist.md
- docs/workflow/runs/2026-05-09-advanced-studio-template-optimization/
- docs/workflow/runs/2026-05-09-campaign-studio-production-bridge/
- h5-video-tool/src/config/studioQualityPresets.ts
- h5-video-tool/src/pages/TabGenerate.tsx
- h5-video-tool/src/components/StepVideo.tsx

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
- Provider changes, real generation retries, prompt/provider tuning, new env vars, and any backend video route/service edits.
- Hiding or deleting Motion Transfer entirely unless validation conclusion becomes `pause`.
- Claiming Motion Transfer is stable, packaging low-quality samples as successes, or promoting it into the default Campaign path.
- Deployment or release-owner actions.

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
