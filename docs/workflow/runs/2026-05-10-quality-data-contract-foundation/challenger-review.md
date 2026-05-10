# ChallengerReview - 2026-05-10-quality-data-contract-foundation

## 1) Inputs
- PlannerSpec file: `docs/workflow/runs/2026-05-10-quality-data-contract-foundation/planner-spec.md`
- Planner version/date: 2026-05-10T07:22:00Z
- Source checklist: `docs/plans/2026-05-10-gobs-next-optimization-checklist.md`
- User concurrency constraints: Window A must not touch `CampaignOutputWorkbench.tsx`, `campaignOutputPlans.ts`, or `campaignDistributionPackages.ts`; Window B remains docs/sample-only until Run 0 types land.

## 2) Challenge Findings
| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Scope | must-fix-before-build | Planner must prevent shared file edits while Window B is active. | Concurrent changes to Workbench or package routes would create merge conflicts and unstable contracts. | Keep those paths in SESSION-ANCHOR forbidden list and do not add imports from them. |
| C-002 | Product | must-fix-before-build | Rubric must not imply automatic video understanding. | Run 0 is a deterministic foundation, not a diagnosis engine. | Use human/operator-visible signals only and document this boundary. |
| C-003 | Data | should-fix-in-build | Contract validation should return structured issues instead of a boolean only. | Later runs need to explain what relationship is broken. | Export a validation helper with entity/id/relation/message fields. |
| C-004 | Compatibility | should-fix-in-build | Checklist suggests `src/campaign/*`, but actual repo uses `src/components/campaign/*`. | Putting files in a nonexistent parallel tree would reduce discoverability. | Place new modules under `h5-video-tool/src/components/campaign/{quality,contracts}`. |

## 3) Plan Improvement Requests
- Request 1:
  - Planner section to update: `## 4) Technical Approach`
  - Expected revision: Explicitly state rubric inputs are deterministic and human-signal-only.
- Request 2:
  - Planner section to update: `## 2) Scope`
  - Expected revision: Name the forbidden shared Window B paths as out of scope.
- Request 3:
  - Planner section to update: `## 7) Test Matrix`
  - Expected revision: Cover invalid references and duplicate IDs, not just valid fixtures.

## 4) Gate 1.5 Verdict
- Verdict: Pass
- Blocking item count: 0
- Notes: C-001 and C-002 are addressed in the revised PlannerSpec and SESSION-ANCHOR. Builder may start within the listed editable scope.

## 5) Residual Risks Accepted for Build
- Risk: Existing uncommitted docs owned by another window may appear as workflow guard warnings.
  - Why accepted now: The worktree already contains the user-provided checklist and a Window B prep run; they are not Window A code edits.
  - Boundary: Do not stage or modify those unrelated files unless the user explicitly asks.
  - Follow-up gate: Verifier
- Risk: Run 1 and Run 2 may need small adapters after they consume these contracts.
  - Why accepted now: Run 0 intentionally avoids Workbench/backend route wiring.
  - Boundary: This run only guarantees types, fixtures, and deterministic validation helpers.
  - Follow-up gate: Run 1/Run 2 planner.
