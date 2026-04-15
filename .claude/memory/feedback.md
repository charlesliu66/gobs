---
name: AI 行为规则与教训
description: 从实际开发中积累的 AI 行为矫正规则，避免重蹈覆辙
type: feedback
---

## 规则 1: 禁止修改后端底层服务文件

不能改 dreaminaVideo.ts、klingVideo.ts、veoPython.ts、studioPipeline.ts、productionTypes.ts、productionAssets.ts。

**Why:** 这些文件是稳定的底层实现，改动会引发连锁故障，且很难在没有真实 API 密钥的情况下验证。
**How to apply:** 任何任务开始前先确认改动范围不涉及上述文件。如果需求必须改这些文件，先停下来询问用户。

## 规则 2: npm run build 必须零错误

每个任务完成后必须跑 `npm run build`（后端）和 `npm run build`（前端）。

**Why:** TypeScript 编译错误在生产环境会导致服务启动失败。
**How to apply:** 在 builder-report.md 中必须包含 build 成功的截图或输出摘要。

## 规则 3: 不硬编码 API Key

任何 API Key、密码、Token 都只能放在 .env 文件中，绝不能出现在源码里。

**Why:** 硬编码密钥一旦提交会永久留在 git 历史中，即使后续删除也会被扫描工具检出。
**How to apply:** 遇到需要密钥的地方，先检查 .env.example，按格式添加占位符，在代码中用 process.env.XXX 读取。

## 规则 4: 不在没有 planner-spec 的情况下开始 build

4+1 工作流中，Gate 1（Planner）必须先过。

**Why:** 没有明确 AC 的 build 容易跑偏，验证时无法对照。
**How to apply:** 每次新任务开始前检查 docs/workflow/runs/<run-id>/planner-spec.md 是否存在。

## 规则 5: 每次改动后必须更新 PRODUCT.md

任何功能新增、Bug 修复、性能优化，完成后必须在 PRODUCT.md 的 Changelog 中补一条记录（版本号递增，日期正确，内容简明）。

**Why:** PRODUCT.md 是产品历史的唯一真实记录，漏记会导致功能溯源困难，也违背三端一统的精神（文档也是产物的一部分）。
**How to apply:** 完成代码改动、三端同步之后，最后一步是打开 PRODUCT.md，在 Changelog 最顶部追加新版本条目，格式参照已有条目（`### vX.Y — YYYY-MM-DD`）。
