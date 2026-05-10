# Story Video Quality Samples

> Date: 2026-05-10  
> Related run: `2026-05-10-story-video-review-capture`  
> Status: Run 3 implementation notes and sample format

## Purpose

Story-video quality needs human review data before GOBS can build a credible quality panel or next-version flow. Run 3 captures manual review records against Run 0 `ReviewContract` fields and keeps the labels limited to `usable`, `needs_fix`, and `unusable`.

## Record Shape

Runtime review records use the Run 0 fields:

```yaml
reviewId:
outputId:
status: usable | needs_fix | unusable
issueTags: []
note:
parentOutputId:
reviewerId:
createdAt:
```

Run 3 stores story-video context alongside those fields:

```yaml
outputType: story_video
campaignId:
resultTaskId:
resultUrl:
title:
```

## Fixed Story Tags

- `weak_opening` - 开头弱
- `slow_pacing` - 节奏慢
- `unclear_selling_point` - 卖点不清楚
- `weak_ending` - 结尾弱
- `inaccurate_character` - 角色不准确

## Seed Sample Slots

These rows become evidence only after a real result is reviewed.

| Sample ID | Campaign/use case | Script intent | Expected review focus | Status |
|---|---|---|---|---|
| SV-001 | Gold and Glory early-game hook | Show the first 3 seconds clearly communicating reward/progression | Opening strength and selling point clarity | planned_sample |
| SV-002 | Gold and Glory character-led ad | Use a character moment to lead into core gameplay value | Character accuracy and pacing | planned_sample |
| SV-003 | Gold and Glory end-card CTA | Build a short story that lands on install/action CTA | Ending strength and publish readiness | planned_sample |

## Implementation Boundary

- The result page captures human-entered quality review.
- The UI explicitly says the system has not automatically understood the video.
- This run does not generate a next version.
- This run does not change video provider services.
- This run does not edit Campaign Output Workbench or Campaign backend routes.

## Follow-Up

Run 4 can use these records for a quality panel and next-version prompts. Data Contract Hardening should decide when these local review records move to backend persistence for cross-device history.
