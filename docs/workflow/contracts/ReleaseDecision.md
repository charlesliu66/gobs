# ReleaseDecision 合同

- GO / NO-GO
- 阻塞项
- 接受风险
- 发布边界
- 下一步动作
# ReleaseDecision Contract (Integrator)

Use this exact structure for Integrator output.

```markdown
# ReleaseDecision - <feature-name>

## 1) Inputs Reviewed
- PlannerSpec:
- BuilderReport:
- VerifierReport:
- Additional evidence:

## 2) Delivery Decision
- Decision: GO / NO-GO
- Decision time:
- Decision owner:

## 3) Blocking Issues
| ID | Severity | Description | Owner | Required before release |
|---|---|---|---|---|
| ... | P0/P1 | ... | ... | Yes |

## 4) Accepted Risks
| Risk | Severity | Why accepted | Boundary/Workaround | Follow-up date |
|---|---|---|---|---|
| ... | P2/P3 | ... | ... | ... |

## 5) Scope Compliance
- Delivered in scope: Yes/No
- Out-of-scope changes found: Yes/No
- Notes:

## 6) Release Boundary
- What is guaranteed:
- What is not guaranteed:
- Environments validated:

## 7) Next Actions
1. ...
2. ...
3. ...
```
