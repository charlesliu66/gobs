# Verifier Report - AOV 自然语言混剪适配

状态：`pass (Gate 3)`

## Pass 列表

- 构建验证：后端 `npm run build` 通过
- 构建验证：前端 `npm run build` 通过
- 改动文件 lint：无错误
- Happy path：`POST /api/remix/aov/plan` 可返回 DSL（duration/aspect/mustEvents/trace/warnings）
- Operability：`publish -> versions -> rollback` 全流程可用
- 数据集模板：`GET /api/remix/aov/benchmark-template?count=50` 返回 50 条样本模板
- Regression：非 AOV 请求（`forceAov=false`）命中预期 400 拒绝
- Concurrency：并发 6 路 AOV 规划均成功

## Fail 列表

当前未发现 P0/P1/P2 级失败项（基于本轮接口级验证）。

## 测试证据摘要

- 登录成功，获取 token 后调用 AOV 接口；
- 规划结果：`duration=15`, `aspect=9:16`, `mustEvents=dark_slayer,multi_kill`；
- 版本流转：`aov-rules-v1 -> aov-rules-v1-gate3 -> rollback aov-rules-v1`；
- 并发结果：6/6 成功。

## 残余风险（P2）

- 事件识别准确率尚未基于真实标注集出量化报告（当前为规则+词典驱动）。
- AOV 英雄别名与版本术语仍需持续更新机制。
