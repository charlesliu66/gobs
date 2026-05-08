# SESSION-ANCHOR - 2026-05-08-campaign-output-workbench-game-source-assets

## Run Summary
- Run ID: 2026-05-08-campaign-output-workbench-game-source-assets
- Goal: Implement the Phase 1 Campaign Output Workbench with deterministic output plans, source asset readiness, persistence, and distribution handoff bridge.
- North Star: Campaign Creative Agent must start from campaign brief, produce creative assets/variants, and move them into distribution.
- Owner: codex
- Branch or commit context: codex/campaign-output-workbench-game-source-assets@4e315de
- Last updated: 2026-05-08T03:22:00Z

## Product Shape Guardrail

`Campaign Creative Agent` must start from campaign brief, produce creative assets or variants, and move them into distribution.

The default user surface after brief confirmation must show deliverables and required user confirmations, not internal model reasoning.

## Acceptance Criteria Snapshot
- AC-01: Confirmed campaign briefs create deterministic output plans with deliverables, source asset requirements, capability statuses, and capability gaps.
- AC-02: Campaign Creative shows the output workbench as the primary post-brief surface while System Plan, Strategy Card, and tuning remain secondary/advanced.
- AC-03: Output plans persist through backend APIs with owner scoping, validation, and exact-enough round-trip payloads for Workbench and verifier summaries.
- AC-04: Produced output items can bridge into distribution package drafts while blocked/unsupported items stay non-publishable and explain why.
- AC-05: Verification covers frontend output-plan rules, backend ownership/API rules, UI presence/integration, distribution intake, builds, workflow guard, staging/prod smoke.

## Editable Files (Builder Ownership)
- h5-video-tool/src/components/campaign/outputPlan.ts
- h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx
- h5-video-tool/src/api/campaignOutputPlan.ts
- h5-video-tool/src/pages/CampaignCreative.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/src/components/campaign/distributionPackage.ts
- h5-video-tool/src/components/distribution/packageToDistributeDraft.ts
- h5-video-tool/tests
- h5-video-tool-api/src/services/campaignOutputPlan.ts
- h5-video-tool-api/src/routes/campaignOutputPlan.ts
- h5-video-tool-api/src/index.ts
- h5-video-tool-api/tests
- PRODUCT.md
- CHANGELOG.md
- docs/TASK-INDEX.md
- docs/plans/README.md
- docs/workflow/runs/2026-05-08-campaign-output-workbench-game-source-assets

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-08-campaign-output-workbench-game-source-assets-design.md
- docs/plans/2026-05-08-campaign-output-workbench-game-source-assets-plan.md
- docs/workflow/runs/2026-05-07-campaign-to-distribution-handoff-mvp/SESSION-ANCHOR.md
- docs/workflow/runs/2026-05-07-campaign-to-distribution-handoff-mvp/planner-spec.md

## Additional Forbidden Paths
- h5-video-tool-api/src/services/dreaminaVideo.ts
- h5-video-tool-api/src/services/klingVideo.ts
- h5-video-tool-api/src/services/veoPython.ts
- h5-video-tool-api/src/services/studioPipeline.ts
- h5-video-tool-api/src/types/productionTypes.ts
- h5-video-tool-api/src/config/productionAssets.ts
- .env
- h5-video-tool-api/.env
- scripts/.env
- h5-video-tool-api/dreamina-login.json

## Out of Scope
- Reintroducing marketer-facing Knowledge Brain pack selectors, multi-project brain choosers, or the old expert brief form.
- Touching forbidden low-level generation services or production asset configuration.
- Real automatic publishing, scheduling engine work, analytics dashboards, or broad EditorWorkbench refactors.
- Phase 2 production adapter expansion beyond the safe bridge described in the plan.
- Asset Library metadata overhaul beyond source-asset requirement display and references.

## Progress Checklist
- [x] Planner approved
- [x] Challenger approved
- [x] Builder self-test recorded
- [x] Verifier P0/P1 count is zero
- [x] Release decision written

## Escalation Rules
- Escalate if a forbidden file must change.
- Escalate if a new env var is required.
- Escalate if acceptance criteria need to expand.
- Escalate before real prod release approval unless the user has already explicitly asked for direct three-end release in the current workstream.
