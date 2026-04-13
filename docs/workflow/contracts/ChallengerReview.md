# ChallengerReview 合同

- 按严重级别输出问题（must-fix/should-fix/accepted-with-risk）
- 每条问题包含：原因、风险、建议修正
- 给出 Gate 1.5 结论：Pass / Blocked
# ChallengerReview Contract

Use this exact structure for Challenger output.

```markdown
# ChallengerReview - <feature-name>

## 1) Inputs
- PlannerSpec file:
- Planner version/date:

## 2) Challenge Findings
| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Feasibility | must-fix-before-build | ... | ... | ... |

Area options:
- Feasibility
- GoalEffectiveness
- UX
- Operability
- Testability

Severity options:
- must-fix-before-build
- should-fix-in-plan
- accepted-with-risk

## 3) Plan Improvement Requests
- Request 1:
  - Planner section to update:
  - Expected revision:
- Request 2:
  - Planner section to update:
  - Expected revision:

## 4) Gate 1.5 Verdict
- Verdict: Pass / Fail
- Blocking item count:
- Notes:

## 5) Residual Risks Accepted for Build
- Risk:
  - Why accepted now:
  - Boundary:
  - Follow-up gate:
```
