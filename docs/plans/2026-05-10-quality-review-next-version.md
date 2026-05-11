# Quality Review And Next Version MVP

> Run: `2026-05-10-quality-review-next-version`
> Window: A - Output mainline
> Status: in progress

## Goal

Add the first Campaign Output quality feedback loop after Run 2 Banner output and Run 3 story-video review capture.

This run keeps the implementation intentionally narrow:

- Diagnose quality from human marks, selected feedback tags, and static rules only.
- Support Banner and copy outputs first.
- Create a next-version prompt/task draft instead of introducing a new revision system.
- Preserve traceability through `parentOutputId`, campaign/brief context, source asset ids, feedback tags, and notes.

## Product Shape

In Campaign Output Workbench, produced outputs should show:

- Current quality state: `usable`, `needs_fix`, `unusable`, or not reviewed yet.
- Fixed feedback tags from the Run 4 vocabulary.
- A short static recommendation.
- A next-version action that creates a new output draft linked to the previous output.

For Banner outputs, the next version is a Banner prompt draft that inherits specs and source asset ids.

For copy outputs, the next version is a rewrite prompt draft that keeps platform and brief context.

For video outputs, this run only keeps UI language honest: GOBS can capture feedback and create a follow-up task later, but this run does not promise automatic video understanding or local partial regeneration.

## Feedback Vocabulary

Run 4 feedback buttons:

- Selling point not prominent.
- First 3 seconds are weak.
- Pacing is slow.
- Character is inaccurate.
- Action does not match reference.
- Copy is not strong enough.
- Better suited for TikTok.
- Better suited for Facebook.

These map to Run 0 issue tags where possible, and otherwise remain explicit feedback metadata on the produced output.

## Acceptance Criteria

| ID | Requirement |
|---|---|
| AC-01 | Campaign Output Workbench shows a quality panel based only on human marks, feedback tags, and static rules. |
| AC-02 | Operators can choose fixed feedback tags and create a next-version draft for Banner and copy outputs. |
| AC-03 | Next-version drafts include `parentOutputId`, inherited source asset ids, campaign/brief context, feedback tags, and feedback note. |
| AC-04 | Output-plan persistence round-trips feedback metadata and rejects unsupported feedback tags/statuses. |
| AC-05 | UI copy does not imply AI automatically understands video quality or can partially regenerate every video. |

## Non-goals

- No automatic quality score.
- No video-content understanding.
- No new `Version` entity.
- No provider call.
- No deployment from this window.
