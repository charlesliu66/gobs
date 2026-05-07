# Planner Spec - 2026-05-07-campaign-advanced-studio-phase0

## North Star

> `Campaign Creative Agent` must start from campaign brief, produce creative assets or variants, and move them into distribution.
> This batch is in scope only if it makes the marketer-facing default path feel more primary while pushing professional controls behind an explicit `Advanced Studio` boundary.

## Background

- Current product context: `Campaign Mission Control Phase 0` is already live on `main`, and the default path is now brief -> knowledge -> system plan -> variant selection. The next visible gap is that several editor-first and production-first entry points still look like peer alternatives rather than advanced follow-on tools.
- Why this run matters now: the user explicitly wants the default audience to be marketers and operators, with fewer decisions and less production jargon. Advanced editing and production power should remain available without defining the default product shape.
- Upstream plan: `docs/plans/2026-05-06-campaign-mission-control-phase0-implementation-plan.md` Task 4.

## User Problems

1. Some key surfaces still signal "tool suite" instead of "campaign-first system plus advanced fallback".
2. `CampaignStrategyCard` still ends in a strong pro-tool CTA, and `ProjectList` still reads like a primary production lobby.
3. Power users still need stable deep-link, handoff, and project-management behavior, so the change must stay presentational.

## Target Users

### Primary
- Marketers and operators who should understand that the default flow stays inside Campaign Mission Control until they truly need advanced control

### Secondary
- Editors and producers who still need quick access to the full advanced workspace without losing existing project and sync flows

## Scope

### In Scope
- Reframe editor/production entry labels and hierarchy so they read as advanced follow-on tools
- Add or normalize copy for:
  - `Open In Advanced Studio`
  - `Fine-Tune In Editor`
  - `Review Before Publish`
- Keep advanced routes reachable while making their role clearer on:
  - `CampaignStrategyCard`
  - `ProjectList`
  - `EditorWorkbench`

### Out of Scope
- Any route change, query-param change, or handoff storage-key change
- Any project storage or editor state model change
- Layout/nav regrouping beyond copy already shipped in the previous run
- Feedback-loop, distribution, or knowledge-derivation changes

## Acceptance Criteria

| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Advanced-entry labels exist and are localized in both locales | Locale test + frontend build | `locale.test.ts` proves the new or normalized labels resolve correctly |
| AC-02 | Campaign Strategy Card makes the advanced entry explicit but visually secondary | Manual code inspection + frontend build | CTA wording and surrounding framing clearly signal an advanced follow-on action without changing the launch behavior |
| AC-03 | Project and editor surfaces read as Advanced Studio / fine-tuning workspaces rather than primary campaign entry points | Frontend build + targeted copy review | `ProjectList` and `EditorWorkbench` copy changes make their advanced role obvious while keeping the same routes and handlers |

## Engineering Criteria

- Keep all route targets, query params, session-storage keys, and project-management handlers unchanged.
- Prefer message-key and presentational updates over architectural churn.
- Do not add a second mission-control schema or alter the knowledge-aware handoff chain.

## Risk Matrix

| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Handoff regression | CTA or wrapper changes accidentally alter editor launch behavior | Campaign -> Editor context can be lost | Keep `onLaunchEditor` and all storage keys untouched | Builder |
| Deep-link regression | Project/editor labels tempt a route refactor | Existing bookmarks and auto-open behavior break | Restrict this batch to copy and visual hierarchy only | Orchestrator |
| Over-rebranding | Production project surfaces are renamed too aggressively | Model/UI mismatch confuses users | Reframe as advanced workspace, not as a new campaign object | Builder |

## Test Matrix

| Category | Cases |
|---|---|
| Happy path | Strategy card still launches the same editor route while showing the advanced-studio wording |
| Edge cases | Existing project cards and editor deep links keep the same handlers and query parameters |
| Error path | No new runtime branch or async path added in this slice |
| Regression | Existing locale assertions, frontend build, and mission-control route behavior stay intact |

## Source Files To Inspect First

- h5-video-tool/src/components/campaign/CampaignStrategyCard.tsx
- h5-video-tool/src/pages/ProjectList.tsx
- h5-video-tool/src/pages/EditorWorkbench.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/src/i18n/locale.test.ts

## Delivery Artifacts

- `SESSION-ANCHOR.md`
- `planner-spec.md`
- `challenger-review.md`
- `builder-report.md`
- `verifier-report.md`
- `release-decision.md`
- `eval-result.json`

## Exit Rule

- Stop and re-confirm if the user now wants the nav groups or route structure changed.
- Stop and re-confirm if this batch needs to pull in feedback-loop or distribution behavior.
