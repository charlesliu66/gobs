# Motion Transfer Validation

> Date: 2026-05-10  
> Related checklist run: Run 5 - Motion Transfer Validation  
> Current conclusion: `experimental` until observed evidence proves otherwise

## Purpose

Motion Transfer should be treated as a validation run, not a feature expansion. The question is whether reference-action videos can reliably create ad-usable output for the current GOBS business context.

## Conclusion Rule

The final validation conclusion must be one of:

- `continue`: at least 3 of 10 observed samples are `usable`, and at least 3 suitable action categories are identified.
- `experimental`: fewer than 3 usable samples, or the use case is narrow enough that it should remain behind an experiment entry.
- `pause`: fewer than 3 usable samples and no repeatable ad-use case emerges.

Until 10 observed samples exist, keep the product-facing status as `experimental`.

## Quality Labels

- `usable`: action transfer supports the ad idea and does not create obvious character/action errors.
- `needs_fix`: direction is useful but contains timing, pose, identity, framing, or clarity issues.
- `unusable`: reference action fails, character breaks, output is not ad-usable, or generated result is missing.

## Failure Tags

- `action_not_followed`
- `character_identity_drift`
- `camera_or_framing_bad`
- `motion_artifact`
- `ad_value_unclear`
- `result_missing`

## Sample Record Template

```yaml
sampleId:
status: planned_sample
referenceActionType:
referenceSource:
characterAsset:
campaignUseCase:
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

`status` values:

- `planned_sample`
- `observed_result`
- `reviewed`

## 10-Sample Plan

| Sample ID | Reference action type | Campaign use case | Expected risk | Status |
|---|---|---|---|---|
| MT-001 | Walk-in reveal | Character enters scene for opening hook | Framing drift | planned_sample |
| MT-002 | Victory pose | Reward/progression payoff | Pose exaggeration | planned_sample |
| MT-003 | Quick attack motion | Combat feature tease | Motion artifacts | planned_sample |
| MT-004 | Item pickup | Core loop demonstration | Action not followed | planned_sample |
| MT-005 | Running forward | Urgency/opening hook | Character identity drift | planned_sample |
| MT-006 | Turnaround showcase | 3D-like character display | Camera instability | planned_sample |
| MT-007 | Celebration gesture | Social proof/end card | Ad value unclear | planned_sample |
| MT-008 | Dodge/evade | Combat tension | Motion artifacts | planned_sample |
| MT-009 | Pointing/CTA gesture | CTA lead-in | Hand/pose issues | planned_sample |
| MT-010 | Idle-to-action transition | Before/after transformation | Timing mismatch | planned_sample |

## Usable Rate Calculation

```text
usable_rate = reviewed_samples_with_qualityLabel_usable / reviewed_samples_total
```

Do not calculate usable rate from planned samples.

## High-Risk Action Types To Watch

- Fast combat motions with occlusion.
- Hand-heavy gestures near the camera.
- Actions that require exact prop interaction.
- Multi-character choreography.
- Strong camera moves combined with character identity preservation.

## Entry Copy Guidance For Future Runtime Work

If usable rate is below 30%, the Motion Transfer entry must not be presented as stable. It should say that results vary and that the mode is for experimental reference-action tests.

## What This Run Does Not Do

- It does not modify video provider services.
- It does not tune prompts in code.
- It does not claim Motion Transfer is production-ready.
- It does not hide weak results to improve the usable rate.
