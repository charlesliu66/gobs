# 2026-05-06 Campaign Variant Pack MVP Implementation Plan

## 1. Goal
在现有 `Campaign Brief -> Strategy -> Editor handoff` 主链路上，新增一个位于 `Strategy` 之后的 `Variant Pack` 层。该层负责把一份 strategy 扩展成 3 个可比较、可交接、可继续编辑的创意变体，而不是直接进入单条剪辑执行。

短版北极星：

`Campaign Creative Agent` 必须从 campaign brief 出发，稳定产出创意素材或变体，并把它们送入分发。

本 run 的范围只覆盖其中的 `brief -> strategy -> 3 variant pack -> Editor handoff`。

## 2. Product Shape
MVP 首版固定输出 3 个 variant，每个 variant 都必须显式回答下面 4 个问题：

- 这条片子的开场钩子是什么
- 它主打哪个 selling point
- 它希望用户做什么 CTA
- 它和另外两条有什么差异

首版不做自动出三条完整视频，只做结构化的变体包。

## 3. Data Objects
建议新增两个对象：

### `CampaignCreativeVariant`
- `variantId`
- `variantPackId`
- `briefId`
- `strategyId`
- `title`
- `hook`
- `openingBeat`
- `sellingPointFocus`
- `cta`
- `ctaType`
- `editingDirection`
- `assetSuggestion`
- `differenceSummary`
- `isRecommended`

### `CampaignCreativeVariantPack`
- `variantPackId`
- `briefId`
- `strategyId`
- `mode`
- `summary`
- `comparisonAxes`
- `variants`
- `selectedVariantId`

同时扩展 handoff payload，让 Editor 可以接收到：

- `brief`
- `strategy`
- `variantPack`
- `selectedVariant`

## 4. Build Order
### Step 1: Pure generator and types
- 在 `campaign/model.ts` 里补 variant/pack 类型。
- 在 `campaign/strategy.ts` 里新增 pack generator。
- 先用纯函数把 3 个 variant 生成出来，并保证差异稳定。

### Step 2: Campaign page UI
- 在 `CampaignCreative.tsx` 里增加 `variantPack` 和 `selectedVariantId` 状态。
- 调参重算 strategy 时，同步重算 pack。
- 把 `CampaignStrategyCard` 扩展成“上半区 shared strategy，下半区 variant comparison”。

### Step 3: Editor handoff
- `handleLaunchEditor` 改成基于当前选中 variant 发起 handoff。
- `EditorWorkbench` 正常恢复 variant payload。
- `AgentPanel` 显示最小 variant 摘要，首次 apply 时优先消费该 variant。

### Step 4: Tests and verification
- 前端纯函数测试覆盖 pack 生成。
- 后端/editor creative brief 测试覆盖 variant handoff 兼容。
- 最后跑 build、tsc、eval 和 workflow guard。

## 5. Variant Design Constraints
3 个 variant 的差异轴固定如下：

- Variant A: hook 差异优先
- Variant B: selling-point 重心差异优先
- Variant C: CTA / editing direction 差异优先

这样可以让 pack 首次输出时天然适合“创意测试包”语境，而不是随机改几句话。

## 6. Acceptance Focus
这轮实现完成后，至少要满足：

1. 一份 strategy 会生成 3 个结构完整的 variant。
2. 页面上能看出 3 个 variant 的差异，而不是只有名字不同。
3. 用户可以从任意 variant 进入 Editor。
4. Editor 首次执行能拿到选中 variant 的上下文。
5. 没有 variant 的旧 handoff 仍然可用。

## 7. Out of Scope
- 自动生成三条 timeline 或最终视频
- 投放回流和反馈映射
- 多平台分发
- 超过 3 个 variant 的动态配置
