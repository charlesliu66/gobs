# 2026-04-24 Production Storyboard Rules Implementation Plan

## 范围

本计划落实“将导演 skill 规则纳入高级制片 H5 规则层”的第一阶段：

- 新增统一 ruleset 模块
- 接入 storyboard 生成阶段
- 接入 auto-refine 阶段
- 不实现执行层 merge/split

## 实施步骤

### 1. 新增 ruleset 模块

文件：

- `h5-video-tool-api/src/services/productionStoryboardRules.ts`

内容：

- 抽取基于 `storyboard-studio`、`video-director` 的导演规则
- 抽取项目自定义时长基线与 `4-15s` 平台约束
- 提供生成阶段和 refine 阶段可复用的 prompt block builder

完成标准：

- 模块输出是稳定字符串和结构化规则，不依赖运行时外部环境
- 代码注释只解释必要的设计意图

### 2. 接入 storyboard 生成阶段

文件：

- `h5-video-tool-api/src/routes/studio.ts`

改动：

- 引入 `buildStoryboardGenerationRulesContext`
- 在 `/storyboard-table` 中拼接 `extraNotes`
- 保持调用 `generateStoryboardTable(...)` 的方式不变，只增强输入

完成标准：

- 用户显式输入的 `extraNotes` 仍保留优先级
- 新规则上下文始终存在
- 空白 `extraNotes` 也能正常工作

### 3. 接入 auto-refine 阶段

文件：

- `h5-video-tool-api/src/routes/studio.ts`

改动：

- 用 ruleset 替换或扩展当前硬编码 `BATCH_REFINE_SYSTEM`
- 让 refine 同时关注 prompt 质量和 `durationSec` 合理性
- 在不改变 shot 数量的前提下，只修正当前 shot 的 `durationSec` 与描述一致性

完成标准：

- refine 输出协议保持兼容
- 现有 JSON patch 解析逻辑继续可用
- 即使 refine 失败，也能优雅回退到原始 shots

### 4. 本地验证

后端：

- `npm run build`
- `npx tsc --noEmit`

前端：

- `npm run build`

手工检查：

- 触发一次 `/api/studio/storyboard-table`
- 检查生成结果中是否仍出现明显大量 `<4s` / `>15s`

### 5. 文档与发布

文件：

- `PRODUCT.md`

改动：

- 在 Changelog 顶部补充本次规则层升级
- 在高级制片模块说明中更新“分镜规则层”能力

发布流程：

1. `git add` 仅本次相关文件
2. `git commit`
3. `git push origin main`
4. 部署 `staging`
5. 验证通过后执行 `mark_release_ready.py`
6. 部署 `prod`
7. 验证通过后恢复 `idle`

## 风险与应对

### 1. 规则注入过长，导致模型注意力分散

应对：

- ruleset 文案控制在高密度、短段落
- 只保留和 shot 数量、时长、镜头类型最相关的规则

### 2. refine 过度修改时长，造成用户预期漂移

应对：

- refine 只做保守修正
- 只修明显不合理值
- 不做 shot 数量增减

### 3. 受限于禁改文件，生成效果提升有限

应对：

- 先通过 `extraNotes` 方式低侵入接入
- 若效果不足，再在第二阶段评估允许的更深层接入方式

## 交付物

代码：

- `h5-video-tool-api/src/services/productionStoryboardRules.ts`
- `h5-video-tool-api/src/routes/studio.ts`
- `PRODUCT.md`

文档：

- `docs/plans/2026-04-24-production-storyboard-rules-design.md`
- `docs/plans/2026-04-24-production-storyboard-rules-implementation-plan.md`

