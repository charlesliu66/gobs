# ChallengerReview - 2026-05-11-data-contract-hardening

## 1) Inputs
- PlannerSpec file: `docs/workflow/runs/2026-05-11-data-contract-hardening/planner-spec.md`
- Planner version/date: 2026-05-11T06:28:28Z

## 2) Challenge Findings
| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Legacy compatibility | should-fix-in-plan | Existing plans/packages will not have Run 9 lineage fields. | Over-strict validation would break normal reads/patches. | Keep new fields optional and reject only explicit mismatches. |
| C-002 | Restore path | should-fix-in-plan | Route state disappears on refresh and cross-device direct open. | Studio result writeback would lose package/output links. | Encode minimal handoff IDs in URL and rebuild from backend Output Plan. |
| C-003 | UI scope | should-fix-in-plan | A full contract graph dashboard would be too large for this run. | It could collide with main Campaign/Distribution UX. | Add compact health status plus issue details on existing surfaces only. |

## 3) Plan Improvement Requests
- Request 1:
  - Planner section to update: `## 4) Technical Approach`
  - Expected revision: State that payload extensions are optional JSON fields, not schema/table migrations.
- Request 2:
  - Planner section to update: `## 6) Acceptance Criteria`
  - Expected revision: Add explicit Studio refresh/direct-open restore acceptance.

## 4) Gate 1.5 Verdict
- Verdict: Pass
- Blocking item count: 0
- Notes: Build may start; planner now scopes lineage hardening without expanding into publish API attribution.

## 5) Residual Risks Accepted for Build
- Risk:
  - Why accepted now: GeeLark publish records do not yet accept Campaign Package lineage metadata.
  - Boundary: This run carries lineage through Package and active Distribution context only.
  - Follow-up gate: Verifier
