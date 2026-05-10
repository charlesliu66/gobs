# Banner Output MVP

> Run: `2026-05-10-banner-output-mvp`
> Window: A / Run 2
> Status: Builder implementation in progress.

## Goal

Make Banner/static ads a first-class Campaign Output without adding a full design editor or calling image providers. The first MVP runs the chain: output plan -> Asset Library source selection -> deterministic Banner prompt placeholder -> three-state human mark -> distribution package context.

## Product Scope

- Banner items are part of Campaign Output Plans.
- First supported specs:
  - `square_1_1`
  - `portrait_4_5`
  - `story_9_16`
  - `landscape_16_9`
- Banner source images use Run 1 Asset Library IDs.
- Production creates a prompt placeholder, not a final image.
- Human review uses Run 0 quality states:
  - `usable`
  - `needs_fix`
  - `unusable`
- Distribution package handoff carries the Banner placeholder as image context but marks it as not yet publishable.

## Implementation Notes

- `h5-video-tool/src/components/campaign/outputPlan.ts` owns the Banner spec vocabulary, Banner details, prompt placeholder generation, source asset mapping, and quality marking helper.
- `h5-video-tool/src/components/campaign/BannerOutputCard.tsx` displays specs, selected source assets, short copy, CTA, prompt placeholder, and three quality buttons inside the existing Workbench.
- `h5-video-tool/src/components/campaign/distributionPackage.ts` maps produced Banner placeholders into package context with `assetReadiness.state = generating`.
- `h5-video-tool-api/src/services/campaignOutputPlan.ts` persists the new `banner_prompt` produced output kind plus optional `qualityStatus`, `bannerSpecIds`, and `sourceAssetIds`.

## Non-Goals

- No real Banner image generation.
- No graphic editor, cropper, text placement, layers, or export pipeline.
- No protected provider service changes.
- No campaign output route rewrite.
- No distribution route rewrite.
- No platform publish behavior change.
- No staging/prod deployment from this development window.

## Verification Plan

- Frontend tests:
  - output plan includes Banner specs
  - Run 1 team categories map to Banner source candidates
  - ready Banner item produces a `banner_prompt` placeholder
  - quality marking stores `usable`, `needs_fix`, or `unusable`
  - produced Banner placeholder maps to non-publishable distribution package context
  - Workbench source contains Banner card and quality controls
- Backend tests:
  - campaign output plan service round-trips `banner_prompt`
  - backend rejects invalid quality states
- Build/eval:
  - frontend build
  - backend build
  - workflow guard
  - standard eval

## Downstream Handoff

- Run 4 can use the produced Banner `qualityStatus` and output IDs as feedback inputs.
- A future rendering run can replace the prompt placeholder with a real generated image while preserving the same output/package IDs.
- Release Owner should deploy only after this branch is merged or pulled into the release workflow.
