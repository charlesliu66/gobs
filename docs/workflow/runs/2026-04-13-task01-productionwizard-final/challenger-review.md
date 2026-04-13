# Challenger Review — TASK-01 ProductionWizard Final Sprint

## Findings

### P1 — must-fix-before-build
1. **Step 2 模态链路完整性风险**  
   - `CharacterPortraitEditorModal` 与 `ScenePropImageModal` 依赖当前页状态较多，若仅抽 UI 不抽回调，容易漏传 `onConfirm/onGenerate/onReset`。
2. **Step 2 Tab 回调风险**  
   - `characters/scenes/props/checklist` 四个分支都带副作用，必须保留原回调路径，不能重命名后遗漏。

### P2 — should-fix-in-plan
1. **类型边界清晰度**  
   - Workspace props 需要聚合类型，避免临时 `any`。
2. **可维护性**  
   - 优先抽“编排组件”，不在本轮继续细碎拆原子组件，防止 props 爆炸。

## Challenge Verdict
- **accepted-with-risk（附带前置约束）**

## Required Plan Changes Before Build
- C1: Step 2 抽离必须包含“tab 区 + 两个模态 + StepDesignActions”的完整编排，不拆半截。
- C2: Step 4 抽离为单独 Workspace，保持现有两个已拆组件组合关系不变。
- C3: Build 阶段必须提供 `npm run build` + `ReadLints` 证据。

## Gate 1.5 Decision
- **PASS（可进入 Gate 2）**  
  前提：严格执行 C1/C2/C3，不满足即回退修正。

