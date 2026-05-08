# Campaign Output Production Adapters Implementation Plan

> Date: 2026-05-08
> Phase: 2A
> Related design: `docs/plans/2026-05-08-campaign-output-production-adapters-design.md`
> Run: `docs/workflow/runs/2026-05-08-campaign-output-production-adapters/`

## Scope

Implement the first safe production adapter for Campaign Output Workbench. The adapter produces deterministic draft copy for supported text-first items and connects produced items to distribution package draft creation.

This plan intentionally does not implement video, image, banner, scheduling, account selection, or real publishing.

## Deterministic Production Rules

| Production item type | Phase 2A behavior | Distribution behavior |
|---|---|---|
| `caption_set` | Produce 3 caption variants from mission, hook, CTA, and audience. | Use the first produced caption as package caption. |
| `headline_set` | Produce 3 headline variants from angle/objective/selected variant. | Use the first produced headline as package headline. |
| `hashtag_set` | Produce a reviewable hashtag set from game, platform, campaign objective, and market terms. | Use produced hashtags in package copy. |
| `fb_post` | Produce `quantity` Facebook post copy drafts when the item is supported or ready. | Use produced post body as package caption and keep review pending. |
| `short_video` / `tiktok_video` / `banner` | Do not produce in Phase 2A. Keep blocked or ready-to-produce status based on source assets, but do not call generation services. | Only produced items with real media assets should become publishable packages. |

## Tasks

### Task 1: Output Model And Adapter TDD

1. Add failing tests in `h5-video-tool/tests/campaignOutputProductionAdapter.test.ts`.
2. Implement optional `producedOutputs` on `ProductionItem`.
3. Implement `produceSupportedCampaignOutputs(...)` in `outputPlan.ts`.
4. Verify supported copy/post items become `produced`, blocked visual/video items remain untouched, and repeated production is idempotent.

### Task 2: Backend Persistence TDD

1. Extend `h5-video-tool-api/tests/campaignOutputPlan.test.ts` with produced-output round-trip and invalid enum cases.
2. Update output-plan validation to preserve optional `producedOutputs`.
3. Verify malformed produced-output kind/status is rejected with 400.

### Task 3: Distribution Adapter TDD

1. Extend `campaignDistributionPackage.test.ts`.
2. Update `buildCampaignDistributionCreateInputFromProductionItem(...)` so produced text outputs populate package copy.
3. Keep account selection and publish confirmation explicit; do not auto-schedule or auto-publish.

### Task 4: Workbench And Campaign Creative Wiring

1. Add produced-output UI section to `CampaignOutputWorkbench`.
2. Wire `handleConfirmOutputProduction` to produce supported items before patching the persisted output plan.
3. Keep “choose from Asset Library”, “Quick Film”, and distribution actions explicit.
4. Add/update presence tests for produced output UI and adapter wiring.

### Task 5: Docs, Verification, Release

1. Update `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`, and `docs/plans/README.md`.
2. Run frontend/backend focused tests.
3. Run backend and frontend builds.
4. Run workflow guard build/verify/release.
5. Push, deploy staging, smoke, mark release ready, deploy prod, smoke, restore idle.

## Verification Commands

```bash
node --import tsx h5-video-tool/tests/campaignOutputProductionAdapter.test.ts
node --import tsx h5-video-tool/tests/campaignDistributionPackage.test.ts
node --import tsx h5-video-tool/tests/campaignOutputWorkbenchPresence.test.ts
node --import tsx h5-video-tool/tests/campaignOutputWorkbenchIntegration.test.ts
node --import tsx h5-video-tool-api/tests/campaignOutputPlan.test.ts
npm -C h5-video-tool-api run build
npm -C h5-video-tool run build
python scripts/workflow_guard.py --run-id 2026-05-08-campaign-output-production-adapters --stage build
python scripts/workflow_guard.py --run-id 2026-05-08-campaign-output-production-adapters --stage verify
```

## Exit Rule

Stop if Builder needs a forbidden generation service file, a new env var, real automatic publishing, scheduling, analytics dashboard work, or broad EditorWorkbench refactor.
