# Advanced Studio Duration Plan Design

> Date: 2026-05-10
> Run: `2026-05-10-advanced-studio-storyboard-pacing-state-i18n`
> Scope: Product/architecture design for the next pacing implementation phase. This document does not change provider behavior by itself.

## Problem

Current Advanced Studio behavior sends `maxTotalDurationSec` into `/api/studio/storyboard-table` as a soft LLM constraint. In practice, increasing the target duration can cause the model to stretch individual shots instead of adding meaningful shots. That is bad for market/operator users because the pacing logic is invisible: they cannot tell whether a 60s, 90s, or 180s version should compress, preserve, or expand each story beat.

## Research Signals

- Professional storyboard tools treat timing as an animatic problem: panels and scenes are timed to match action pace, then played back and adjusted. Toon Boom Storyboard Pro describes the animatic step as setting each panel/scene duration to match intended action/story pace and supports exact panel duration editing.
- Toon Boom also has a scene-duration lock concept: adding panels can reduce existing panel duration to preserve scene duration. This is the product pattern GOBS needs for “same beat budget, more shots” instead of “same shot count, longer shots.”
- Advertising storyboards are compact: a 30-second commercial often uses roughly 8-15 key frames, while longer or more complex ads need more frames. This supports increasing shot count as duration/complexity grows.
- YouTube and TikTok official creative guidance both emphasize early hooks: YouTube wants brand presence and engagement in the first five seconds, while TikTok recommends the hook in the first six seconds and proposition in the first three seconds.
- Editing research and practitioner guidance agree that shot duration controls rhythm. James Cutting et al. found popular-film shot lengths have shortened over decades as filmmakers manage attention, and StudioBinder frames 4-6 seconds as a common modern baseline, with longer shots needing composition/camera movement to stay engaging.
- LLM story-planning research warns that automated outlines often suffer from unnatural pacing by over-expanding unimportant events or glossing over important ones. This maps directly to our current failure mode.

## Product Principle

The user should not manage shot math. The system should decide a sensible pacing plan, show why it made that choice, and let the user override only when necessary.

For market/operator users:
- default to “smart auto”
- expose a compact pacing summary, not a spreadsheet
- protect against long single shots unless they have clear visual/action complexity
- preserve campaign intent: hook, offer/product moment, proof/payoff, CTA

## Proposed Pipeline

Add an explicit `DurationPlan` layer between L1 story and L3 storyboard.

```ts
type DurationDensity = 'compressed' | 'balanced' | 'expanded';

interface DurationPlan {
  targetDurationSec: number;
  density: DurationDensity;
  estimatedShotCount: number;
  averageShotSec: number;
  maxSingleShotSec: number;
  beatBudgets: Array<{
    beatId: string;
    beatLabel: string;
    budgetSec: number;
    mode: 'keep' | 'merge' | 'expand' | 'trim';
    reason: string;
  }>;
  shotPlans: Array<{
    beatId: string;
    plannedDurationSec: number;
    intent: 'hook' | 'establish' | 'action' | 'emotion' | 'product' | 'proof' | 'transition' | 'cta';
    complexity: 'low' | 'medium' | 'high';
    mustHave: boolean;
  }>;
}
```

Then `generateStoryboardTable` should receive `DurationPlan.shotPlans`, not only `maxTotalDurationSec`.

## Duration Rules

### 1. Shot count changes with duration

Use target duration to estimate shot count before LLM generation:

| Target | Default density | Expected shot count | Notes |
|---|---|---:|---|
| 15-30s | compressed | 5-9 | Hook and CTA must be visible; few transitions. |
| 45-60s | balanced-short | 9-14 | Good default for market/operator creative. |
| 90s | balanced | 14-20 | Add proof, reactions, and clearer scene transitions. |
| 120-180s | expanded | 20-36 | Expand beats and split actions; do not stretch single shots. |

### 2. Single-shot duration guardrail

For Seedance execution, narrative shots should usually stay 4-10s. A shot may exceed 10s only if it has:
- multi-stage motion,
- purposeful camera move,
- strong emotional hold,
- product/character showcase reason.

Hard warning threshold: >15s. At that point the system should suggest splitting, not stretching.

### 3. Beat budget comes before shot duration

Each L1 beat gets a time budget based on story role:

| Beat role | 60s share | 180s behavior |
|---|---:|---|
| Hook/opening image | 8-12% | Still concise; do not triple it. |
| Setup/context | 15-20% | Add establishing and problem detail. |
| Core conflict/product action | 35-45% | Expand into more action/proof shots. |
| Payoff/emotion | 15-25% | Add reaction and reveal shots. |
| CTA/end card | 5-10% | Usually fixed length, not proportional. |

### 4. Expansion means more narrative beats, not longer holds

When target duration increases from 60s to 180s:
- keep first 3-6 seconds hook-focused
- keep CTA concise
- expand middle beats with additional shots
- split complex actions into sequential shots
- add reaction/transition/establishing shots only when they serve clarity

When target duration decreases:
- remove transition/reaction shots first
- merge simple establishing + action shots
- keep hook, product/key moment, payoff, and CTA

## UI Proposal

Before generating storyboard, show a compact “Smart pacing plan” panel:

- “60s version: 12 shots, average 5.2s, compressed middle.”
- “180s version: 28 shots, average 6.4s, expanded conflict/proof section.”
- Show 3 change chips: “+8 action shots”, “+4 reaction shots”, “CTA stays 5s.”
- Advanced drawer exposes beat budgets only for power users.

If the user changes duration after storyboard generation:

- Offer `Re-time only`: preserve shot count, rebalance durations within guardrails.
- Offer `Rebuild shot plan`: add/remove shots from beat budgets.
- Warn if generated media exists.

Default should be `Rebuild shot plan` for large changes such as 60s -> 180s because re-timing alone causes the current bad experience.

## Implementation Phases

1. Frontend preview-only helper: compute estimated shot count, density, and a summary before L3 generation.
2. Backend `DurationPlan` endpoint or helper: generate deterministic beat budgets from L1 story.
3. L3 prompt update: require exactly the planned shot count and attach each shot to a `beatId`.
4. Validator: reject/repair outputs whose total duration or shot count violates the plan.
5. UX polish: show “why this shot is 6s” and “split suggested” labels.

## Sources

- [Toon Boom Storyboard Pro: How to Create an Animatic](https://docs.toonboom.com/help/storyboard-pro-20/storyboard/getting-started/animatic.html)
- [Toon Boom Storyboard Pro: Locking the Scene Duration](https://docs.toonboom.com/help/storyboard-pro-20/storyboard/timing/lock-scene-duration.html)
- [Myth Labs: What Is a Storyboard in Advertising?](https://mythlabs.co.uk/concepts/what-is-storyboard)
- [YouTube Director Help: Creative guidelines](https://support.google.com/youtubedirector/answer/7642185?hl=en)
- [TikTok Ads: Creative best practices for performance ads](https://ads.tiktok.com/help/article/creative-best-practices?redirected=2)
- [Cutting et al. 2011: Quicker, Faster, Darker](https://journals.sagepub.com/doi/10.1068/i0441aap)
- [StudioBinder: How Does an Editor Control the Rhythm of a Film?](https://www.studiobinder.com/blog/how-does-an-editor-control-the-rhythm-of-a-film/)
- [Wang et al. 2023: Improving Pacing in Long-Form Story Planning](https://arxiv.org/abs/2311.04459)
