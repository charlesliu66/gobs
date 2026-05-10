# Window B Video Validation And Governance Prep

> Date: 2026-05-10  
> Run: `2026-05-10-window-b-video-validation-prep`  
> Window: B - video validation and governance  
> Status: docs-only prep until Run 0 quality/data contracts land

## Purpose

Window B owns Run 3 and Run 5-12 from `2026-05-10-gobs-next-optimization-checklist.md`, but it must not write runtime code until Window A finishes Run 0. This document turns that constraint into a runnable sequence so Window B can prepare validation samples now and start implementation later without colliding with Window A.

## Campaign Creative North Star Guardrail

Window B work must support the current mainline: Campaign Creative Agent starts from a campaign brief, produces creative assets or variants, and moves publishable outputs toward Distribution. Video validation is useful only when it answers whether an output is ad-usable for Campaign outcomes; it should not pull the product back toward a general-purpose video lab.

## Hard Boundaries

- Do not edit runtime source during this prep run.
- Do not edit `CampaignOutputWorkbench.tsx`.
- Do not edit `campaignOutputPlans.ts` or `campaignDistributionPackages.ts`.
- Do not deploy; Release Owner owns staging/prod.
- Do not move Motion Transfer or Character Showcase into the default main flow until observed samples meet the exit rule.

## Run Map

| Run | Theme | Allowed now | Blocked until | Start gate | Output of this prep |
|---|---|---|---|---|---|
| Run 3 | Story Video Review Capture | Define sample fields, labels, feedback tags, and evidence requirements | Run 0 `Review`/`Output` contract; Campaign-side viewing owner clear | Run 0 merged; no shared-file collision with Window A | `2026-05-10-story-video-quality-samples.md` |
| Run 5 | Motion Transfer Validation | Prepare 10-sample matrix and exit rule | Real generated results and Run 0 labels | 10 observed samples or explicit sample collection task | `2026-05-10-motion-transfer-validation.md` |
| Run 6 | Character Showcase Validation | Prepare 5 characters x 2 directions matrix and exit rule | Real generated results and Run 0 labels | 10 observed samples or explicit sample collection task | `2026-05-10-character-showcase-validation.md` |
| Run 7 | Distribution Final Mile | Record dependency and collision boundaries | Package route ownership available | Pull latest after Window A/Distribution branches merge | No code in prep |
| Run 8 | Knowledge Traceability | Record feedback-loop dependency | Knowledge source/feedback persistence owner clear | Run 0/Run 9 ID path agreed | No code in prep |
| Run 9 | Data Contract Hardening | Record audit targets | Run 0 contracts merged | Current Campaign -> Studio -> Distribution path stable | No code in prep |
| Run 10 | Legacy Surface Reduction | Keep as later separate cleanup | Business runs stable | Dedicated cleanup branch and smoke plan | No code in prep |
| Run 11 | Large Component Refactor | Pause | Business validation stable after June | One boundary, tests first | No action |
| Run 12 | Editor Effects Sprint | Pause | Quality/feedback loop stable | Separate sprint | No action |

## Sequencing Recommendation

1. Keep Window B on docs-only prep until Window A completes Run 0.
2. After Run 0 merges, open a dedicated Run 3 branch for persisted story review capture.
3. In parallel with Run 3 sample collection, collect Motion Transfer and Character Showcase observed outputs using the templates here.
4. Only after real sample evidence exists, open separate Run 5 and Run 6 implementation runs for entry wording/presets.
5. Defer Run 7-10 implementation until the Campaign/Asset/Output/Review/Package IDs are stable in code.
6. Keep Run 11 and Run 12 paused unless the user explicitly reprioritizes them.

## Shared File Collision Rules

| File or area | Current rule | Why |
|---|---|---|
| `CampaignOutputWorkbench.tsx` | Window B does not edit | Window A owns Campaign output/Banner/next-version work. |
| `campaignOutputPlans.ts` | Window B does not edit | Window A owns Output Plan contract and persistence changes. |
| `campaignDistributionPackages.ts` | Window B does not edit | Distribution package route is shared by Run 2/4/7/9. |
| `h5-video-tool/src` | Forbidden for this prep run | Run 0 types are not available yet. |
| `h5-video-tool-api/src` | Forbidden for this prep run | No backend contract or persistence work yet. |

## Evidence Standard For Video Validation

Every validation sample must include:

- Campaign brief or use case.
- Source asset or reference description.
- Generation settings or template.
- Result link/artifact id.
- Human quality label: `usable`, `needs_fix`, or `unusable`.
- Failure tags.
- Whether the result can be used in an ad.
- Reviewer and review date.

Planned sample rows are not evidence. They become evidence only after `resultLink` or `artifactId` is filled.

Human review is the source of truth in these prep docs. Do not word any future UI or report as if the system has automatically understood video content unless a later run explicitly implements and validates that capability.

## Exit Rule

Motion Transfer and Character Showcase both start as `experimental`.

- `continue`: at least 3 of 10 observed samples are `usable`, and at least 3 suitable use cases are named.
- `experimental`: fewer than 3 usable samples but at least one repeatable niche use case exists.
- `pause`: fewer than 3 usable samples and no repeatable use case is found.

No template should be represented as stable/default if the latest observed usable rate is below 30%.

## Handoff To Future Window B Runs

Before opening any runtime implementation run:

- Pull latest from origin and rebase/merge the Window B branch.
- Confirm Run 0 contract files exist and are imported by the target surface.
- Confirm Window A is not editing the same shared files.
- Create a new run-specific branch, for example `codex/2026-05-10-story-video-review-capture`.
- Keep Release Owner deployment out of the Dev Worker window.
