# Harnesswork 4+1 工作流

本目录用于执行严格的 4+1 交付闭环：

1. Gate 1: Planner
2. Gate 1.5: Challenger
3. Gate 2: Builder
4. Gate 3: Verifier
5. Gate 4: Fix Loop
6. Gate 5: Integrator

核心原则：未过关，不进入下一关。

每次需求在 `docs/workflow/runs/YYYY-MM-DD-<feature>/` 下落地 5 份必备文档：

- `planner-spec.md`
- `challenger-review.md`
- `builder-report.md`
- `verifier-report.md`
- `release-decision.md`
# Constrained Delivery Workflow (4+1)

This workflow enforces a gated delivery loop:

1. Planner (A) defines spec
2. Challenger (B) challenges the plan and forces improvements
3. Builder (C) implements strictly by approved spec
4. Verifier (D) validates, stress-tests, and finds defects
5. Integrator (E) closes the loop and decides release readiness

No role can skip gates.

---

## Directory Structure

- `docs/workflow/contracts/` - Structured output contracts for each role
- `docs/workflow/prompts/` - Prompt templates for each role
- `docs/workflow/checklists/` - Gate checklist and release rules
- `docs/workflow/runs/` - Per-run artifacts and reports

---

## Mandatory Gates

### Gate 1 - Planning

Required artifact: `PlannerSpec`

Pass conditions:
- Goal and scope are explicit
- Out-of-scope is explicit
- Acceptance criteria are testable
- Risks and test matrix are defined

### Gate 1.5 - Challenge Planning

Required artifact: `ChallengerReview`

Pass conditions:
- Feasibility challenges are addressed
- Effectiveness-to-goal challenges are addressed
- UX and operability gaps are addressed
- Testing sufficiency challenges are addressed
- No unresolved `must-fix-before-build`

### Gate 2 - Build

Required artifact: `BuilderReport`

Pass conditions:
- Every acceptance criterion is mapped to implementation
- Self-test is executed and recorded
- "Not implemented" list is explicit

### Gate 3 - Verify

Required artifact: `VerifierReport`

Pass conditions:
- Happy path, edge cases, error/loading/empty states are covered
- Regression checks are executed
- Stress or stability checks are executed
- Defects include repro steps and severity

### Gate 4 - Fix Loop

Pass conditions:
- All P0/P1 defects are resolved and re-verified
- Remaining P2/P3 risks are documented and accepted by Integrator

### Gate 5 - Delivery

Required artifact: `ReleaseDecision`

Pass conditions:
- GO or NO-GO is explicit
- Blocking issues are listed
- Accepted risks and boundaries are listed

---

## Severity Model

- `P0` - Security, data loss, or core flow unusable (must fix)
- `P1` - Core feature broken or high-probability failure (must fix)
- `P2` - Important but non-blocking, with workaround
- `P3` - Minor quality improvements

---

## How to Use for Each Feature

1. Create a run folder:
   - `docs/workflow/runs/YYYY-MM-DD-<feature-name>/`
2. Ask Planner to output `planner-spec.md` using contract template.
3. Ask Challenger to output `challenger-review.md` and force plan revision if needed.
4. Ask Builder to implement based on revised `planner-spec.md` and output `builder-report.md`.
5. Ask Verifier to validate and output `verifier-report.md`.
6. If defects exist, Builder fixes and Verifier re-checks until P0/P1 are zero.
7. Integrator writes `release-decision.md`.

If Gate 1 is missing, Builder must not start.

---

## Suggested Run Artifacts

For each run folder:

- `planner-spec.md`
- `challenger-review.md`
- `builder-report.md`
- `verifier-report.md`
- `defect-list.md` (optional if merged into verifier report)
- `release-decision.md`

Use the templates in this workflow directory to keep outputs consistent.
