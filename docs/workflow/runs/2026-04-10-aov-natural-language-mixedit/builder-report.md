# Builder Report - AOV 自然语言混剪适配

状态：`in-progress (Gate 2 第一轮完成)`

## AC 到实现映射

- AC-01（规则包版本化）  
  已实现：`h5-video-tool-api/src/services/aovRulesetService.ts`  
  - AOV 规则包读取、发布、版本列表、回滚  
  - 持久化目录：`<API_DATA_DIR>/.data/remix-rules/aov/`
- AC-03（自然语言 -> DSL，含冲突仲裁）  
  已实现：`h5-video-tool-api/src/services/aovDslPlanner.ts`  
  - 时长/画幅/模式/事件/风格解析  
  - 硬约束（时长、画幅）+ 软约束（短时长事件收敛）+ 失败兜底
- AC-05（可解释 trace）  
  已实现：`buildAovDslPlan()` 输出 `trace`、`warnings`
- AC-07（无明确事件不崩溃）  
  已实现：当 mustEvents 为空时按规则权重自动补齐并输出 warning

## must-fix-before-build 关闭情况（来自 Challenger）

- PR-01 事件标注规范与基准数据集  
  已落地第一版：`GET /api/remix/aov/benchmark-template?count=50`  
  可生成 50 条标注模板用于真值集构建
- PR-02 DSL 约束冲突仲裁表  
  已落地：`aovDslPlanner.ts` 的 `resolveConflict()`
- PR-03 规则包发布/回滚 runbook  
  已落地 API：  
  - `GET /api/remix/aov/rules`  
  - `GET /api/remix/aov/rules/versions`  
  - `POST /api/remix/aov/rules/publish`  
  - `POST /api/remix/aov/rules/rollback`

## 新增接口（Builder 输出）

- `POST /api/remix/aov/plan`：自然语言生成 AOV 混剪 DSL 计划
- `GET /api/remix/aov/benchmark-template`：生成标注模板
- `GET /api/remix/aov/rules`：当前生效规则
- `GET /api/remix/aov/rules/versions`：规则版本信息
- `POST /api/remix/aov/rules/publish`：发布规则
- `POST /api/remix/aov/rules/rollback`：回滚规则

## 链路接入

- `editorAgentService` 已接入 AOV 规划：  
  当消息命中 AOV 请求时，自动注入 DSL 约束给剪辑模型（时长/结构/mustEvents/style/rulesetVersion）。

## 自测证据

- 后端构建：`npm run build`（通过）
- 前端构建：`npm run build`（通过）
- Lints（改动文件）：无错误

## 未实现项

- AC-02：真实视频事件识别准确率闭环（目前是规则与关键词驱动，未接完整视觉分类评测）
- AC-04：9:16/16:9 成片质量对比自动化测试（仅具备规则与接口层）
- AC-06：三种模板产出在 UI 中的一键切换工作流（后续需要前端页接入）

## 已知风险

- OCR/HUD 识别能力仍需与 AOV 实际录像样本迭代
- 英雄别名词典当前为种子词表，需要接入持续更新机制
