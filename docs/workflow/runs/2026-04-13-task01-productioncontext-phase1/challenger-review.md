# Challenger Review — TASK-01 ProductionContext Phase 1

## Findings

### P1 — must-fix-before-build
1. **上下文最小闭包必须完整**
   - `StepStoryboardWorkspace` 若去除 `selectedShotIdx`/`patchShot`/`setStep` props，Context 必须同时提供这三类能力，不能只提供其一。
2. **Provider 边界必须明确**
   - 任何消费 `useProductionContext()` 的组件都必须在 `ProductionWizard` Provider 内渲染，避免运行时异常。

### P2 — should-fix-in-plan
1. **避免把所有状态一口气塞入 Context**
   - 本轮只迁移高频跨层动作，保持可回滚。
2. **保持受控模式**
   - Context 先承载 value 分发，不改变源状态归属，降低迁移风险。

## Required Plan Changes
- C1: 明确 context 字段至少覆盖：`setStep`、`setLightboxSrc`、`selectedShotIdx`、`setSelectedShotIdx`、`patchShot`。
- C2: `StepExportWorkspace` 的 step 回退改为 context，不再从父组件传 `onBackToStoryboard`。
- C3: Build 后必须附带构建与 lint 证据。

## Gate 1.5 Decision
- **PASS（可进入 Gate 2）**

