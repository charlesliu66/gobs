# Planner Spec — TASK-01 ProductionContext Phase 1

## Goal
- 引入 `ProductionContext` 并在 Step3/Step4 工作区中消费，减少 `ProductionWizard.tsx` 的跨层 props 传递，为后续 reducer 化做铺垫。

## In Scope
- 新建 `src/studio/ProductionContext.tsx`（提供 Provider + hook）。
- 将 Step3 `StepStoryboardWorkspace` 的部分动作改为从 Context 获取（如 lightbox、step 跳转、shot 选择/patch）。
- 将 Step4 `StepExportWorkspace` 的“返回分镜”动作改为从 Context 获取。
- 维持现有业务逻辑与 UI 行为不变。

## Out of Scope
- 本轮不把全部状态迁移到 Context 内部管理（先采用受控 value 注入）。
- 本轮不引入 `useReducer` 全量重写。
- 不改后端 API 与数据结构。

## Acceptance Criteria
- AC-01: 存在 `ProductionContext.tsx`，并在 `ProductionWizard.tsx` 中启用 Provider。
- AC-02: `StepStoryboardWorkspace` 至少 3 个原有 props 改为 Context 获取。
- AC-03: `StepExportWorkspace` 的回退 step 动作改为 Context 获取。
- AC-04: 前端 `npm run build` 通过。
- AC-05: 改动文件 `ReadLints` 无新增问题。

## Risks
- R1 (P1): Context 字段遗漏导致运行时抛错（hook 在 provider 外）。
- R2 (P1): Step3 patch/selectedShotIdx 绑定错位导致编辑写入错误镜头。
- R3 (P2): 类型定义循环依赖或接口过宽导致可维护性变差。

## Approach
- 先定义最小上下文字段（step、lightbox、shot 选择/patch）。
- 在 `ProductionWizard.tsx` 组装 context value 并包裹 Shell。
- 最后迁移 `StepStoryboardWorkspace` / `StepExportWorkspace` 读取 context，精简 props。

## Test Matrix
- T1 / AC-01: 检查 `ProductionContext.tsx` + `ProductionWizard.tsx` Provider 挂载。
- T2 / AC-02: 检查 `StepStoryboardWorkspace` props 减少且使用 `useProductionContext()`。
- T3 / AC-03: 检查 `StepExportWorkspace` 使用 context 执行 `setStep(3)`。
- T4 / AC-04: 执行 `npm run build`。
- T5 / AC-05: 对改动文件执行 `ReadLints`。

