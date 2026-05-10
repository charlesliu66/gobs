# Story Video Quality Samples

> Date: 2026-05-10  
> Related checklist run: Run 3 - Story Video Review Capture  
> Status: sample format only; not persisted runtime data

## Purpose

Run 3 needs real human review data before GOBS can build a credible quality panel or next-version flow. This document defines the story video review sample format that Window B can use once Run 0 `Review` and `Output` contracts are available.

## Allowed Quality Labels

Use only the Run 0 labels:

- `usable`: fits the brief, core selling point is clear, and no blocking issue prevents use.
- `needs_fix`: direction is correct, but copy, pacing, framing, or asset accuracy needs improvement.
- `unusable`: misses the brief, uses incorrect core assets, loses the selling point, or cannot be published.

## Feedback Tags

Use these initial tags for story video reviews:

- `weak_opening`
- `slow_pacing`
- `unclear_selling_point`
- `weak_ending`
- `character_inaccurate`

Optional notes can add detail, but the tags above should stay stable so later analysis is comparable.

## Review Record Template

```yaml
sampleId:
campaignId:
outputId:
reviewStatus: planned_sample
campaignBrief:
scriptSummary:
storyboardSummary:
resultLink:
artifactId:
qualityLabel:
feedbackTags: []
nextVersionSuggestion:
reviewer:
reviewedAt:
sourceAssetIds: []
notes:
```

`reviewStatus` values:

- `planned_sample`: row exists but no generated result is available.
- `observed_result`: result exists and can be reviewed.
- `reviewed`: human review is complete.

## Seed Sample Slots

These are placeholders for later real outputs. They must not be counted as quality evidence until `resultLink` or `artifactId` is filled.

| Sample ID | Campaign/use case | Script intent | Expected review focus | Status |
|---|---|---|---|---|
| SV-001 | Gold and Glory early-game hook | Show the first 3 seconds clearly communicating reward/progression | Opening strength and selling point clarity | planned_sample |
| SV-002 | Gold and Glory character-led ad | Use a character moment to lead into core gameplay value | Character accuracy and pacing | planned_sample |
| SV-003 | Gold and Glory end-card CTA | Build a short story that lands on install/action CTA | Ending strength and publish readiness | planned_sample |

## Minimum Evidence For Run 3

Run 3 should not claim success until:

- At least 3 story video outputs have `observed_result` or `reviewed` status.
- Each reviewed output has exactly one quality label.
- Each reviewed output has zero or more feedback tags from the fixed list.
- Each reviewed output links back to an `outputId`.
- Campaign-side viewing is backed by persisted data, not browser-only local state.

## Failure And Boundary Cases

- Missing `outputId`: block persistence until the output can be linked.
- Missing result artifact: keep row as `planned_sample`.
- Reviewer disagrees with label: preserve the latest reviewer note; do not invent scoring.
- Video provider failure: record as generation failure outside the quality label unless a viewable result exists.

## Future UI Notes

When runtime work is allowed, the result page entry should be minimal:

- Three quality buttons: usable, needs fix, unusable.
- Multi-select issue tags.
- Optional next-version note.
- Clear copy saying the review is human-entered, not automatic video understanding.
