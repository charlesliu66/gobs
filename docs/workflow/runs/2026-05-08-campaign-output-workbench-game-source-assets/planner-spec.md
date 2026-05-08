# Planner Spec: Campaign Output Workbench + Game Source Assets

## North Star

`Campaign Creative Agent` must start from campaign brief, produce creative assets or variants, and move them into distribution.

The user-facing page should focus on what GOBS will produce and what needs confirmation, not on internal System Plan reasoning.

## Background

- Current product context: Mission-first Campaign Creative and Distribution Package handoff are already live; the next step is to make the post-brief screen output-first.
- Why this run matters now: Operators care about deliverables, production readiness, and blocked source assets more than strategy internals.
- Upstream plan/design:
  - `docs/plans/2026-05-08-campaign-output-workbench-game-source-assets-design.md`
  - `docs/plans/2026-05-08-campaign-output-workbench-game-source-assets-plan.md`

## User Problems

1. After confirming a brief, the operator cannot immediately see how many assets GOBS will produce or which ones are blocked.
2. Game-marketing deliverables depend on original source assets, but missing game assets are not modeled clearly enough for planning and production.
3. Strategy/System Plan details currently occupy the primary surface even though they are not the user's immediate decision point.

## Target Users

### Primary

- Marketing and operations users running game campaign production and distribution.

### Secondary

- Product/engineering operators using capability gaps to decide what GOBS needs to learn next.

## Scope

### In Scope

- Deterministic frontend `CampaignOutputPlan` data model and builder.
- Backend output plan persistence API with owner scoping and validation.
- Campaign Output Workbench component and Campaign Creative page integration.
- Distribution package bridge from produced output items.
- Focused tests, run docs, product docs, workflow guard, builds, smoke, and release sync.

### Out of Scope

- Real automatic publishing.
- Scheduling engine work.
- Fake analytics or performance dashboards.
- Broad EditorWorkbench refactor.
- Low-level video/image generation service changes listed in AGENTS.md forbidden paths.
- User-facing Knowledge Brain pack selectors or old expert brief form restoration.

## Acceptance Criteria

| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Confirmed campaign briefs create deterministic output plans with deliverables, source asset requirements, capability statuses, and capability gaps. | `h5-video-tool/tests/campaignOutputPlan.test.ts` | Happy path plus missing strategy, multi-platform, empty assetNeeds, and all-source-assets-available cases pass. |
| AC-02 | Output plans persist through backend APIs with owner scoping and validation. | `h5-video-tool-api/tests/campaignOutputPlan.test.ts` | Create/list/read/update pass, cross-user reads are blocked, malformed statuses/item types return 400, payload round-trips. |
| AC-03 | Campaign Creative shows Output Workbench as the primary post-brief surface. | `campaignOutputWorkbenchPresence` and `campaignOutputWorkbenchIntegration` tests | Output summary/source readiness/capability gaps are visible; System Plan and Strategy controls are secondary/advanced; old selectors remain absent. |
| AC-04 | Produced output items can bridge into distribution package drafts. | `campaignDistributionPackage` and `distributionPackageIntake` tests | Produced items with real assets can create package drafts; blocked/unsupported items do not claim publishable; account selection remains explicit. |
| AC-05 | Release readiness is verified end to end. | workflow guard, backend/frontend builds, staging/prod smoke | P0/P1 zero, current SHA exists on origin/main and staging/prod report matching commit before idle. |

## Engineering Criteria

- Do not touch AGENTS.md forbidden files.
- Do not add new env vars.
- Use field-aware validation; do not introduce broad recursive data stripping.
- Preserve the existing mission-first Campaign Creative route and backend-routed Gold and Glory knowledge model.
- Keep Editor as an advanced path, not the default.
- Keep publish/account selection explicit.

## Risk Matrix

| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| UI scope too broad | Component, API, page refactor, and i18n land together | Hard-to-review regression | Split Task 3 component/API from Task 4 CampaignCreative integration | Builder |
| Output rules become vague | Builder encodes ad hoc conditions | Tests do not protect user expectations | Implement against deterministic mapping table and edge cases | Builder |
| Backend ownership regression | Output plans list/read across users | Data leakage | Mirror campaign distribution ownership tests | Builder/Verifier |
| Capability gaps become dead data | Gaps stored but not surfaced | Product signal lost | Show compact gaps in Workbench and verifier summaries; no fake analytics | Builder |
| Release drift | Local/GitHub/staging/prod mismatch | Operators see stale behavior | Use release guard, staging smoke, mark release ready, prod smoke, idle restore | Integrator |

## Test Matrix

| Category | Cases |
|---|---|
| Frontend model | Happy path, missing strategy fallback, TikTok + Facebook multi-platform, empty assetNeeds, fully matched source assets. |
| Backend API | Create/list/read/update, owner scoping, malformed enum rejection, source requirements/capability gaps round-trip. |
| UI presence | Workbench sections, i18n labels, API wrapper exports, no primary System Plan language. |
| UI integration | CampaignCreative imports and renders Workbench after brief confirmation; advanced strategy details remain secondary; old selectors absent. |
| Distribution bridge | Produced item maps to package input; blocked items non-publishable; missing source asset reason preserved; account selection explicit. |
| Release | `npm run build` backend/frontend, workflow guard build/verify/release, staging/prod smoke. |

## Source Files To Inspect First

- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/components/campaign/distributionPackage.ts
- h5-video-tool/src/components/distribution/packageToDistributeDraft.ts
- h5-video-tool/src/api/campaignDistribution.ts
- h5-video-tool-api/src/services/campaignDistributionPackage.ts
- h5-video-tool-api/src/routes/campaignDistributionPackage.ts
- h5-video-tool-api/tests/campaignDistributionPackage.test.ts

## Delivery Artifacts

- `SESSION-ANCHOR.md`
- `planner-spec.md`
- `challenger-review.md`
- `builder-report.md`
- `verifier-report.md`
- `eval-result.json`
- `release-decision.md`

## Exit Rule

- Stop and re-confirm scope if acceptance criteria must expand materially.
- Stop and re-confirm scope if forbidden files or new env vars become necessary.
- Stop and re-confirm before real automatic publishing, scheduling, analytics dashboard work, or broad EditorWorkbench refactor.
