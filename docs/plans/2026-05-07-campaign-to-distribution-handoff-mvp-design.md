# Campaign Creative -> Distribution Handoff MVP 设计稿

> 日期：2026-05-07
> 状态：方向已认可，进入 Gate 1 planner-spec
> 关联 run：`2026-05-07-campaign-to-distribution-handoff-mvp`
> 上游文档：
> - `docs/plans/2026-05-06-campaign-creative-agent-next-phase-design.md`
> - `docs/plans/2026-05-06-gobs-fastpublish-knowledge-integration-design.md`
> - `docs/plans/2026-05-06-video-distribution-marketer-ux-design.md`
> - `docs/plans/2026-05-07-gold-and-glory-canonical-brain-sync-design.md`

---

## 1. 核心结论

OpenClaw 的代码评估和产品评估都指向同一个问题：GOBS 已经有很强的 AI 视频生成、知识注入和编辑能力，但默认体验还像“工具集合”，不是市场运营每天打开就能推进工作的“营销运营工作台”。

因此下一步不应该以“重构 EditorWorkbench”或“重做首页”为单点目标，而应该围绕主链路做一条可发布的运营闭环：

```text
Knowledge Brain
-> Campaign Creative / Mission Control
-> Preview & Approve
-> Distribution Package
-> 发布 / 排期
-> 人工反馈
-> Knowledge / Memory 回写
```

第一刀建议落在 `Campaign Creative -> Distribution Handoff MVP`：

> 运营在 Campaign Creative 选中 strategy variant 后，可以直接生成“待发布包”，带着素材、CTA、caption、knowledge context 和风险提示进入分发，而不是每次都被迫进入专业 Editor。

这既吸收了代码评估里的工程建议，也服务产品最终目标：让 GOBS 从视频工具升级为游戏营销内容运营平台。

---

## 2. 目标用户与产品承诺

### 2.1 主用户

- 市场运营 / UA / 内容运营同学
- 需要快速推进 campaign，但不想深度操作时间轴、素材轨道和复杂剪辑工具
- 关心“今天有哪些内容能发、是否符合品牌和合规、下一步要处理什么”

### 2.2 次用户

- 剪辑师、制片、创意同学
- 仍然需要 Editor、Advanced Production、素材库、深度 prompt 和手工精修能力
- 这些能力保留，但不再定义默认主路径

### 2.3 产品承诺

> 给定 campaign brief 和 Gold and Glory knowledge，GOBS 能稳定地产出可审核、可修改、可分发的素材包，并记住运营的人工判断，让下一轮更懂这个 campaign。

---

## 3. 对两份评估的吸收原则

### 3.1 立即吸收

| 评估建议 | 处理方式 | 原因 |
|---|---|---|
| 导航信息架构混乱 | 放入后续 IA 小迭代，本轮只保证新分发路径命名清楚 | 用户认知收益高，但不应抢第一刀主链路 |
| 首页需要 Dashboard 化 | 放入 Phase 3，依赖真实待发布包和待处理事项 | 先有真实数据，再做 Dashboard |
| Campaign Creative -> Editor 断裂 | 本轮优先解决，增加 direct-to-distribution 路径 | 直接缩短运营核心路径 |
| 分发工作台不成熟 | 本轮接入待发布包，后续补排期/批量/效果 | 分发是主链路终点，必须提前进入模型 |
| EditorWorkbench 过大 | 只拆和 handoff/apply 相关的逻辑，不做大拆 UI | 避免重构吞掉产品价值 |
| editorCreative API 分散 | 跟 handoff 相关 API 同步收口 | 改边界时顺手理清调用 |
| 后端 editor/campaign 归档 | 新能力按领域放置，旧 service 暂不大搬迁 | 低风险建立新秩序 |
| assetDb Repository facade | 放在后端归档阶段做轻量包裹 | 为未来数据库迁移留口，不提前设计大 ORM |

### 3.2 暂缓吸收

- 不做 SQLite -> PostgreSQL 迁移。
- 不做全站 React Query 迁移。
- 不做完整多人审批系统。
- 不做假的发布效果 dashboard。
- 不做全量 shadcn/Radix 组件库迁移。
- 不暴露未完成的 Platform / Learning Lab / Ops Center。

---

## 4. 目标体验

### 4.1 当前路径

```text
Campaign brief
-> Generate strategy
-> Pick variant
-> Open Editor
-> Face professional editing workspace
-> Manually decide what to distribute
```

问题：

- 运营完成策略后会被带入完全不同范式的 Editor。
- Editor 对运营来说过重，容易把“发内容”误解成“学剪辑”。
- 分发不是自然下一步，而是另一个工具入口。

### 4.2 目标路径

```text
Campaign brief + selected knowledge
-> Generate strategy variants
-> Pick winning variant
-> Create distribution package
-> Preview / approve lightweight details
-> Continue in Distribution
```

保留高级路径：

```text
Distribution package
-> Fine-tune in Editor
-> Return / continue to Distribution
```

关键变化：

- Editor 从“默认必经”变成“高级精修入口”。
- 分发从“另一个页面”变成 campaign 结果的自然终点。
- Knowledge context 从策略页继续进入待发布包，运营能看到这条素材为什么这么写。

---

## 5. 产品形态设计

### 5.1 Surface A: Campaign Creative

新增主操作：

- `Create Distribution Package`
- 中文可命名为：`生成待发布包` / `预览并分发`

触发条件：

- 已有 selected variant 或系统推荐 variant。
- 至少有 caption / CTA / asset reference 中的一类可分发内容。
- 没有真实视频时允许创建 draft package，但 UI 必须明确标注 `needs_asset`。

页面反馈：

- 显示本次包会携带的 strategy summary。
- 显示 applied knowledge packs 和关键约束。
- 显示分发建议：平台、语言、CTA、风险提示。
- 保留 `Fine-tune in Editor` 作为 secondary action。

### 5.2 Surface B: Preview & Approve

V1 可以嵌入 Campaign Creative 或 Distribution 页面，不强制新建独立路由。

应展示：

- 素材预览或缺素材状态。
- caption / headline / hashtags / CTA。
- knowledge summary：market truth、tone rules、forbidden claims、visual cues。
- risk notes：合规风险、平台注意点、缺失项。
- 状态：`draft`、`needs_review`、`approved`、`ready_to_distribute`。

V1 不做：

- 不做多人评论线程。
- 不做复杂审批流转。
- 不做自动发布。

### 5.3 Surface C: Distribution

Distribution 页面需要识别 package 来源：

- 从 Campaign Creative 新建的 package。
- 从已有 package list 打开的 package。
- 从当前 Studio/create-flow 结果来的视频。

V1 增强：

- 增加 `Pending Packages` 或 `待发布包` 区块。
- 打开 package 后预填 asset、caption、CTA、platform hints。
- 用户仍需显式选择账号，不自动选中第一个账号。
- 发布动作仍走当前 GeeLark/分发链路，不在本轮改发布底层。

### 5.4 Surface D: Home Dashboard

Dashboard 不在本轮实现，但本方案为它准备真实数据：

- 待审核 package 数。
- 待发布 package 数。
- 最近 campaign creative 结果。
- Knowledge Brain 更新时间。
- 最近人工反馈。

这样后续首页不再靠硬编码卡片，而是展示运营每天要处理的真实事项。

### 5.5 Surface E: Navigation IA

导航重组建议放在 handoff MVP 后：

| 分组 | 页面 |
|---|---|
| 我的工作 | Campaign Creative、待发布、历史 |
| 快速制作 | Quick Film、高级制片、剪辑器 |
| 资源与知识 | Knowledge Brain、素材库、画廊 |
| 运营增长 | 分发、TikTok 矩阵、舆情监测 |
| 系统 | 账号、用量、设置 |

原则：

- 保留现有 URL，先改分组和命名。
- 未完成模块继续隐藏。
- Editor 标为高级工具，不抢默认主路径。

---

## 6. 核心对象模型

### 6.1 CampaignDistributionPackage

```ts
interface CampaignDistributionPackage {
  id: string;
  campaignId?: string;
  gameId: string;
  source: {
    type: 'campaign_variant' | 'quick_film' | 'editor' | 'manual';
    sourceId?: string;
    createdFromRoute?: string;
  };
  title: string;
  variant: {
    id?: string;
    angle: string;
    hook: string;
    audience: string;
    proofPoint?: string;
    cta: string;
    riskNotes: string[];
  };
  assets: Array<{
    assetId?: string;
    type: 'video' | 'image' | 'caption_only';
    url?: string;
    path?: string;
    status: 'ready' | 'missing' | 'generating' | 'failed';
  }>;
  copy: {
    headline?: string;
    caption: string;
    hashtags: string[];
    language: 'zh' | 'en' | 'ms' | 'th' | 'id' | 'vi' | 'unknown';
  };
  publishIntent: {
    platforms: string[];
    markets: string[];
    accountGroupIds?: string[];
    scheduleHint?: string;
  };
  knowledgeContext: {
    packIds: string[];
    marketTruth: string[];
    audienceTension: string[];
    toneRules: string[];
    forbiddenClaims: string[];
    visualCues: string[];
    approvedAngles: string[];
    hookCandidates: string[];
  };
  review: {
    status: 'draft' | 'needs_review' | 'approved' | 'ready_to_distribute' | 'rejected';
    notes?: string;
    updatedAt: string;
    updatedBy?: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

### 6.2 CampaignFeedbackSignal

```ts
interface CampaignFeedbackSignal {
  id: string;
  packageId: string;
  campaignId?: string;
  signalType: 'keep_angle' | 'avoid_angle' | 'revise_copy' | 'brand_risk' | 'ready_to_publish';
  note: string;
  knowledgeWritebackCandidate: boolean;
  createdAt: string;
  createdBy?: string;
}
```

本轮只需要为 feedback 留数据边界，不要求实现 Knowledge -> Memory 写回。

---

## 7. 技术设计

### 7.1 前端边界

推荐新增或收口：

- `h5-video-tool/src/components/campaign/distributionPackage.ts`
  - 纯类型和转换 helper。
  - 从 selected variant + knowledge context 生成 draft package payload。

- `h5-video-tool/src/api/campaignDistribution.ts`
  - 包装 package create/list/read/update API。
  - 统一错误处理和 auth header。

- `h5-video-tool/src/components/campaign/DistributionPackagePanel.tsx`
  - Campaign Creative 内的待发布包预览卡。

- `h5-video-tool/src/components/distribution/PendingDistributionPackages.tsx`
  - Distribution 页面读取待发布包。

EditorWorkbench 处理方式：

- 本轮不做大拆。
- 如果需要动 Editor，只抽离 campaign/editor handoff helper，不改 timeline、media、export、agent 复杂状态。
- 任何 Editor 改动都必须保持已有 knowledge-aware editor handoff 兼容。

### 7.2 后端边界

推荐新增：

- `h5-video-tool-api/src/routes/campaignDistribution.ts`
- `h5-video-tool-api/src/services/campaignDistributionPackage.ts`
- `h5-video-tool-api/tests/campaignDistributionPackage.test.ts`

API 建议：

```text
POST /api/campaign-distribution/packages
GET  /api/campaign-distribution/packages
GET  /api/campaign-distribution/packages/:id
PATCH /api/campaign-distribution/packages/:id
```

V1 存储：

- 沿用当前轻量本地 JSON/SQLite 风格，不引入新数据库。
- 允许先使用 repository facade 包裹读写。
- 不直接修改底层视频生成服务和禁区文件。

### 7.3 与分发现有能力的关系

- 本轮不改 GeeLark 发布底层。
- Distribution 只把 package 转成当前 publish draft 的输入。
- 账号选择仍需用户显式确认。
- 如果 package 没有 ready asset，只允许保存 draft，不允许直接 publish。

### 7.4 与 Knowledge Brain 的关系

Package 必须保留：

- `knowledgePackIds`
- structured `knowledgeContext`
- 由 knowledge 派生出的 risk notes / tone rules / forbidden claims

这样后续可以支持：

- Preview & Approve 展示来源。
- Distribution copy 生成继续遵守约束。
- Human feedback loop 写回 memory。

---

## 8. 实施分期

### Phase 1: Campaign -> Distribution Handoff MVP

目标：

- 从 Campaign Creative 创建待发布包。
- Distribution 能读取并编辑待发布包。
- 保留 Editor 高级入口。

验收：

- 选中 variant 后能生成 package。
- package 带上 knowledge context、CTA、caption、risk notes。
- Distribution 打开 package 后能预填核心发布字段。
- 无 ready asset 时不能误导用户直接发布。

### Phase 2: Preview & Approve

目标：

- 在 Campaign 和 Distribution 之间增加轻审核层。
- 支持 approve/reject/needs_review 状态。
- 支持短备注。

验收：

- 运营能完成“看效果、改文案、确认分发”。
- Editor 只作为精修路径。

### Phase 3: Home Dashboard + Navigation IA

目标：

- 首页展示真实待处理事项。
- 导航按运营心智重组。

验收：

- Home 至少展示待审核、待发布、最近 campaign、knowledge 状态。
- 导航保留 URL，完成分组和命名调整。

### Phase 4: Distribution Maturity

目标：

- 待发布包列表、批量选择、账号组、排期字段。

验收：

- 支持批量进入发布准备。
- 支持基础排期状态，不要求自动发布调度。

### Phase 5: Human Feedback -> Knowledge / Memory

目标：

- 把人工判断记录为 campaign feedback。
- 用户确认后可写入 memory / knowledge。

验收：

- 不自动乱写 memory。
- 写回前展示来源和 diff。

---

## 9. 工程风险与约束

| 风险 | 说明 | 约束 |
|---|---|---|
| Scope creep | 容易把审批、排期、效果分析一次做完 | Phase 1 只做待发布包 |
| Editor 回归 | EditorWorkbench 过大，随便改容易影响剪辑链路 | 只碰 handoff helper，避免 timeline/export |
| 假数据污染 | Dashboard/analytics 没有真实数据时容易变空壳 | 后续 Dashboard 只展示真实 package/task 数据 |
| Knowledge schema drift | package 另起一套 knowledge 字段会破坏已上线 handoff | 复用已落地 knowledgeContext 字段 |
| 发布风险 | 分发涉及真实账号 | V1 仍需用户显式选择账号和确认 |
| 数据迁移过度 | 为了 package 引入复杂数据库迁移 | 先做轻量 repository facade |

---

## 10. 成功标准

产品成功标准：

- 运营可以从 Campaign Creative 直接进入待发布准备，不被迫学习 Editor。
- 分发页面能解释“这条内容来自哪个 campaign variant、依据哪些 knowledge”。
- 后续 Dashboard 有真实待处理数据来源。

工程成功标准：

- 新能力按 campaign/distribution 领域收口。
- 不触碰 AGENTS 禁区文件。
- 保持现有 Campaign Creative -> Editor handoff 兼容。
- 前后端都有 seam tests 覆盖 package 创建和消费。

发布成功标准：

- 本地 build 通过。
- `workflow_guard` build/verify/release 通过或明确记录非阻塞 warning。
- staging smoke 通过后再发布 prod。
- `PRODUCT.md`、`CHANGELOG.md`、run 文档同步。
