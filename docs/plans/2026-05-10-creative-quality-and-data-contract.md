# Creative Quality And Data Contract Foundation

> Date: 2026-05-10
> Run: `2026-05-10-quality-data-contract-foundation`
> Scope: Window A / Run 0 foundation only

## Purpose

This document defines the smallest shared contract for the next GOBS optimization runs. It is intentionally TypeScript-first and deterministic:

- Quality has exactly three states: `usable`, `needs_fix`, `unusable`.
- Core output types are `story_video`, `motion_transfer_video`, `character_showcase_video`, `banner`, and `platform_copy`.
- The minimum graph is `Campaign -> Asset -> Output -> Review -> Package`.
- Review and next-version work uses `parentOutputId`, but Run 0 does not create a revision system.

## Quality States

### `usable`

Use when all of these are true:

- The output matches the campaign brief.
- The core selling point is clear.
- Source assets are correct.
- There is no obvious publish blocker.

### `needs_fix`

Use when the direction is right, but a non-blocking issue needs another pass:

- Opening, ending, pacing, copy strength, composition, character accuracy, motion match, or platform fit needs polish.
- The output should keep its original brief and source-asset context for the next prompt or task.

### `unusable`

Use when the output should not enter a package:

- It does not match the brief.
- The core asset is wrong or missing.
- The selling point is absent.
- It has a blocking publish or claim issue.

This foundation does not score quality, infer video content, call an LLM, or claim automatic diagnosis. The rubric only evaluates explicit human/operator-visible signals passed into the helper.

## Minimum Entity Graph

### Campaign

Required IDs:

- `campaignId`
- `briefId`

Purpose: the business brief and campaign objective that all later objects must trace back to.

### Asset

Required ID:

- `assetId`

Optional relationship:

- `campaignId`

Purpose: approved reusable source material. Run 1 can expand metadata, but should keep `assetId` stable and reference it instead of copying file payloads.

### Output

Required relationships:

- `Output.campaignId`
- `Output.assetIds`

Optional relationship:

- `Output.parentOutputId`

Purpose: a generated or planned creative output such as Banner, story video, character showcase, or platform copy.

### Review

Required relationship:

- `Review.outputId`

Optional relationship:

- `Review.parentOutputId`

Purpose: a human quality record. Run 3 can collect story-video reviews, and Run 4 can use review tags to prepare next-version prompts.

### Package

Required relationships:

- `Package.campaignId`
- `Package.outputIds`

Purpose: the distribution-ready bundle. Banner and copy may enter package context only after they remain traceable to Campaign and Output IDs.

## Fixtures

Run 0 ships three fixture outputs in `creativeContractFixtures`:

- `output_banner_usable`: a Banner that is safe to package.
- `output_story_video_needs_fix`: a story video direction that needs opening/pacing fixes.
- `output_platform_copy_unusable`: a platform-copy output linked to a parent output but blocked by an unsupported claim.

These fixtures are deliberately small and should be copied by later tests when they need known-good IDs.

## Downstream Use

- Run 1 should reuse `AssetContract.assetId` and `CampaignAssetCategory` when adding upload classification and preprocessing fields.
- Run 2 should use `CreativeOutputType = 'banner'` and `CreativeQualityStatus` when adding Banner plan cards and manual marks.
- Run 3 should persist story-video review records against `Review.outputId`.
- Run 4 should create next-version outputs by setting `Output.parentOutputId` and carrying feedback tags forward, without introducing a separate revision entity in the first version.

## Boundaries

- Do not add a score, confidence, publish batch, or version entity in this foundation.
- Do not wire UI into `CampaignOutputWorkbench.tsx` during this run.
- Do not change `campaignOutputPlans.ts` or `campaignDistributionPackages.ts` while the two-window split is active.
- Do not touch protected video or image provider service files.
