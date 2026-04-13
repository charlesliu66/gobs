# PlannerSpec 合同

- 目标与业务价值
- 范围（In/Out）
- 模块拆分
- 技术方案
- 风险清单
- 验收标准（AC 编号）
- 测试矩阵（AC -> 测试）
# PlannerSpec Contract

Use this exact structure for Planner output.

```markdown
# PlannerSpec - <feature-name>

## 1) Project Goal
- Business goal:
- User value:
- Success metrics:

## 2) Scope
### In Scope
- ...

### Out of Scope
- ...

## 3) Module Breakdown
- Module A:
  - Responsibilities:
  - Dependencies:
- Module B:
  - Responsibilities:
  - Dependencies:

## 4) Technical Approach
- Architecture decisions:
- Data flow:
- API or interface changes:
- Migration or compatibility notes:

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | ... | ... | ... |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | ... |
| Edge cases | ... |
| Error path | ... |
| Regression | ... |
| Stress/Stability | ... |

## 8) Delivery Artifacts
- Code changes:
- Test evidence:
- Documents to update:
```
