# BuilderReport 合同

- AC 对应实现清单
- 自测证据
- 未实现项
- 已知风险
# BuilderReport Contract

Use this exact structure for Builder output.

```markdown
# BuilderReport - <feature-name>

## 1) Inputs
- Spec file:
- Spec version/date:
- Acceptance criteria covered:

## 2) Implemented
| AC ID | What was implemented | Files changed | Notes |
|---|---|---|---|
| AC-01 | ... | ... | ... |

## 3) Not Implemented
| AC ID | Reason | Impact | Proposed next step |
|---|---|---|---|
| ... | ... | ... | ... |

## 4) Self-Test Results
| Test type | Command/Method | Result | Evidence |
|---|---|---|---|
| Unit | ... | Pass/Fail | ... |
| Integration | ... | Pass/Fail | ... |
| Manual | ... | Pass/Fail | ... |

## 5) Known Risks and Uncertainties
- Risk:
  - Why it remains:
  - Possible impact:
  - Suggested follow-up:

## 6) Scope Compliance Statement
- I did not expand scope beyond the approved PlannerSpec: Yes/No
- If No, list deviations and reasons:

## 7) Change Summary
- What changed:
- Why changed:
- What did not change:
```
