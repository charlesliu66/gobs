# Challenger Review - 2026-05-07-campaign-to-distribution-handoff-mvp

## 1) Inputs

- PlannerSpec file: `docs/workflow/runs/2026-05-07-campaign-to-distribution-handoff-mvp/planner-spec.md`
- Design file: `docs/plans/2026-05-07-campaign-to-distribution-handoff-mvp-design.md`
- Review date: 2026-05-07
- Review scope: Gate 1.5 pre-build challenge for the `Campaign Creative -> Distribution Handoff MVP` plan.

## 2) Challenge Findings

| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Scope | should-fix-in-build | The design describes Preview & Approve, Dashboard, IA, scheduling, and feedback writeback, but the run must implement only the package handoff MVP. | Builder could over-implement the roadmap instead of the first shippable slice. | Treat planner-spec `In Scope` as the implementation boundary; move all later phases to separate runs. |
| C-002 | Publish safety | must-keep | Package intake must not auto-select accounts or bypass final publish confirmation. | Distribution touches real social accounts, so convenience defaults can become operational risk. | Keep AC-04 as a blocking acceptance criterion and add a regression test. |
| C-003 | Editor stability | must-keep | The plan must not use EditorWorkbench slimming as permission for broad editor refactor. | Editor is large and fragile; unrelated timeline/export regressions would derail the campaign handoff goal. | Only touch shared handoff helpers if needed; do not edit timeline/export/media logic. |
| C-004 | Knowledge continuity | should-fix-in-build | The package contract must reuse landed knowledge-context names rather than inventing parallel fields. | Future Memory writeback depends on stable provenance and field names. | Add backend/frontend seam tests that assert knowledge context survives create/read/intake. |
| C-005 | Persistence | should-fix-in-build | The storage approach is intentionally lightweight, but it still needs deterministic ownership and cleanup behavior. | Pending packages should survive refresh without becoming a hidden localStorage-only feature. | Implement server-side persistence behind a small service/repository facade; avoid database migration. |

## 3) Plan Improvement Requests

- Request 1: Keep `CampaignDistributionPackage` status minimal in this run: `draft`, `needs_review`, `approved`, `ready_to_distribute`, `rejected`.
- Request 2: Add tests before implementation for malformed package payloads, missing assets, and partial knowledge context.
- Request 3: Keep route naming campaign-specific, for example `/api/campaign-distribution/packages`, so the package seam does not get confused with GeeLark publish tasks.
- Request 4: If implementation discovers Distribution cannot safely prefill without a broad `TabDistribute` refactor, stop and split an intermediate `distribution-intake-seam` run.

## 4) Gate 1.5 Verdict

- Verdict: Pass with should-fix items
- Blocking item count: 0
- Build may start after the owner confirms the planner-spec.

## 5) Residual Risks Accepted for Build

- The package persistence layer may reveal existing ambiguity between asset path, video URL, and gallery item identity. Accepted for MVP only if direct publish remains blocked when the asset is not clearly ready.
- The first UI may be a compact embedded preview instead of a standalone Preview & Approve route. Accepted because the route can be introduced after real package data exists.
- Dashboard and navigation improvements remain valuable but must not be pulled into this run.
