# Planner Spec: Campaign Creative Agent Phase 0 + Phase 1

## Background

当前 GOBS 已具备素材、制片、分镜、剪辑、分发的能力骨架，也已经在 `Editor` 内部拥有一版 `TikTok creative brief` 的前身能力。但当前问题不是“能力不够”，而是主入口与主心智不对：

- 首页和导航仍然更像多工具集合。
- 市场同学仍然需要先进入 `Editor`，再理解时间轴与素材操作。
- brief 能力埋在编辑器侧边面板里，不是一个独立的 marketing task entry。
- `tiktok_content / tiktok_ua` 只是内部逻辑，还没有成为真正产品化的模式切换。
- 当前最缺的不是新工具，而是一个以 campaign brief 为起点的主工作流。

本 run 的目标，是把现有能力重新组织成第一阶段可用的 `Campaign Creative Agent` 主链路，而不是直接追求完整创意工厂。

## User Problems

1. 市场同学第一次进入产品时，看不懂从哪里开始做“campaign creative”。
2. 首页示例与入口语言偏泛内容，不够游戏营销导向。
3. `Editor` 更适合“接力精修”，但当前又被迫承担“首次任务入口”的角色。
4. brief 没有独立页，难以形成标准化输入。
5. 现有 creative strategy 虽然有雏形，但没有成为一个稳定、可复核、可 handoff 的结果物。
6. 市场用户无法在不理解 timeline 的前提下完成第一轮创意任务。

## Target Users

### Primary

- 游戏市场同学
- UA 创意同学
- 内容运营同学

### Secondary

- 承接市场初稿的剪辑师

## Scope

### In Scope

#### Phase 0

- 首页与导航的定位收口
- 新增 `/campaign-creative` 顶层入口
- 首页游戏营销语境重写
- 用户路径信息架构同步到 UI

#### Phase 1

- `Campaign Creative` 页面的 brief-first 主链路
- 模式切换：`Brand Content` / `TikTok UA`
- strategy card 展示
- brief / strategy -> `Editor` 的 handoff
- `Editor` 首次执行优先使用 handoff brief

### Out of Scope

- 真实多 timeline 变体批量生成
- variant comparison board
- 变体导出包与表现回流
- campaign / game / region 主数据体系
- 长期 brief 库与服务端持久化
- 新 provider 模型与底层生成链路调整
- 复杂分发 orchestration
- BI / attribution / ROAS 闭环

## Module Breakdown

### Module A: Positioning & Entry

Responsibilities:

- 重新组织首页主 CTA、主路径、导航层级
- 在 UI 层将产品主心智明确收口为 `Campaign Creative Agent`

Primary files:

- `h5-video-tool/src/pages/Home.tsx`
- `h5-video-tool/src/components/Layout.tsx`
- `h5-video-tool/src/App.tsx`
- `h5-video-tool/src/i18n/messages.ts`

### Module B: Campaign Creative Page

Responsibilities:

- 新建 `Campaign Creative` 顶层页面
- 承担 brief-first 输入职责
- 生成 strategy card
- 发起 handoff 到 `Editor`

Primary files:

- `h5-video-tool/src/pages/CampaignCreative.tsx`
- `h5-video-tool/src/components/campaign/*`
- `h5-video-tool/src/i18n/messages.ts`

### Module C: Brief/Strategy Reuse

Responsibilities:

- 复用并扩展现有 editor creative brief 类型
- 支持新增字段 `region` 与 `forbiddenClaims`
- 保持前后端类型与 prompt 注入一致

Primary files:

- `h5-video-tool/src/editor/utils/editorCreativeBrief.ts`
- `h5-video-tool-api/src/services/editorCreativeBrief.ts`

### Module D: Editor Handoff

Responsibilities:

- 接收来自 `/campaign-creative` 的 brief / strategy
- 在 `Editor` 首次打开时恢复上下文
- 保持现有 AgentPanel 可继续编辑和应用该 brief

Primary files:

- `h5-video-tool/src/pages/EditorWorkbench.tsx`
- `h5-video-tool/src/editor/components/AgentPanel.tsx`
- `h5-video-tool-api/src/routes/editorAgent.ts`
- `h5-video-tool-api/src/services/editorAgentService.ts`

## Functional Decisions

| Capability | Decision | Reason |
|---|---|---|
| Top-level route | Add `/campaign-creative` | 市场用户需要独立入口，而不是先进 editor |
| Product mode labels | UI shows `Brand Content` / `TikTok UA` | 更符合市场语言 |
| Internal mode values | Keep `tiktok_content` / `tiktok_ua` | 降低首轮重构成本 |
| Brief persistence | Use local / session handoff only in Phase 1 | 控制 scope，先打通路径 |
| Strategy output | Make strategy card the primary artifact | 这是本阶段最重要的“市场可读结果物” |
| Variant generation | Not in this run | 否则 scope 爆炸，验收不稳 |
| Region / forbidden claims | Add to brief data model | 对 marketing brief 有实际价值 |
| Backend changes | Reuse existing `/api/editor/agent/apply` path | 现有链路已支持 creativeBrief 注入 |
| Editor role | Handoff destination, not first-touch entry | 符合用户真实工作流 |
| Main CTA | Keep only `去生成创意剪辑` | 本阶段结束点是进入 editor，而不是直接分发 |

## Detailed UX Decisions

### Phase 0 UX

首页只保留三条主路径：

1. `快速验证创意`
2. `Campaign Creative`
3. `高级制片`

首页 quick ideas 改成游戏营销场景，例如：

- 新英雄上线 15 秒角色吸引向
- 首发版本卖点混剪
- 抽卡爽点前 3 秒强钩子
- Boss 战高强度 UA 创意
- 活动预热倒计时 CTA

### Phase 1 UX

`/campaign-creative` 页面首版建议结构：

1. Page hero
2. Mode switch
3. Brief form
4. Strategy card
5. Main CTA: `去生成创意剪辑`

Brief form 默认可见字段：

- `mode`
- `objective`
- `sellingPoints`
- `audience`
- `cta`

`Advanced options` 字段：

- `referenceStyle`
- `region`
- `风险禁区`

字段建议：

- `sellingPoints`：多行文本，每行一个
- `风险禁区`：多行文本
- `region`：首版自由文本，不做复杂枚举

主 CTA 点击后：

- 将 brief / strategy 写入 handoff state
- 跳转 `Editor`
- `Editor` 侧展示 strategy card，并允许直接执行 Agent

## Data Contract

### Frontend brief shape

```ts
type CampaignCreativeMode = 'tiktok_content' | 'tiktok_ua';

interface CampaignCreativeBrief {
  platform: 'tiktok';
  mode: CampaignCreativeMode;
  objective?: string;
  audience?: string;
  sellingPoints: string[];
  cta?: string;
  referenceStyle?: string;
  region?: string;
  forbiddenClaims?: string[];
}
```

### Strategy card minimum payload

```ts
interface CampaignCreativeStrategy {
  platform: 'tiktok';
  mode: CampaignCreativeMode;
  objective: string;
  audience?: string;
  primarySellingPoint?: string;
  hookOptions: string[];
  recommendedHook: string;
  cta: string;
  rationale: string;
}
```

### Handoff payload

建议首版使用 `sessionStorage`，最小结构：

```ts
interface CampaignCreativeHandoffPayload {
  brief: CampaignCreativeBrief;
  strategy?: CampaignCreativeStrategy;
  source: 'campaign-creative';
  createdAt: number;
}
```

## Acceptance Criteria

| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | 首页和导航完成 `Campaign Creative` 主心智收口。 | Manual UI verification | 首页首屏、导航、路径文案都体现 campaign creative 主心智。 |
| AC-02 | `/campaign-creative` 页面可独立完成 brief 输入。 | Manual flow verification | 用户可从首页或导航进入页面并完成 brief 输入。 |
| AC-03 | 页面可生成 strategy card，并区分 `Brand Content / TikTok UA`。 | Manual flow verification | 页面会根据模式展示差异化文案，且 strategy card 可读。 |
| AC-04 | brief / strategy 可稳定 handoff 到 `Editor`，且首次执行优先采用该上下文。 | Manual flow + log / UI verification | 跳转后 handoff 数据不丢失，首次执行不要求用户重新填写同一份 brief。 |

## Engineering Criteria

- 不修改禁区文件。
- 不新增部署脚本逻辑。
- 新文案进入 `messages.ts`。
- 前后端 brief 类型保持一致。
- 如 `region` / `forbiddenClaims` 第一版只参与 prompt 注入，也必须在类型层明确定义。
- 任何 handoff 失败必须允许回退到 editor 现有行为，而不是让页面卡死。

## Risk Matrix

| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Scope creep into variant system | 想顺手把多变体一起做掉 | Run 超期，验收发散 | 明确 Phase 1 只到 strategy + editor handoff | Planner / Builder |
| Page-to-editor handoff is brittle | session/local state 丢失 | 用户以为 brief 无效 | 设计 fallback：没有 handoff 时 editor 退回现有逻辑 | Builder |
| UI label vs internal enum drift | UI 叫 Brand Content，内部仍是 tiktok_content | 文案和逻辑对不上 | 在 normalize / display helper 统一映射 | Builder |
| New brief fields not used | region / forbiddenClaims 只显示不生效 | 用户感知为假字段 | 至少注入 strategy / prompt block | Builder |
| Home positioning changes break old navigation intuition | 老用户找不到入口 | 使用阻力上升 | 保留 Studio / Editor / Distribute，但降低其首页优先级 | Product / Design |
| Editor regression | 改动 AgentPanel / EditorWorkbench 破坏旧链路 | 影响当前可用性 | 优先复用现有 creativeBrief 逻辑，保留原入口 | Builder / Verifier |

## Test Matrix

| Category | Cases |
|---|---|
| Happy path | 首页进入 `/campaign-creative` -> 填 brief -> 生成 strategy -> handoff 到 editor -> 发起一次 creative edit |
| UX regression | 首页仍可进入 `快速验证创意`、`高级制片`、`视频剪辑` |
| State fallback | handoff payload 丢失时，editor 不崩溃且可回退到原始工作方式 |
| Label consistency | `Brand Content` / `TikTok UA` 与内部 mode 映射正确 |
| Prompt path | 新增字段 `region / forbiddenClaims` 至少进入 strategy or prompt block |
| Build | frontend build 通过 |
| Type safety | backend typecheck 通过 |
| i18n | 新增 key 在中英文下都有值 |

## Source Files To Inspect First

- `h5-video-tool/src/pages/Home.tsx`
- `h5-video-tool/src/components/Layout.tsx`
- `h5-video-tool/src/App.tsx`
- `h5-video-tool/src/pages/EditorWorkbench.tsx`
- `h5-video-tool/src/editor/components/AgentPanel.tsx`
- `h5-video-tool/src/editor/utils/editorCreativeBrief.ts`
- `h5-video-tool-api/src/routes/editorAgent.ts`
- `h5-video-tool-api/src/services/editorCreativeBrief.ts`
- `h5-video-tool-api/src/services/editorAgentService.ts`
- `h5-video-tool/src/i18n/messages.ts`

## Delivery Artifacts

- Code changes for homepage, nav, route, campaign page, editor handoff, and brief/strategy typing
- Updated `PRODUCT.md`
- Updated `CHANGELOG.md`
- Run artifacts:
  - `SESSION-ANCHOR.md`
  - `planner-spec.md`
  - `challenger-review.md`
  - `builder-report.md`
  - `verifier-report.md`
  - `release-decision.md`

## Exit Rule

如果在实施中发现必须新增服务端 brief persistence、variant pack engine、或复杂发布回流，必须视为 scope change，暂停并重新确认，而不是在本 run 内自动扩展。
