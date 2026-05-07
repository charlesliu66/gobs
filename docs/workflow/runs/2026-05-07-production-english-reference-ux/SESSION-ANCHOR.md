# SESSION-ANCHOR - 2026-05-07-production-english-reference-ux

## Run Summary
- Run ID: 2026-05-07-production-english-reference-ux
- Goal: Audit and fix English-mode reference-image pairing UX and nearby storyboard prompt issues in Advanced Production.
- Owner: codex
- Branch or commit context: codex/production-english-reference-ux@1ee752c
- Last updated: 2026-05-07T07:23:00Z

## Acceptance Criteria Snapshot
- AC-01: English-mode multimodal reference cards no longer show Chinese-only/garbled copy for @image mapping, manual matching, missing-image states, and prompt reset controls.
- AC-02: English character/scene names that are matched by partial names or scene context also get @图片n injected into the generated prompt, so the UI no longer reports "not injected" for valid references.
- AC-03: Nearby English storyboard reference chrome no longer leaks raw Chinese fallback tags such as @场景:<sceneRef>.
- AC-04: The fix is covered by focused tests and does not touch backend generation service files or environment variables.

## Editable Files (Builder Ownership)
- h5-video-tool/src/studio/productionAssets.ts
- h5-video-tool/src/studio/steps/StepStoryboardMultimodalRefPanel.tsx
- h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx
- h5-video-tool/src/pages/ProductionWizard.tsx
- h5-video-tool/tests/productionMultimodalRefs.test.ts
- docs/workflow/runs/2026-05-07-production-english-reference-ux/*
- PRODUCT.md

## Read-Only References
- docs/TASK-INDEX.md
- h5-video-tool/src/i18n/LocaleContext.tsx
- h5-video-tool/src/i18n/messages.ts

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- Backend Dreamina/Kling/VEO service behavior.
- New environment variables or API keys.
- Redesigning the whole Advanced Production storyboard page.
- Shipping unrelated local daily-report or skill files.

## Progress Checklist
- [ ] Planner approved
- [ ] Challenger approved
- [ ] Builder self-test recorded
- [ ] Verifier P0/P1 count is zero
- [ ] Release decision written

## Escalation Rules
- Escalate if a change requires touching any AGENTS.md forbidden file.
- Escalate if a new env var is required and `.env.example` is not yet updated.
- Escalate if acceptance criteria need to expand beyond this run scope.
- Escalate before any prod release decision.
