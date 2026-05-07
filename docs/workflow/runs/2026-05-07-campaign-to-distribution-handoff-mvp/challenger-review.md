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
| C-006 | Mission-first compatibility | must-keep | The updated planner now depends on the released mission-first Campaign Creative baseline, not the old `brief + selected knowledge packs` entry point. | Reintroducing pack selection or a full expert brief form would undo the simplification that this handoff is meant to extend. | Build only from confirmed generated brief + selected/recommended variant + backend-routed Gold and Glory context; add a regression check that the default Campaign page stays mission-first. |

## 3) Plan Improvement Requests

- Request 1: Keep `CampaignDistributionPackage` status minimal in this run: `draft`, `needs_review`, `approved`, `ready_to_distribute`, `rejected`.
- Request 2: Add tests before implementation for malformed package payloads, missing assets, and partial knowledge context.
- Request 3: Keep route naming campaign-specific, for example `/api/campaign-distribution/packages`, so the package seam does not get confused with GeeLark publish tasks.
- Request 4: If implementation discovers Distribution cannot safely prefill without a broad `TabDistribute` refactor, stop and split an intermediate `distribution-intake-seam` run.
- Request 5: Use the existing `assetDb.ts` SQLite database for V1 package persistence; avoid localStorage, ad hoc JSON files, or a new database dependency.
- Request 6: In `needs_asset` state, show explicit next actions rather than a dead-end missing-asset label.
- Request 7: Preserve mission/brief snapshot, generation source, and warnings in the package payload so Distribution can explain why this package exists and whether it came from LLM or fallback generation.

## 4) Gate 1.5 Verdict

- Verdict: Pass with should-fix items; mission-first addendum accepted
- Blocking item count: 0
- Build may start after the owner confirms the updated mission-first planner-spec.

## 5) Residual Risks Accepted for Build

- The package persistence layer may reveal existing ambiguity between asset path, video URL, and gallery item identity. Accepted for MVP only if direct publish remains blocked when the asset is not clearly ready.
- The first UI may be a compact embedded preview instead of a standalone Preview & Approve route. Accepted because the route can be introduced after real package data exists.
- Dashboard and navigation improvements remain valuable but must not be pulled into this run.
- The Campaign Creative UI may need a small handoff seam near the Variant Pack area, but it must not bring back Knowledge Brain selection or multi-project brain chooser in the default path.
