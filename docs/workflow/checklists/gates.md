# Gate Checklist

- Gate 1 Planner: 范围、AC、风险、测试矩阵齐全
- Gate 1.5 Challenger: must-fix 清零
- Gate 2 Builder: AC 映射、自测证据、风险说明
- Gate 3 Verifier: 六类验证覆盖
- Gate 4 Fix Loop: P0/P1 必须归零
- Gate 5 Delivery: GO/NO-GO + 边界 + 风险
# Gate Checklist (Mandatory)

Use this checklist in every workflow run.

## Gate 1 - Planning

- [ ] `planner-spec.md` exists and follows contract
- [ ] Goal and scope are explicit
- [ ] Out-of-scope is explicit
- [ ] Acceptance criteria are testable
- [ ] Risks and mitigation are listed
- [ ] Test matrix is complete

If any item is unchecked: stop and return to Planner.

## Gate 1.5 - Challenge Planning

- [ ] `challenger-review.md` exists and follows contract
- [ ] Feasibility challenges are reviewed
- [ ] Goal-effectiveness challenges are reviewed
- [ ] UX and operability challenges are reviewed
- [ ] Testing-sufficiency challenges are reviewed
- [ ] No unresolved `must-fix-before-build` items

If any item is unchecked: stop and return to Planner + Challenger loop.

## Gate 2 - Build

- [ ] `builder-report.md` exists and follows contract
- [ ] All implemented work maps to acceptance criteria IDs
- [ ] Self-test evidence is included
- [ ] Not-implemented list is explicit
- [ ] Known risks are explicit

If any item is unchecked: stop and return to Builder.

## Gate 3 - Verify

- [ ] `verifier-report.md` exists and follows contract
- [ ] Happy path validation completed
- [ ] Edge case validation completed
- [ ] Loading/empty/error states validated
- [ ] Regression validation completed
- [ ] Stress/stability validation completed
- [ ] Race/concurrency validation completed
- [ ] Defect list includes repro steps and severity

If any item is unchecked: stop and return to Verifier.

## Gate 4 - Fix Loop

- [ ] All P0 defects fixed and re-verified
- [ ] All P1 defects fixed and re-verified
- [ ] Remaining P2/P3 risks are documented
- [ ] Integrator reviewed fix order and status

If any item is unchecked: stop and return to Builder + Verifier loop.

## Gate 5 - Delivery

- [ ] `release-decision.md` exists and follows contract
- [ ] GO/NO-GO is explicit
- [ ] Blocking issues are explicit
- [ ] Accepted risks are explicit
- [ ] Release boundaries are explicit

Only if all items are checked can this run be marked deliverable.
