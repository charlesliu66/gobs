# SESSION-ANCHOR - 2026-05-10-window-b-video-validation-prep

## Run Summary

- Run ID: 2026-05-10-window-b-video-validation-prep
- Goal: Prepare Window B validation samples and governance plan without runtime code changes until Run 0 contracts land
- Owner: codex-window-b
- Branch or commit context: codex/2026-05-10-window-b-video-validation-prep@28d5a07
- Last updated: 2026-05-10

## Acceptance Criteria Snapshot

- AC-01: Window B scope maps Run 3 and Run 5-12 dependencies, start gates, and blocked code boundaries.
- AC-02: Story video, Motion Transfer, and Character Showcase validation sample templates are documented with quality labels, feedback tags, and exit criteria.
- AC-03: SESSION-ANCHOR limits Builder ownership to workflow docs and validation sample docs, excluding runtime frontend/backend code.

## Editable Files (Builder Ownership)

- docs/plans/2026-05-10-gobs-next-optimization-checklist.md
- docs/plans/2026-05-10-window-b-video-validation-governance.md
- docs/plans/2026-05-10-story-video-quality-samples.md
- docs/plans/2026-05-10-motion-transfer-validation.md
- docs/plans/2026-05-10-character-showcase-validation.md
- docs/workflow/runs/2026-05-10-window-b-video-validation-prep

## Read-Only References

- AGENTS.md
- .claude/memory/feedback.md
- docs/TASK-INDEX.md
- docs/DOCS-INDEX.md

## Additional Forbidden Paths

- h5-video-tool/src
- h5-video-tool-api/src
- h5-video-tool/src/campaign/components/CampaignOutputWorkbench.tsx
- h5-video-tool-api/src/routes/campaignOutputPlans.ts
- h5-video-tool-api/src/routes/campaignDistributionPackages.ts
- scripts/deploy_all.py
- scripts/deploy_api.py
- scripts/deploy_frontend.py
- scripts/mark_release_ready.py
- scripts/set_deployment_state.py

## Out of Scope

- Runtime frontend or backend code changes before Run 0 contracts are complete.
- CampaignOutputWorkbench, campaignOutputPlans, and campaignDistributionPackages changes.
- Any provider service change, especially AGENTS.md forbidden files.
- Deployment, staging, prod, release-ready marking, or server smoke checks.
- Real Motion Transfer / Character Showcase capability conclusion without observed sample outputs.

## Progress Checklist

- [x] Planner approved
- [x] Challenger approved
- [x] Builder self-test recorded
- [x] Verifier P0/P1 count is zero
- [x] Release decision written

## Escalation Rules

- Escalate if Window B needs to write runtime code before Run 0 contracts are merged.
- Escalate if any work requires `CampaignOutputWorkbench.tsx`, `campaignOutputPlans.ts`, or `campaignDistributionPackages.ts`.
- Escalate if a validation conclusion is requested without observed generated outputs.
- Escalate before any staging/prod deployment action.
