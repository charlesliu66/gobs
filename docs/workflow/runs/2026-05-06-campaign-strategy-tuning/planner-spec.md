# Planner Spec: Campaign Strategy Tuning

## North Star

> `Campaign Creative Agent` 必须从 campaign brief 出发，稳定产出创意素材或变体，并把它们送入分发。

本 run 仍然只在 `strategy` 这一层深化，不进入 `variant production`。目标是让 strategy 从“静态结果”变成“可轻量调参的规划对象”。

## Background

上一轮 `campaign-strategy-productization` 已经把 strategy 变成稳定对象，并贯通到了 Editor 与后端 prompt 链路。但当前用户仍然有一个明显落差：

- strategy 生成之后，只能“接受”这张卡片，不能围绕几个关键维度轻量调整
- 如果想换 hook、换 CTA、换主卖点，只能回去改完整 brief，成本偏高
- strategy 虽然已经是对象，但还缺少“策略调节层”

因此本 run 的重点是补一个最小可用的 tuning layer。

## User Problems

1. 市场同学希望保留同一份 brief，只调 strategy 的方向，而不是重新写一遍。
2. 用户想比较“同样 brief 下，不同 hook/CTA 风格会怎么变”，但还不需要正式的 Variant Pack。
3. Editor handoff 应该接到调参后的 strategy，而不是初次生成时的老版本。

## Scope

### In Scope

- 为 strategy 增加轻量调参状态
- 支持结构化调整 `hook 方向 / 卖点重心 / CTA 类型`
- 让 Campaign Creative 页面上的 strategy card 随调参刷新
- 保证 handoff 到 Editor 的仍然是调参后的 strategy

### Out of Scope

- Variant Pack 生成
- 变体对比面板
- publish feedback / attribution
- 首页/导航改动
- 服务端持久化

## Module Breakdown

### Module A: Strategy Tuning Model

Responsibilities:

- 定义 strategy tuning state
- 把 tuning state 映射回 strategy object

Primary files:

- `h5-video-tool/src/components/campaign/model.ts`
- `h5-video-tool/src/components/campaign/strategy.ts`

### Module B: Campaign Tuning UI

Responsibilities:

- 在 Campaign Creative 页面上增加调参控件
- 让 strategy card 实时反映调参结果

Primary files:

- `h5-video-tool/src/pages/CampaignCreative.tsx`
- `h5-video-tool/src/components/campaign/`
- `h5-video-tool/src/api/editorCreative.ts`
- `h5-video-tool/src/i18n/messages.ts`

### Module C: Handoff Consistency

Responsibilities:

- handoff richer tuned strategy
- Editor 侧继续显示并消费调参后的 strategy

Primary files:

- `h5-video-tool/src/editor/utils/editorCreativeBrief.ts`
- `h5-video-tool/src/pages/EditorWorkbench.tsx`
- `h5-video-tool/src/editor/components/AgentPanel.tsx`
- `h5-video-tool-api/src/services/editorCreativeBrief.ts`
- `h5-video-tool-api/src/services/editorAgentService.ts`
- `h5-video-tool-api/src/routes/editorAgent.ts`

## Functional Decisions

| Capability | Decision | Reason |
|---|---|---|
| Hook tuning | 先支持 3 种方向：`benefit-first`、`conflict-first`、`story-first` | 这是最小又足够有感知差异的一组 |
| Selling point tuning | 从当前 brief 的 `sellingPoints` 中选择主卖点重心 | 不引入新的自由输入复杂度 |
| CTA tuning | 支持在结构化 `ctaType` 之间切换 | 保留 object 化思路，而不是仅改文案 |
| Apply behavior | 调参后立即刷新 strategy | 当前生成逻辑是本地同步计算，没必要再加“提交”门槛 |
| Editor behavior | Editor 只消费调参后的结果，不新增复杂编辑器面板 | 继续控制范围 |

## Acceptance Criteria

| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | strategy 生成后可调 `hook 方向 / 卖点重心 / CTA 类型` | Manual UI verification | 页面上存在清晰可用的 tuning controls |
| AC-02 | 调整控件会真实改变 strategy card | Manual UI verification | `recommendedHook / tone / angle / CTA / rationale` 至少部分会随调参变化 |
| AC-03 | handoff 到 Editor 的是调参后的 strategy | Manual flow verification | 进入 Editor 后看到的 strategy 摘要与调参后版本一致 |
| AC-04 | 本地构建与目标测试通过 | Mechanical verification | frontend build、backend typecheck、targeted tests 通过 |

## Risk Matrix

| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Tuning becomes fake UI | 控件变化但 strategy 对象不变 | 用户不信任产品 | 所有 tuning 都必须进入 `buildStrategyFromBrief` 结果 | Builder |
| Tuning scope drifts into variants | 想顺手做多版本比较 | run 失焦 | 本 run 不出现 A/B/C 结果或 comparison board | Planner |
| CTA copy becomes confusing | `ctaType` 改了但展示还是原始内部枚举 | 策略可读性变差 | 用用户可读 label 映射展示 `ctaType` | Builder |
| Editor sees stale strategy | handoff 沿用旧 strategy | 上下游不一致 | handoff payload 始终使用当前 strategy state | Verifier |

## Test Matrix

| Category | Cases |
|---|---|
| Happy path | 生成 strategy -> 切换 hook 方向 -> 切换卖点 -> 切换 CTA 类型 -> 进入 Editor |
| State consistency | 同一 brief 下多次调参，strategy card 与 handoff 始终同步 |
| Empty state | 未生成 strategy 时不显示 tuning panel |
| Regression | 原本的 `Campaign Creative -> Editor` handoff 继续工作 |
| Build | `h5-video-tool-api` typecheck、`h5-video-tool` build、targeted tests 通过 |

## Delivery Artifacts

- Code changes for strategy tuning model and UI
- Updated run artifacts
- Updated `PRODUCT.md`
- Updated `CHANGELOG.md`
