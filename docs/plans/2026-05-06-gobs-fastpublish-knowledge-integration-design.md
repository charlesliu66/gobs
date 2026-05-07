# GOBS 接入 fastpublish knowledge 设计稿

> 日期：2026-05-06
> 状态：建议立项，待进入实施
> 关联：
> - `docs/plans/2026-05-06-campaign-creative-agent-next-phase-design.md`
> - `docs/plans/2026-05-06-campaign-strategy-productization-implementation-plan.md`
> 外部参考：
> - `https://github.com/charlesliu66/fastpublish/tree/master`

---

## 1. 核心判断

`fastpublish` 对 GOBS 最有价值的，不是把整套多 agent 壳子搬进来，而是把它的 `knowledge -> skills` 分层方法，转成 GOBS 自己的 `Knowledge Brain -> Campaign Creative -> Editor Memory` 闭环。

对当前 GOBS 而言，最值得复用的是三类东西：

1. `事实型 knowledge`
   - 品牌语气、合规边界、视觉风格、市场基础、人群画像、活动节奏

2. `方法型 playbook`
   - 尤其是 `selling-point-extractor` 这类“如何从事实里提炼卖点和 hook”的方法

3. `知识消费方式`
   - skill 不直接吃一堆散文档，而是按固定路径、固定类别读取结构化知识

因此本方案的核心不是“让 GOBS 调 fastpublish repo”，而是：

> 在 GOBS 内部建立一层可导入、可管理、可注入的 `Campaign Knowledge Layer`，用来驱动 `Campaign Creative` 策略生成，并把同一份知识继续注入 editor prompt 与 project memory。

---

## 2. 当前项目现状

### 2.1 已有能力

当前 GOBS 已经具备两个重要消费端：

1. `Campaign Creative`
   - 已有完整页面与 brief-first 流程
   - 已能输出 strategy card，并 handoff 到 editor
   - 当前策略生成主要来自本地 heuristic 规则

2. `Editor memory / prompt`
   - 已经支持把 `creativeBrief`、`creativeStrategy`、`projectMemory` 注入 prompt
   - 已经有 `AgentMemoryPanel` 展示稳定事实、偏好、负向偏好

### 2.2 当前缺口

当前最关键的缺口不是“没有 AI”，而是“没有正式 knowledge 输入层”：

1. `Campaign Creative` 目前缺少品牌/市场/人群/合规等外部知识输入。
2. `Platform Framework` 里“上传资料 -> 自动生成游戏大脑”目前还是前端 mock，不是真正的知识入库能力。
3. editor 虽然能吃 memory，但目前没有一套稳定的、面向 campaign creative 的知识包供它消费。

---

## 3. 从 fastpublish 里应该吸收什么

## 3.1 建议吸收的知识文件类型

建议优先吸收并映射这几类知识：

| fastpublish 来源 | GOBS 对应 pack 类型 | 价值 |
|---|---|---|
| `knowledge/game/brand/tone-of-voice.md` | `brand_tone` | 控制文案语气、镜头表达、品牌感 |
| `knowledge/game/brand/compliance.md` | `brand_compliance` | 控制禁语、禁承诺、风险表达 |
| `knowledge/game/brand/visual-style.md` | `visual_style` | 控制画面风格、视觉 cue |
| `knowledge/market/my/market-fundamentals.md` | `market_fundamentals` | 提供市场现实、用户动机、竞争格局 |
| `knowledge/market/my/user-persona.md` | `user_persona` | 提供 audience 细分与情绪触发点 |
| `knowledge/live-ops/event-calendar.md` | `live_ops_calendar` | 提供活动节点与节奏 |
| `knowledge/live-ops/event-history/*` | `live_ops_history` | 提供过去活动有效表达 |
| `knowledge/market/_playbooks/selling-point-extractor.md` | `selling_point_playbook` | 提供卖点提炼和 hook 生成方法 |

### 3.2 不建议直接吸收的部分

以下内容不应该直接成为 GOBS 运行时依赖：

1. `fastpublish` 的整套 agent 调度壳子
2. 与发行动作、分发执行强绑定的操作性 skill 文本
3. repo 中与当前 GOBS creative 目标无关的 memory / workflow / action catalog
4. 对 `master` 分支的实时运行时依赖

推荐做法是：

- 只在“导入时”读取 fastpublish 内容
- 在 GOBS 内部生成标准化 knowledge pack
- 运行时只消费 GOBS 自己存储的 pack，不依赖外部 repo 状态

---

## 4. 产品目标

## 4.1 北极星

让 GOBS 从“会生成 strategy 的页面”升级成“有知识大脑支撑的 campaign creative 生产入口”。

更具体地说，本方案要达成的是：

> 用户先为某个游戏沉淀 `Knowledge Brain`，再在 `Campaign Creative` 中选择要启用的知识包，系统据此生成更像真实市场团队会用的 creative strategy，并在 editor 中继续保留这些知识约束。

## 4.2 用户可感知变化

落地后，用户应能感知到三个变化：

1. `Knowledge Brain`
   - 能导入或上传品牌、市场、活动、合规资料
   - 能看见这些资料被整理成哪些知识包

2. `Campaign Creative`
   - 不是只填 brief，而是“brief + selected knowledge packs”
   - 生成出的 strategy 会体现 market truth、tone rules、forbidden claims、approved angles

3. `Editor`
   - 接收到的不只是 brief 文本
   - 还会保留创意策略背后的品牌语气、市场判断和禁语边界

---

## 5. 产品形态设计

## 5.1 Surface A: Knowledge Brain

推荐把 `Platform Framework` 里的“上传资料 -> 自动生成游戏大脑”做成真正的知识入口，按游戏维度管理。

### V1 功能

1. 游戏级知识包列表
   - 每个游戏有独立 knowledge packs
   - 可查看 pack 类型、摘要、状态、来源

2. 两种导入方式
   - `Upload`：上传 markdown / txt / doc 摘要后的文本内容
   - `Import from fastpublish template`：从预设映射中一键导入推荐 pack 结构

3. Pack 状态
   - `draft`
   - `ready`
   - `archived`

### V1 不做

1. 不做完整 GitHub repo 自动同步
2. 不做复杂权限系统
3. 不做跨游戏共享知识中心

## 5.2 Surface B: Campaign Creative

`Campaign Creative` 页面新增一块 `Selected Knowledge Packs`，用于显示并选择当前策略生成要启用的知识。

### 新的输入结构

从：

`brief`

升级为：

`brief + selected knowledge packs + derived creative context`

### 页面上应新增的反馈内容

生成 strategy 时，除了现在已有字段，建议额外显式展示：

- `marketTruth`
- `audienceTension`
- `toneRules`
- `forbiddenClaims`
- `approvedAngles`
- `hookCandidates`
- `visualCues`

## 5.3 Surface C: Editor / Agent Memory

editor 侧不应该重复展示整份知识文档，而应该消费结构化后的结果。

推荐做法：

- `stableFacts`
  - 市场阶段、活动节点、核心卖点、目标人群
- `preferenceSignals`
  - 品牌语气、视觉偏好、推荐 CTA 风格
- `negativePreferenceSignals`
  - 禁语、合规边界、禁止夸张承诺

这样 editor 的第一次生成和后续调优，都会更稳定。

---

## 6. 技术设计

## 6.1 设计原则

1. `导入时标准化，运行时只消费标准结构`
2. `知识包是事实和约束，不是原始 prompt 文本`
3. `playbook 可以影响策略生成，但不直接作为用户可见长文案`
4. `没有 knowledge pack 时，保留当前 heuristic fallback`
5. `整个方案先做游戏级本地存储，不引入数据库迁移`

## 6.2 核心数据模型

建议引入三层对象：

### 第一层：原始来源

```ts
interface CampaignKnowledgeSource {
  sourceId: string;
  gameId: string;
  sourceType: 'upload' | 'fastpublish-template' | 'manual';
  title: string;
  originalPath?: string;
  importedAt: string;
  checksum?: string;
}
```

### 第二层：标准知识包

```ts
type CampaignKnowledgePackType =
  | 'brand_tone'
  | 'brand_compliance'
  | 'visual_style'
  | 'market_fundamentals'
  | 'user_persona'
  | 'live_ops_calendar'
  | 'live_ops_history'
  | 'selling_point_playbook';

interface CampaignKnowledgePack {
  packId: string;
  gameId: string;
  type: CampaignKnowledgePackType;
  title: string;
  status: 'draft' | 'ready' | 'archived';
  summary: string;
  facts: string[];
  preferences: string[];
  avoid: string[];
  hookSeeds: string[];
  visualCues: string[];
  sourceIds: string[];
  updatedAt: string;
}
```

### 第三层：策略消费上下文

```ts
interface DerivedCampaignKnowledgeContext {
  selectedPackIds: string[];
  marketTruth: string[];
  audienceTension: string[];
  toneRules: string[];
  forbiddenClaims: string[];
  approvedAngles: string[];
  hookCandidates: string[];
  visualCues: string[];
  rationaleNotes: string[];
}
```

## 6.3 存储方式

建议沿用现有 `API_DATA_DIR` 本地文件存储方式，避免第一版就引入新的持久化基础设施。

推荐目录：

```txt
<API_DATA_DIR>/campaign-knowledge/
  <username>/
    <gameId>/
      manifest.json
      packs/
        <packId>.json
      sources/
        <sourceId>.json
      imports/
        <timestamp>-snapshot.json
```

这样有三个好处：

1. 和现有 `editor-projects` 风格一致
2. 容易做导出与备份
3. 便于后续 staging / prod 用编译产物直接部署

## 6.4 导入流程

### V1 推荐流程

1. 用户选择当前游戏
2. 进入 `Knowledge Brain`
3. 通过上传或模板导入创建原始 source
4. 后端把 source 归一化成 knowledge pack
5. 用户在 `Campaign Creative` 勾选要启用的 pack
6. 系统导出 `DerivedCampaignKnowledgeContext`
7. strategy 生成与 editor handoff 使用同一份 context

### 为什么不建议一开始就做 GitHub URL 直读

1. 线上运行时依赖外部仓库稳定性，风险高
2. repo 结构变更会直接影响生产链路
3. 合规和审计上更难追踪“本次生成到底吃了哪一版知识”

更安全的做法是：

- V1 先做“模板映射导入”和“手动上传导入”
- V2 再加“GitHub URL 导入”
- V3 才考虑“定期同步”

## 6.5 后端 API 设计

建议新增独立路由：`/api/campaign-knowledge`

### V1 API

1. `GET /api/campaign-knowledge/games/:gameId/packs`
   - 返回该游戏当前所有 pack

2. `POST /api/campaign-knowledge/games/:gameId/import-template`
   - 依据 fastpublish 预设映射创建一组初始 pack

3. `POST /api/campaign-knowledge/games/:gameId/sources`
   - 上传或提交一段文本 source，并触发 pack 归一化

4. `POST /api/campaign-knowledge/games/:gameId/derive-context`
   - 输入 selected pack ids
   - 输出 `DerivedCampaignKnowledgeContext`

5. `PATCH /api/campaign-knowledge/games/:gameId/packs/:packId`
   - 修改标题、状态、摘要、结构化字段

## 6.6 与 Campaign Creative 的集成

`Campaign Creative` 不应该直接读取 raw source，而应读取 `DerivedCampaignKnowledgeContext`。

推荐集成方式：

1. 页面加载当前游戏的 knowledge packs
2. 用户勾选本次启用的 packs
3. 生成 strategy 前先调用 `derive-context`
4. `buildStrategyFromBrief` 接受一个新参数：

```ts
{
  tuning?: Partial<CampaignCreativeStrategyTuning>;
  strategyId?: string;
  knowledgeContext?: DerivedCampaignKnowledgeContext;
}
```

5. strategy 输出中补充：
   - `marketTruth`
   - `audienceTension`
   - `knowledgePackIds`
   - `toneRules`
   - `forbiddenClaims`

## 6.7 与 Editor 的集成

推荐在 handoff payload 中继续传递：

```ts
{
  brief,
  strategy,
  knowledgeContext,
  source: 'campaign-creative'
}
```

后端 `editorAgent` 再把它转成 memory promotion 输入：

- `stableFacts` <- market truth / audience tension / event timing
- `preferenceSignals` <- tone rules / visual cues
- `negativePreferenceSignals` <- forbidden claims / compliance constraints

这样无需新增另一套 editor 专用知识体系。

---

## 7. 推荐分期

## 7.1 Phase A: Knowledge Pack 骨架

目标：

- 先把游戏级 knowledge pack 存储、API、页面骨架搭起来
- 先支持模板导入和手工录入

不追求：

- 复杂解析
- GitHub 自动同步

## 7.2 Phase B: Strategy 知识消费

目标：

- 让 `Campaign Creative` 生成策略时真正消费 knowledge context
- 让 strategy 从 heuristic-only 升级成 knowledge-aware

## 7.3 Phase C: Editor 知识注入

目标：

- 让 editor prompt 与 project memory 继续消费同一份 derived context

## 7.4 Phase D: fastpublish 深度导入

目标：

- 补充更完整的 markdown ingest
- 支持可追踪的 GitHub 源文件导入

---

## 8. 验收标准

以下四条同时成立，才算这个方案真正有价值：

1. 用户能在 `Knowledge Brain` 下看到真实、持久化的游戏级 knowledge packs。
2. `Campaign Creative` 在启用 knowledge pack 后，strategy 明显体现品牌语气、市场判断和合规边界。
3. editor 首次生成会保留相同的 tone / avoid / angle 约束。
4. 没有导入 knowledge pack 时，现有 `Campaign Creative` 主链路不回退、不崩溃。

---

## 9. 风险与控制

## 9.1 风险

1. 过早做 GitHub 直连，导致运行时依赖外部仓库
2. 直接把原始 skill 文本塞进 prompt，造成噪音过大
3. 知识包字段设计过散，后续难以稳定消费
4. 让 `Knowledge Brain` 变成纯展示页，没有真正进入 strategy 与 editor

## 9.2 控制策略

1. V1 只做导入式，不做运行时 repo 依赖
2. 只注入结构化 summary，不注入整篇 markdown
3. pack 类型先控制在 6-8 个，不提前泛化
4. 每个阶段都用 `Knowledge Brain -> Campaign Creative -> Editor` 做端到端验收

---

## 10. 最终建议

这不是一个单独的新页面需求，而是对当前 `Campaign Creative Agent` 路线的一个关键补层。

如果 `Campaign Creative` 继续只靠 brief + heuristic，它会更像一个聪明表单。
如果补上 `fastpublish` 风格的 knowledge layer，它才更接近真正可复用的创意大脑。

因此推荐把本方案视为：

> `Campaign Strategy Productization` 之后、`Variant Pack MVP` 之前，最值得投入的一层基础能力。
