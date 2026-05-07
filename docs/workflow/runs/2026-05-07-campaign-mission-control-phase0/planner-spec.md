# Planner Spec - 2026-05-07-campaign-mission-control-phase0

## North Star

> `Campaign Creative Agent` 必须从 campaign brief 出发，稳定产出创意素材或变体，并把它们送入分发。

This batch is in scope only if it makes the marketer-facing default path look and behave more like a campaign system rather than a collection of tools.

## Background

- Current product context: the shipped mainline already supports `Knowledge Brain -> Campaign Creative -> Variant Pack -> Editor knowledge handoff`, but the default surface still reads as tool-first and editor-adjacent.
- Why this run matters now: without a campaign-first wrapper, GOBS keeps drifting toward a pro-editor tool instead of an agentic marketer workflow.
- Upstream plans: `2026-05-06-campaign-creative-agent-next-phase-design.md` and `2026-05-06-campaign-mission-control-phase0-implementation-plan.md`.

## User Problems

1. Marketers and operators still land in a product shaped like a tool suite instead of a campaign mission surface.
2. `CampaignCreative` already has strong knowledge-aware internals, but the page hierarchy still over-emphasizes strategy tuning and local control instead of system planning.

## Target Users

### Primary
- Marketers and operators driving campaign creation with minimal clicks and minimal production jargon

### Secondary
- Advanced editors/producers who still need access to the existing deeper controls after the campaign shell hands work off

## Scope

### In Scope
- Task 1 mission-control domain-model additions that preserve the current knowledge-aware handoff chain
- Task 2 homepage/navigation reframing into a mission-control-first entry
- Task 3 marketer-first `CampaignCreative` shell with explicit system-plan and pending-action presentation

### Out of Scope
- Human feedback loop persistence
- Distribution logic changes
- Deep editor workflow redesign
- Analytics/performance monitoring

## Acceptance Criteria

| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | `CampaignCreative`/Editor shared types preserve mission-control campaign fields | Targeted backend seam tests | `editorCreativeBrief` tests prove new fields survive normalization and fallback paths |
| AC-02 | Home/nav present a campaign-first mission-control entry | Locale tests + manual inspection + frontend build | Copy keys exist, `/campaign-creative` remains the primary recommended route, advanced routes stay reachable |
| AC-03 | `CampaignCreative` shows brief + knowledge + system plan + asset pack + pending decisions as the default hierarchy | Targeted strategy tests + frontend build + manual page check | New planner helpers and cards render without breaking existing knowledge-aware strategy generation |

## Engineering Criteria

- Keep runtime behavior compatible with the shipped knowledge-aware strategy/variant/editor chain.
- Reuse landed knowledge-context names; do not invent a second parallel schema.
- Prefer pure-helper additions and shallow page composition over broad architectural churn in this batch.

## Risk Matrix

| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Schema drift | Mission-control fields duplicate existing knowledge-aware fields | More brittle handoff logic | Extend current types in place and reuse existing keys | Builder |
| UI overreach | Trying to finish Task 4/5 inside this batch | Scope blow-up and delayed verification | Hard-scope this run to Tasks 1-3 only | Orchestrator |
| Regression in editor handoff | New campaign summary fields break normalization | First apply loses existing context | Expand seam tests before editing serializers | Builder |

## Test Matrix

| Category | Cases |
|---|---|
| Happy path | Generate strategy from brief + selected knowledge packs and render the mission-control shell |
| Edge cases | No selected knowledge packs still falls back to current heuristic flow |
| Error path | Malformed/partial campaign handoff still normalizes safely in editor brief helpers |
| Regression | Existing variant pack / strategy card / locale build remains intact |

## Source Files To Inspect First

- h5-video-tool/src/components/campaign/model.ts
- h5-video-tool/src/components/campaign/strategy.ts
- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/pages/Home.tsx
- h5-video-tool/src/components/Layout.tsx
- h5-video-tool-api/src/services/editorCreativeBrief.ts
- h5-video-tool-api/tests/editorCreativeBrief.test.ts

## Delivery Artifacts

- `SESSION-ANCHOR.md`
- `planner-spec.md`
- `challenger-review.md`
- `builder-report.md`
- `verifier-report.md`
- `release-decision.md`
- `eval-result.json`

## Exit Rule

- Stop and re-confirm if implementing Task 2-3 requires broad editor/distribution behavior changes.
- Stop and re-confirm if Task 4/5 needs to be pulled into the same batch.
