# Planner Spec — TASK-INDEX 优化审计

## Goal
对 `docs/TASK-INDEX.md` 涉及的 TASK-01/02/03/04/05/06 做一次门禁审计，确认：
1) 已实现项是否与验收标准一致  
2) 是否存在遗漏或偏差  
3) 当前版本是否可判定为“任务全量完成”

## In Scope
- 代码证据审计（前后端关键文件与路由/Hook/状态管理）
- 构建验证（`h5-video-tool` 与 `h5-video-tool-api`）
- 按任务给出 Pass/Fail 与缺口列表
- 形成发布决策（GO/NO-GO）

## Out of Scope
- 不新增业务功能
- 不执行云端部署
- 不补写集成自动化测试框架

## Modules
- 前端：`StepVideo`、`ProductionWizard`、剪辑器持久化与撤销
- 后端：`video` 路由拆分、Dreamina 登录态检查、多用户数据隔离、editor projects
- 文档：`TASK-01` 到 `TASK-06` 验收标准对齐

## Approach
1. 读取 `TASK-INDEX` 与 6 个任务文档，提取验收标准。  
2. 用代码检索验证每个任务对应实现证据。  
3. 运行前后端构建验证可编译性。  
4. 逐任务判定状态（完成/部分完成/未开始），输出风险与优先级。

## Acceptance Criteria
- AC-A1: 能给出每个任务的明确状态与证据路径
- AC-A2: 能识别遗漏项并标注严重级别（P0-P3）
- AC-A3: 构建验证通过并纳入结论
- AC-A4: 给出明确 GO/NO-GO 发布决策

## Risk Register
- R1: 仅靠静态审计可能遗漏运行时行为问题（中风险）
- R2: 任务文档存在“阶段目标”与“最终目标”差异，可能导致判定歧义（中风险）
- R3: 当前工作区有大量并行改动，任务边界可能交叉（中风险）

## Test Matrix
- T1 文档一致性：任务文档与代码是否对齐（A1, A2）
- T2 前端构建：`npm run build`（A3）
- T3 后端构建：`npm run build`（A3）
- T4 发布判断：基于失败项数量与严重度输出 NO-GO/GO（A4）

