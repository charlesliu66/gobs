# Planner Spec: Campaign Strategy Productization

## North Star

> `Campaign Creative Agent` 必须从 campaign brief 出发，稳定产出创意素材或变体，并把它们送入分发。

本 run 是这条最终主链路中的第二段强化：把 `strategy` 变成稳定对象，而不是停留在 UI 展示层。

## Background

`Phase 0 + Phase 1` 已经完成了 `Campaign Creative -> brief -> strategy -> Editor handoff` 的最小主链路，但当前 strategy 仍有三个明显缺口：

1. 它更像“可读结果”，还不是“下游可消费对象”。
2. 它没有稳定的对象标识和字段边界，后续 variant、handoff、feedback 很难建立对象关系。
3. 前端 card、editor handoff、后端 prompt 对 strategy 的理解还不完全一致，容易产生字段漂移。

本 run 的目标不是扩 scope 去做 variant，而是先把 `strategy` 这层对象打稳。

## User Problems

1. 市场同学可以看到 strategy，但还不能把它当成稳定的创意规划对象使用。
2. 剪辑师能接到 brief 和部分 strategy，但无法完整理解“为什么这么做、哪些点要保留”。
3. 系统后续如果要生成 variant pack，会缺少标准化字段作为输入。

## Scope

### In Scope

- 为 brief 和 strategy 补充稳定的对象字段与标识
- 统一前端、editor handoff、后端 prompt 对 strategy 的字段定义
- 在 Campaign Creative 页面增强 strategy card 的信息密度与可读性
- 在 Editor 侧保留并展示更完整的 strategy 上下文

### Out of Scope

- variant pack 生成
- variant comparison board
- publish feedback / attribution / ROAS
- 长期 brief 库与服务端持久化
- 首页与导航重新设计
- 受保护的底层 provider service 修改

## Module Breakdown

### Module A: Strategy Object Model

Responsibilities:

- 扩展 `CampaignCreativeBrief` / `CampaignCreativeStrategy`
- 增加 `briefId` / `strategyId`
- 标准化下游需要的字段命名

Primary files:

- `h5-video-tool/src/components/campaign/model.ts`
- `h5-video-tool/src/components/campaign/strategy.ts`
- `h5-video-tool/src/api/editorCreative.ts`
- `h5-video-tool/src/editor/utils/editorCreativeBrief.ts`
- `h5-video-tool-api/src/services/editorCreativeBrief.ts`

### Module B: Campaign Strategy Presentation

Responsibilities:

- 让 strategy card 展示新的结构化字段
- 突出 rationale、risk、asset needs、hook 决策

Primary files:

- `h5-video-tool/src/pages/CampaignCreative.tsx`
- `h5-video-tool/src/components/campaign/CampaignStrategyCard.tsx`
- `h5-video-tool/src/i18n/messages.ts`

### Module C: Editor Handoff Consistency

Responsibilities:

- 保存并恢复 richer strategy payload
- 保证 editor 面板与后端 prompt 使用同一份 strategy 语义

Primary files:

- `h5-video-tool/src/pages/EditorWorkbench.tsx`
- `h5-video-tool/src/editor/components/AgentPanel.tsx`
- `h5-video-tool-api/src/routes/editorAgent.ts`
- `h5-video-tool-api/src/services/editorAgentService.ts`

## Functional Decisions

| Capability | Decision | Reason |
|---|---|---|
| Brief identity | 在前端生成 `briefId` | 当前阶段仍是 session/local handoff，不引入服务端持久化 |
| Strategy identity | 生成 `strategyId` 并绑定 `briefId` | 为 variant 和 feedback 链路预留对象关系 |
| Audience field | strategy 中统一使用 `targetAudience` | 避免 `audience` 在不同层语义漂移 |
| CTA detail | 增加 `ctaType`，保留 `cta` 文本 | 后续 variant 需要既能知道 CTA 内容，也能知道 CTA 类型 |
| Risk detail | 把 `forbiddenClaims` 提炼为 `riskNotes` | 让风险信息在 strategy 层成为显式创意约束 |
| Editor role | 接收 richer strategy，但不新增 variant 任务面板 | 控制本 run 范围，先保证上下文一致 |

## Data Contract

### Frontend brief shape

```ts
interface CampaignCreativeBrief {
  briefId: string;
  platform: 'tiktok';
  mode: 'tiktok_content' | 'tiktok_ua';
  objective?: string;
  audience?: string;
  sellingPoints: string[];
  cta?: string;
  referenceStyle?: string;
  region?: string;
  forbiddenClaims?: string[];
}
```

### Strategy minimum payload

```ts
interface CampaignCreativeStrategy {
  strategyId: string;
  briefId: string;
  platform: 'tiktok';
  mode: 'tiktok_content' | 'tiktok_ua';
  angle: string;
  targetAudience?: string;
  hookOptions: string[];
  recommendedHook: string;
  sellingPointFocus?: string;
  cta: string;
  ctaType?: string;
  tone?: string;
  assetNeeds: string[];
  riskNotes: string[];
  rationale: string;
}
```

### Handoff payload

```ts
interface CampaignCreativeHandoffPayload {
  brief: CampaignCreativeBrief;
  strategy: CampaignCreativeStrategy;
  source: 'campaign-creative';
  createdAt: number;
}
```

## Acceptance Criteria

| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | brief 可生成稳定 strategy 对象 | Manual flow + typecheck | strategy 含 `briefId / strategyId` 与完整结构化字段 |
| AC-02 | strategy card 使用结构化对象渲染 | Manual UI verification | 用户能在卡片上读到 angle、hook、tone、asset needs、risk notes 等关键信息 |
| AC-03 | strategy 可无损 handoff 到 Editor | Manual flow verification | Editor 侧能恢复并显示 richer strategy，上游字段不丢失 |
| AC-04 | strategy 进入 prompt 链路 | API/manual verification | 后端 prompt block 和 default user message 能消费 richer strategy/brief 信息 |
| AC-05 | 本地构建通过 | Mechanical verification | `h5-video-tool-api` typecheck 和 `h5-video-tool` build 通过 |

## Engineering Criteria

- 不触碰禁区文件
- 不新增 env var
- 所有新增文案进入 `messages.ts`
- 前后端 strategy 类型保持一致
- handoff 失败时仍可回退到现有 editor 流程

## Risk Matrix

| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| 字段扩展后前后端不一致 | 同名字段在不同层语义不同 | handoff 或 prompt 漂移 | 统一在前端 util 和后端 service 中定义 normalize 规则 | Builder |
| strategy 信息过多但仍无下游价值 | 只是卡片更长 | 产物价值不提升 | 所有新增字段必须被 handoff 或 prompt 消费 | Planner / Builder |
| Editor 面板信息膨胀 | 一次塞太多字段 | 降低可读性 | 保留最关键的策略摘要，避免变成详情表单 | Builder |
| 现有模式回归 | `tiktok_content / tiktok_ua` 逻辑错位 | 生成口径变乱 | 保持 mode label 和内部枚举映射不变 | Verifier |

## Test Matrix

| Category | Cases |
|---|---|
| Happy path | `Campaign Creative -> 生成 strategy -> 进入 Editor -> 发起一次 creative edit` |
| State consistency | strategy 经过 session handoff 后字段完整恢复 |
| Prompt path | `region / forbiddenClaims / asset needs / rationale` 进入 prompt block |
| Label consistency | `Brand Content / TikTok UA` 与内部 mode 映射一致 |
| Fallback | 没有 handoff 时 editor 仍可单独工作 |
| Build | `h5-video-tool-api` typecheck、`h5-video-tool` build 通过 |

## Delivery Artifacts

- Code changes for strategy object, strategy card, editor handoff, and prompt path consistency
- Updated `PRODUCT.md`
- Updated `CHANGELOG.md`
- Run artifacts:
  - `SESSION-ANCHOR.md`
  - `planner-spec.md`
  - `challenger-review.md`
  - `builder-report.md`
  - `verifier-report.md`
  - `release-decision.md`
