# SESSION-ANCHOR - 2026-05-11-campaign-banner-prompt-hardening

## Run Summary
- Run ID: 2026-05-11-campaign-banner-prompt-hardening
- Goal: Implement comprehensive optimization Run B3 by hardening Campaign Banner prompt output into a structured template-ready artifact that can be saved and carried into Distribution Package context without adding preview or image publishing.
- Owner: codex
- Branch or commit context: main@1d0c543
- Last updated: 2026-05-11T09:38:29Z

## Acceptance Criteria Snapshot
- AC-01: Campaign Banner items with approved Team/Asset Library source assets generate a structured prompt artifact with sections for objective, formats, source assets, copy lock, composition rules, forbidden claims, and handoff checklist.
- AC-02: Saved Banner prompt outputs carry `bannerPromptContext.readiness = template_ready`, spec ids, source asset ids, asset-fit warnings, copy snapshot, forbidden claims, and knowledge citations when available.
- AC-03: Workbench coverage/readiness summary separates direct text outputs from template-ready Banner prompt outputs; prompt-only Banner must never be counted as `auto_ready` or shown as a final rendered image.
- AC-04: Distribution Package handoff may carry Banner prompt context as non-publishable image context only; no direct publish, no provider/image generation call, and no preview/editor surface is added.
- AC-05: Frontend/API tests and production builds pass; any repo-wide pre-existing lint or unrelated dirty-file risk is documented without staging unrelated files.

## Editable Files (Builder Ownership)
- h5-video-tool/src/components/campaign/bannerPrompt.ts
- h5-video-tool/src/components/campaign/bannerPrompt.test.ts
- h5-video-tool/src/components/campaign/outputCoverageViewModel.ts
- h5-video-tool/src/components/campaign/outputCoverageViewModel.test.ts
- h5-video-tool/src/components/campaign/outputPlan.ts
- h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx
- h5-video-tool/src/components/campaign/BannerOutputCard.tsx
- h5-video-tool/src/components/campaign/distributionPackage.ts
- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/tests/campaignOutputProductionAdapter.test.ts
- h5-video-tool/tests/campaignDistributionPackage.test.ts
- h5-video-tool-api/src/services/campaignOutputPlan.ts
- h5-video-tool-api/tests/campaignOutputPlan.test.ts
- docs/workflow/runs/2026-05-11-campaign-banner-prompt-hardening/*
- docs/TASK-INDEX.md
- PRODUCT.md
- CHANGELOG.md

## Read-Only References
- docs/TASK-INDEX.md
- docs/DOCS-INDEX.md
- C:/Users/User/Downloads/2026-05-11-gobs-comprehensive-optimization-plan.md
- docs/plans/2026-05-11-campaign-production-coverage-v2-adjustment-plan.md

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- No Banner template preview, free canvas, drag layers, editable visual layout, or design-tool replacement.
- No real Banner image generation, provider integration, model call, publishing action, or final image claim.
- No Asset Library database/routes/schema work; Window A only consumes existing asset IDs and requirements.
- No replacement of existing `ProductionCapability` or persisted production item type enums.
- No changes to AGENTS.md forbidden backend low-level generation services.
- No staging/prod deployment from this Dev Worker window.

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
