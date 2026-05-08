# Campaign Output Production Adapters Design

> Date: 2026-05-08
> Status: Approved Phase 2A direction
> Builds on: `2026-05-08-campaign-output-workbench-game-source-assets`

## Product Decision

Phase 2A should make the Output Workbench produce the items GOBS can safely make now, without exposing internal reasoning and without touching low-level video or image generation services.

The user-facing promise is:

```text
Confirm output plan
-> GOBS drafts supported copy/post assets
-> unsupported or source-blocked assets stay explicit
-> produced items can be saved as pending distribution packages
-> account selection and final publish remain explicit
```

This keeps the product in stage B while pointing toward stage C. GOBS starts doing useful work after confirmation, but it still pauses for missing game source assets, visual/video production, account selection, and publish approval.

## Supported Production Scope

Phase 2A supports deterministic draft production for text-first deliverables:

- `caption_set`
- `headline_set`
- `hashtag_set`
- `fb_post`

These drafts are generated from the confirmed brief, selected strategy, selected variant, CTA, audience, routed knowledge context, and existing output item content brief. They are not analytics-driven and do not claim performance prediction.

Video and visual deliverables are intentionally not generated in this phase:

- `short_video`
- `tiktok_video`
- `banner`

If their required source assets are missing, only those items remain blocked. If their source assets are available, they may become ready to produce, but Phase 2A does not call the low-level video/image services.

## Data Shape Extension

`ProductionItem` gains an optional `producedOutputs` field. Each produced text draft is stored on the output item itself so the Workbench can show what was produced and so the distribution adapter can use the exact copy.

```ts
interface ProducedOutputDraft {
  id: string;
  kind: 'caption' | 'headline' | 'hashtag' | 'post_copy';
  title: string;
  body: string;
  variants: string[];
  platform: string;
  createdAt: string;
}
```

`outputAssetIds` remains a lightweight reference list. For text drafts, those IDs point to `producedOutputs[].id`, not binary media.

## Distribution Bridge

Produced text items can create `CampaignDistributionPackage` draft inputs. The package should:

- use the produced copy in `copy.caption`, `copy.headline`, and `copy.hashtags`
- preserve routed knowledge context
- keep account selection explicit in Distribution
- keep publish confirmation explicit
- avoid claiming visual/video publish readiness when no binary media exists

Caption-only or post-copy packages are valid pending packages, but they may still require platform/account review or a visual attachment before final publishing.

## Guardrails

- Do not touch AGENTS.md forbidden low-level generation service files.
- Do not add new env vars.
- Do not create fake analytics or prediction dashboards.
- Do not auto-publish or schedule anything.
- Do not reintroduce Knowledge Brain pack selectors, multi-project brain choosers, or the old expert brief form.
- Do not make System Plan or model reasoning the primary user surface.

## Phase 2A Acceptance

- Confirming production marks supported text items as produced with visible draft content.
- Blocked visual/video items remain blocked only when their own required source assets are missing.
- Produced text items can map into distribution package draft inputs using their produced copy.
- Backend output-plan persistence round-trips produced output drafts with owner scoping and validation.
- Campaign Creative exposes a primary “produce supported items” path without pushing the user into Advanced Studio.
