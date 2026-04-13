# VerifierReport 合同

- 通过项 / 失败项
- 失败项复现步骤
- 缺陷等级（P0-P3）
- 回归与稳定性结论
# VerifierReport Contract

Use this exact structure for Verifier output.

```markdown
# VerifierReport - <feature-name>

## 1) Validation Scope
- Spec file:
- Build report file:
- Version or commit under test:

## 2) Coverage Checklist
- Happy path: Covered/Not covered
- Edge cases: Covered/Not covered
- Loading state: Covered/Not covered
- Empty state: Covered/Not covered
- Error/failure path: Covered/Not covered
- Regression: Covered/Not covered
- Stress/Stability: Covered/Not covered
- Race/Concurrency: Covered/Not covered

## 3) Pass Items
| Area | Case | Result | Evidence |
|---|---|---|---|
| ... | ... | Pass | ... |

## 4) Failed Items (Defect List)
| Defect ID | Severity (P0-P3) | Title | Repro Steps | Expected | Actual | Suggested Fix Order |
|---|---|---|---|---|---|---|
| D-001 | P1 | ... | 1) ... 2) ... | ... | ... | 1 |

## 5) Stress and Stability Results
| Scenario | Load/Duration | Metric | Result | Risk |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## 6) Regression Result
- Full/targeted regression summary:
- New regressions found:

## 7) Final Verification Verdict
- Gate 3 status: Pass/Fail
- Gate 4 blocking defects (P0/P1): Count
- Release recommendation: GO / NO-GO
```
