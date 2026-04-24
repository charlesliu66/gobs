# 2026-04-24 Production Storyboard Rules Design

## 背景

当前高级制片的分镜数量与单镜头 `durationSec` 由 `/api/studio/storyboard-table` 一次性生成。现有链路存在两个问题：

1. 分镜时长主要依赖 LLM 自行判断，缺少明确的导演规则约束。
2. 当前提交即梦前仅做 `4-60s` 的粗粒度夹紧，和平台真实的 `4-15s` 约束不一致。

用户本次目标不是立即改造“即梦执行层”，而是先把现有本地 skill 中有价值的导演规则纳入 H5 的规则层，用于提升“分镜内容与时长本身的合理性”。

## 目标

建立一套可维护的“高级制片分镜规则层”，集中收编当前已确认可用的 skill 规则，并接入：

1. `storyboard-table` 生成阶段
2. `autoRefineShots` 二次校正阶段

首期目标聚焦于“分镜草稿更合理”，不改变当前前端展示结构，也不引入新的任务模型。

## 规则来源

### 1. `storyboard-studio`

用于提供叙事分镜规则：

- 镜头类型：特写、近景、中景、全景、远景、大全景
- 构图、光线、色调、运镜的描述粒度
- 基础时长建议：常规镜头一般在 `3-8s`

### 2. `video-director`

用于提供生成平台侧约束与节奏规则：

- 单段视频时长不应无限拉长
- 信息密度、动作复杂度、运镜复杂度与时长应匹配
- 快节奏短视频应避免无意义拖镜

### 3. 项目自定义规则

结合当前业务约束补充一层项目规则：

- 镜头时长优先落在 `4-15s` 的可执行区间
- `<4s` 的镜头在本阶段不做执行层合并，但应被标记为“候选合并型镜头”，并尽量在生成时避免大量出现
- `>15s` 的镜头在本阶段不做执行层拆分，但应被标记为“候选拆分型镜头”，并尽量在生成时避免大量出现
- 建立镜、空间展示镜可适度偏长
- 情绪反应镜、对白反打、快速动作补镜应偏短
- 镜头信息量越高、运镜越复杂、动作调度越多，推荐时长越长，但默认不应超过 15 秒

## 设计原则

### 1. 规则集中存放

不把 skill 规则硬编码散落在多个 prompt 字符串里，而是新增单独的 ruleset 模块。该模块对外输出：

- 文本化导演规则
- 时长约束与建议表
- 供生成阶段使用的提示片段
- 供 refine 阶段使用的校正提示片段

### 2. 先影响“生成”，再影响“修正”

首选在 `generateStoryboardTable(...)` 的输入上下文前增加规则说明，让 LLM 尽量一次生成更合理的分镜；同时在 `autoRefineShots` 里增加显式的时长合理性校正说明，作为第二道保险。

### 3. 不改现有数据结构

本次不新增 `executionSegments`、不修改 `ProductionShot` 类型、不改变前端展示的 `shots[]` 结构。这样可以在不触碰禁改文件的前提下完成接入。

### 4. 为第二阶段预留接口

本次 ruleset 中会显式记录“候选合并”“候选拆分”的判断口径，但不会立即实现多镜头合并提交或长镜头拆段提交。后续第二阶段可以在此基础上新增执行层映射。

## 注入位置

### A. `/api/studio/storyboard-table`

在路由层对输入 `story` / `productionDesign` / `extraNotes` 做增强，构造一段 `storyboardRulesContext` 并附加到传给 `generateStoryboardTable(...)` 的 `extraNotes` 中。

这样做的原因：

- `studioPipeline.ts` 属于禁改文件，不能直接改底层 prompt
- `generateStoryboardTable(...)` 已支持 `extraNotes`
- 在路由层拼接规则上下文可实现低侵入接入

### B. `autoRefineShots`

扩展当前 `BATCH_REFINE_SYSTEM` 的职责，使其除了修正文生图/视频 prompt 结构外，也显式检查：

- shot 是否过碎
- 时长是否和镜头类型匹配
- 是否存在明显的 `<4s` / `>15s` 不合理项
- 对于候选问题镜头，只在当前 shot 上做保守修正，不改变 shot 数量

## 规则层结构

建议新增文件：

- `h5-video-tool-api/src/services/productionStoryboardRules.ts`

对外暴露以下接口：

- `getProductionStoryboardRuleset()`
- `buildStoryboardGenerationRulesContext(options?)`
- `buildStoryboardRefineRulesContext(options?)`

其中 ruleset 内部包含：

- `durationBands`
- `shotTypeHeuristics`
- `platformConstraints`
- `mergeSplitGuidance`
- `generationPromptBlock`
- `refinePromptBlock`

## 时长建议基线

首版先用规则表而非复杂打分器：

| 镜头类型 | 建议时长 |
|---|---|
| 建立镜 / 大全景 / 场景交代镜 | `4-6s` |
| 中景叙事镜 / 常规动作镜 | `4-8s` |
| 复杂调度镜 / 多动作信息镜 | `6-10s` |
| 强情绪停留镜 / 重要展示镜 | `5-8s` |
| 快速反应镜 / 补充镜 / 过渡镜 | `4-5s` |
| 极端复杂长镜头 | `8-15s`，默认不超过 `15s` |

附加校正规则：

- 如果描述中同时包含多个动作阶段、多个机位变化或明显的情节转折，优先延长至 `6-10s`
- 如果镜头仅承担“补充反应”或“短促过渡”，尽量压到 `4-5s`
- 如果单镜头需要完整承载“进入场景 + 互动 + 转折 + 离开”这类多阶段事件，提示模型拆成多个 narrative shots

## 非目标

本次明确不做：

1. 即梦执行层的自动合并 `<4s` 镜头
2. 即梦执行层的自动拆分 `>15s` 镜头
3. 前端 UI 上新增“执行镜头”展示
4. 修改底层 `studioPipeline.ts`
5. 修改批量任务模型 `one shot = one batch job`

## 验收标准

### 功能

1. 分镜生成请求会自动附带一段统一的导演规则上下文
2. auto-refine 阶段会显式检查时长合理性
3. 不改前端接口协议

### 结果

1. 新生成分镜中的 `durationSec` 更稳定地落在 `4-15s`
2. 明显的 `1s` / `18s+` 镜头显著减少
3. 镜头内容与时长的匹配度提升

### 工程

1. 不触碰禁改文件
2. 后端 `tsc --noEmit` 通过
3. 前端构建通过
4. staging 验证通过后再发 prod

