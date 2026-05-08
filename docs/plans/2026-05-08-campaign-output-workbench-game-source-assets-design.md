# Campaign Output Workbench + Game Source Assets Design

> Date: 2026-05-08
> Status: Approved direction, ready for implementation planning
> Related baseline: `05f400b`
> Related mainline: `2026-05-07-campaign-to-distribution-handoff-mvp`

## 1. Product Decision

The next Campaign Mission Control step should move from "show the system plan" to "show the campaign output." The marketer does not need to inspect how GOBS reasoned. After a brief is confirmed, the default screen should answer four practical questions:

1. What will this campaign produce?
2. Which items can GOBS produce now?
3. Which game source assets are required?
4. What still needs a human confirmation or upstream capability?

Current phase is still B: a Campaign Output Workbench where users confirm the output plan and then ask GOBS to produce the items it can produce. The design must intentionally point toward C: later, GOBS should run more of the campaign automatically and only pause for blocked, risky, or publish-critical decisions.

The long-term north star is that all common game marketing assets should eventually be produced inside GOBS. Anything GOBS cannot currently produce is not just a one-off suggestion; it is a capability gap that should be tracked and prioritized.

## 2. Target User Experience

The default flow becomes:

```text
Mission
-> Generated brief review
-> Output plan
-> Game source asset readiness
-> Confirm production
-> GOBS produces supported items
-> Resolve blocked or unsupported items
-> Choose publish accounts
-> Generate account-aware captions/titles
-> Final publish confirmation
```

The page should not lead with System Plan, Strategy Card, Variant Pack, or Brain internals. Those can remain available as advanced/debug details, but the primary surface should be the output list:

- 3 Facebook posts
- 2 high-quality short videos
- 1 banner set
- 5 TikTok captions
- 1 title/headline set

Each item should show:

- content purpose
- target platform
- required game source assets
- whether GOBS can produce it now
- current production status
- what the user must confirm or provide

## 3. Game Source Assets as a First-Class Capability

Game marketing outputs depend heavily on original game assets. GOBS should model this explicitly instead of treating missing assets as a generic `needs_asset` state.

Common source asset types:

- `game_logo`
- `key_art`
- `character_art`
- `hero_skill_clip`
- `gameplay_recording`
- `ui_screenshot`
- `reward_icon`
- `event_banner`
- `store_badge`
- `brand_guideline`

Each source asset requirement should capture:

- asset type
- why it is needed
- whether it is already available
- whether it can be selected from Asset Library
- whether the user must upload/provide it
- whether GOBS should generate a substitute
- rights or brand-safety notes

This makes source-asset readiness a campaign-level input to production, not an afterthought in distribution.

## 4. Core Objects

### CampaignOutputPlan

Represents the campaign's visible deliverables after brief confirmation.

```ts
interface CampaignOutputPlan {
  id: string;
  campaignId?: string;
  gameId: string;
  mission: string;
  briefId: string;
  status: 'draft' | 'needs_confirmation' | 'confirmed' | 'producing' | 'ready_for_distribution' | 'blocked';
  items: ProductionItem[];
  sourceAssetRequirements: GameSourceAssetRequirement[];
  capabilityGaps: CapabilityGap[];
  createdAt: string;
  updatedAt: string;
}
```

### ProductionItem

Represents one deliverable in the output list.

```ts
type ProductionItemType =
  | 'fb_post'
  | 'tiktok_video'
  | 'short_video'
  | 'banner'
  | 'caption_set'
  | 'headline_set'
  | 'hashtag_set';

interface ProductionItem {
  id: string;
  type: ProductionItemType;
  quantity: number;
  platform: string;
  title: string;
  contentBrief: string;
  requiredSourceAssetIds: string[];
  productionCapability: 'supported' | 'supported_with_source_assets' | 'unsupported' | 'manual_recommended';
  status: 'planned' | 'blocked' | 'ready_to_produce' | 'producing' | 'produced' | 'failed' | 'skipped';
  gobsCanProduce: boolean;
  outputAssetIds: string[];
  distributionPackageIds: string[];
  humanAction?: {
    type: 'confirm' | 'provide_source_asset' | 'review_risk' | 'external_production';
    label: string;
    detail: string;
  };
}
```

### GameSourceAssetRequirement

Represents source material needed before GOBS can produce the planned item well.

```ts
interface GameSourceAssetRequirement {
  id: string;
  assetType: string;
  label: string;
  neededForProductionItemIds: string[];
  status: 'available' | 'missing' | 'needs_selection' | 'needs_upload' | 'can_generate_substitute' | 'blocked';
  matchedAssetIds: string[];
  guidance: string;
  rightsNote?: string;
}
```

### CapabilityGap

Represents a capability GOBS should build later.

```ts
interface CapabilityGap {
  id: string;
  gapType: 'generator_missing' | 'source_asset_missing' | 'adapter_missing' | 'quality_not_ready';
  title: string;
  affectedProductionItemIds: string[];
  currentWorkaround: string;
  priorityHint: 'low' | 'medium' | 'high';
}
```

## 4.5 Phase 1 Deterministic Mapping Rules

Phase 1 should be deterministic enough that Builder and Verifier can reason about it without inspecting model rationale. The output planner should treat the following table as the source of truth unless a later plan explicitly changes it.

| Input signal | Planned output | Source asset rule | Capability / gap rule |
|---|---|---|---|
| Any confirmed brief | 1 `caption_set`, 1 `headline_set`, 1 `hashtag_set` | No required source asset by default | `supported`; no capability gap |
| `mode=tiktok_content` or platform includes TikTok | 2 `short_video` items | Require `gameplay_recording` and `game_logo`; add `character_art` when strategy mentions hero, character, skin, or skill | `supported_with_source_assets`; blocked only when required source assets are missing |
| `mode=tiktok_ua` | 2 `tiktok_video` items | Require `gameplay_recording`, `game_logo`, `reward_icon`, and `store_badge` when UA or install language appears | `supported_with_source_assets`; add high-priority gap only if adapter or quality path is unavailable |
| platform includes Facebook or content mode requests social posts | 3 `fb_post` items | Text-only posts require no source asset; image posts require `key_art` or `character_art` | `supported` for copy-only, `supported_with_source_assets` for visual posts |
| Strategy `assetNeeds` or `visualCues` mention banner, store, event, key art, or hero visual | 1 `banner` item | Require `key_art` and `game_logo`; add `event_banner` for event campaigns | `manual_recommended` in Phase 1 unless a safe template adapter already exists; otherwise create `generator_missing` or `quality_not_ready` gap |
| Strategy is missing or rejected | Minimal fallback: caption/headline/hashtag plus 1 short-video placeholder | Infer from brief objective, audience, platform, and mission only | Add `review_risk` human action; do not invent unsupported reasoning |
| `assetNeeds` is empty | Still infer requirements from output type | Do not create vague "missing asset" rows | Capability gaps should only reflect real blocked outputs |
| All source requirements are available or matched | Items depending on them become `ready_to_produce` | Preserve matched asset IDs on requirements | No `source_asset_missing` capability gap |

For multi-platform briefs, Phase 1 should normalize the requested platform list before building items. If the existing brief shape only has one `platform`, the builder may accept an additional `requestedPlatforms` argument rather than broadening the persisted brief contract in the first implementation pass.

## 5. Relationship to Existing Distribution Packages

The existing `CampaignDistributionPackage` remains the handoff object for publish preparation. The new output plan sits one step earlier:

```text
CampaignOutputPlan
-> ProductionItem[]
-> produced assets or blocked items
-> CampaignDistributionPackage[]
-> Distribution account selection and publish confirmation
```

This avoids overloading `CampaignDistributionPackage` with production planning concerns. A package should stay focused on distribution readiness, ownership, copy, asset readiness, and publish intent.

## 6. UI Shape

The default Campaign page after brief confirmation should show:

1. Output Summary
   - counts by deliverable type
   - total items
   - supported vs blocked count

2. Production List
   - grouped by output type
   - each row/card shows quantity, content brief, required source assets, status, and primary next action

3. Source Asset Readiness
   - missing source assets surfaced in plain terms
   - actions: choose from Asset Library, upload/source externally, generate substitute when supported

4. Capability Gaps
   - not the main emotional center of the page
   - visible enough that product and engineering can learn what GOBS cannot yet do

5. Distribution Preparation
   - appears when produced items exist
   - user selects accounts explicitly
   - system generates account-aware captions/titles/hashtags
   - final publish confirmation remains explicit

Advanced strategy details should collapse into a secondary section. The old System Plan language should stop being the primary promise on the page.

## 6.5 Capability Gap Consumption

Capability gaps should not become decorative data. Phase 1 should store them on `CampaignOutputPlan.capabilityGaps` and expose them in three practical places:

1. Campaign Output Workbench: operators see the blocked output, the workaround, and the exact source asset or production capability that is missing.
2. Workflow verifier summaries: Builder/Verifier can report recurring gaps without creating an analytics dashboard.
3. Future capability backlog: after enough real campaigns, repeated gaps can be promoted into a product/engineering backlog.

Priority hints should stay simple:

- `high`: blocks a default deliverable such as short video, TikTok UA video, banner set, or a repeated game-source-asset need across multiple campaigns.
- `medium`: blocks an optional platform format or a useful but non-default production path.
- `low`: rare external/manual item with a clear workaround.

Phase 1 must not create fake analytics or usage charts. The gap list is a planning and operations signal, not a performance dashboard.

## 7. Phased Delivery

### Phase 1: Output Workbench MVP

Generate a deterministic output plan after brief confirmation. Replace the primary System Plan/Strategy display with output summary, production list, and source asset readiness. Keep actual production manual or simulated through existing package creation where needed, but do not claim unsupported automation.

Acceptance:

- brief confirmation produces an output plan
- output plan includes at least FB post, short video, caption/headline outputs
- every output item has a GOBS capability status
- every visual/video item lists required game source assets
- unsupported items produce capability gaps and practical guidance

### Phase 2: Production-Ready Items

Connect supported production items to existing GOBS production paths where already safe, without touching forbidden low-level generation services. Use adapters and service boundaries.

Acceptance:

- supported caption/headline/post items can produce draft copy
- supported package items can become `CampaignDistributionPackage` records
- missing game source assets block only the affected production items

### Phase 3: Source Asset Library Readiness

Strengthen Asset Library metadata so game source assets can be found and matched. This is where source asset tagging becomes a durable product capability.

Acceptance:

- source assets can be classified by type
- output items can reference matched source assets
- missing source assets can be selected or uploaded through a clear user path

### Phase 4: Toward Autopilot C

Introduce `CampaignRun` orchestration only after Phase 1-3 are stable. GOBS can then start automatically advancing supported jobs and interrupt only for missing assets, risky claims, capability gaps, account selection, and final publish.

Acceptance:

- supported production jobs advance without repeated user clicks
- blocked jobs remain explainable
- final publish still requires explicit confirmation unless a future release explicitly approves real autopublish

## 7.5 Follow-Up Plan Boundaries for Phase 2-4

The current implementation plan should cover Phase 1 only. Later phases need separate plans before Builder starts:

- Phase 2 plan: production adapters for supported output items, staying behind service boundaries and not touching AGENTS.md forbidden generation files.
- Phase 3 plan: Asset Library metadata, source asset classification, selection/upload UX, and matching rules.
- Phase 4 plan: `CampaignRun` orchestration toward autopilot C, with explicit release approval before any real automatic publishing.

This keeps the current MVP small enough to ship while preserving the product direction that every blocked game-marketing asset becomes a capability GOBS should eventually learn to produce.

## 8. Guardrails

- Do not reintroduce user-facing knowledge-pack selection in the default Campaign path.
- Do not make System Plan or model reasoning the primary user surface.
- Do not touch AGENTS.md forbidden video-generation service files.
- Do not claim automatic publishing until the release context explicitly allows it.
- Do not hide missing source assets behind a generic `needs_asset` label.
- Do not create fake analytics or performance dashboards.

## 9. Recommendation

Implement Phase 1 now: B-level Campaign Output Workbench with C-ready data shapes. This gives users a clearer workflow immediately while creating the right foundation for autopilot, game source asset readiness, and capability-gap tracking.
