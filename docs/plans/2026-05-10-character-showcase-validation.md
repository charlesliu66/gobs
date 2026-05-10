# Character Showcase Validation

> Date: 2026-05-10  
> Related checklist run: Run 6 - Character Showcase Validation  
> Current conclusion: `experimental` until observed evidence proves otherwise

## Purpose

Character Showcase needs evidence that it can produce ad-feeling character materials, not just visually interesting clips. This document defines the 5-character x 2-direction validation matrix and the exit rule.

## Conclusion Rule

The final validation conclusion must be one of:

- `continue`: at least 3 of 10 observed samples are `usable`, and recommended templates are clearly named.
- `experimental`: fewer than 3 usable samples, or results only work for narrow showcase situations.
- `pause`: fewer than 3 usable samples and no repeatable ad-use case emerges.

Until all 10 samples are observed, keep the product-facing status as `experimental`.

## Quality Labels

- `usable`: character remains accurate, visual clarity is acceptable, and the clip has a clear ad use.
- `needs_fix`: direction is promising but character accuracy, composition, clarity, or ad framing needs adjustment.
- `unusable`: character is wrong, unclear, not ad-like, or result is missing.

## Failure Tags

- `character_inaccurate`
- `visual_unclear`
- `no_ad_feel`
- `template_mismatch`
- `banner_better_than_video`
- `result_missing`

## Sample Record Template

```yaml
sampleId:
status: planned_sample
characterAsset:
showcaseDirection:
campaignUseCase:
recommendedSurface:
generationSettings:
resultLink:
artifactId:
qualityLabel:
failureTags: []
usableForAd:
reviewer:
reviewedAt:
notes:
```

`recommendedSurface` values:

- `video`
- `banner`
- `both`
- `neither`

## 5 x 2 Sample Plan

| Sample ID | Character slot | Direction | Review focus | Status |
|---|---|---|---|---|
| CS-001 | Hero character A | Character reveal | Accuracy and first-frame clarity | planned_sample |
| CS-002 | Hero character A | Skill/selling-point showcase | Ad feel and motion clarity | planned_sample |
| CS-003 | Hero character B | Character reveal | Accuracy and composition | planned_sample |
| CS-004 | Hero character B | Skill/selling-point showcase | Template fit | planned_sample |
| CS-005 | Villain/boss character | Character reveal | Visual clarity | planned_sample |
| CS-006 | Villain/boss character | Skill/selling-point showcase | Ad tension and readability | planned_sample |
| CS-007 | Support/companion character | Character reveal | Identity preservation | planned_sample |
| CS-008 | Support/companion character | Skill/selling-point showcase | Whether video or banner is better | planned_sample |
| CS-009 | UI/avatar character | Character reveal | Asset suitability | planned_sample |
| CS-010 | UI/avatar character | Skill/selling-point showcase | Publish readiness | planned_sample |

## Recommended Template Record

After samples are reviewed, record:

| Template | Recommendation | Evidence sample IDs | Notes |
|---|---|---|---|
| Character reveal | pending |  |  |
| Skill showcase | pending |  |  |
| Banner-first character card | pending |  |  |

`Recommendation` values:

- `recommended`
- `use_with_caution`
- `not_recommended`

## Usable Rate Calculation

```text
usable_rate = reviewed_samples_with_qualityLabel_usable / reviewed_samples_total
```

Do not calculate usable rate from planned samples or missing results.

## Boundary Cases

- If a character works as a static key visual but not as video, mark `recommendedSurface: banner`.
- If the clip is visually nice but lacks an ad use, use `needs_fix` or `unusable` with `no_ad_feel`.
- If identity changes materially, use `unusable` with `character_inaccurate`.
- If result is missing, do not treat it as a reviewed quality sample.

## What This Run Does Not Do

- It does not adjust runtime presets.
- It does not change provider calls.
- It does not promise Character Showcase is stable.
- It does not move the mode into default Campaign output.
