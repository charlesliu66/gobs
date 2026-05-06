# Campaign Creative Agent 优化方向与完整落地建议

> Date: 2026-05-01  
> Repo baseline: `main@b53331a`  
> Audience: 产品 / 市场 / 设计 / 前后端 / AI 工程 / 运营

---

## 1. 一句话结论

GOBS 接下来最值得押注的单一方向，不是继续把更多能力堆进“视频工具箱”，而是把产品收口成一个面向游戏市场与 UA 团队的 `Campaign Creative Agent`：

**让市场同学从 campaign brief 出发，在 10-15 分钟内产出 3-5 条可测试的短视频创意变体，并能顺滑交给剪辑师精修或直接进入分发。**

---

## 2. 推荐优化方向

## 2.1 主方向

把当前产品的主链路从：

`素材 -> 制片 -> 分镜 -> 剪辑 -> 分发`

升级为更贴合游戏营销工作的链路：

`Campaign Brief -> Asset Intelligence -> Creative Strategy -> Variant Pack -> Distribution Package -> Lightweight Feedback`

这不是推翻现有能力，而是重新包装和排序：

- `Production Wizard` 继续承担高控制度的制片能力
- `Editor` 继续承担精修与接力能力
- `Distribute` 继续承担账号分发能力
- 新的主入口负责把这些能力组织成市场人能理解的“创意生产系统”

## 2.2 为什么是这个方向

当前仓库已经具备以下基础：

- 有素材中台、制片、分镜、剪辑、分发的完整能力骨架
- 有 batch jobs、队列、状态模型、多版本等长流程基础设施
- 已开始理解游戏素材、营销术语、分发账号、平台结果

当前缺口也很清楚：

- 用户入口仍然偏“工具页”，不是“营销任务页”
- 缺少结构化 brief 作为主输入
- 缺少变体优先、测试优先的输出模式
- 缺少创意 ID / 变体 ID / 发布记录的轻量闭环
- 还没有把“品牌内容版”和“UA 测试版”真正分开

所以最优策略不是“继续扩功能面”，而是“重建主入口与主心智”。

---

## 3. 产品定位

## 3.1 对外定位

推荐统一对外描述为：

> GOBS 是一个面向游戏市场与内容团队的 Campaign Creative Agent，帮助团队把 campaign brief、卖点和素材资产快速转成多条可测试的短视频创意变体。

避免使用这些更弱的定位：

- AI 视频工具
- 智能剪辑助手
- 自动发片平台
- 全自动买量系统

## 3.2 目标用户

第一优先级：

- 游戏市场同学
- UA 创意同学
- 内容运营同学

第二优先级：

- 承接市场初稿的剪辑师

不应作为第一优先级的用户：

- 纯专业视频编辑
- 全栈 media buying 操盘手
- 仅需要素材管理的中后台用户

## 3.3 北极星场景

市场同学输入：

- 本轮 campaign 目标
- 目标区域
- 核心卖点
- 目标受众
- 禁用表达
- 参考风格

系统输出：

- 3-5 条不同角度的短视频创意变体
- 每条的 hook / 卖点 / CTA / 节奏说明
- 对应 caption / hashtags / 封面建议
- 可直接交给编辑器或进入分发

---

## 4. 未来 2-3 个月的产品边界

## 4.1 必须做

- brief-first 的主入口
- TikTok / 短视频游戏营销语义模型
- 变体优先输出
- 轻量交付包
- 轻量反馈回流
- 编辑器接力与复用

## 4.2 暂时不做

- 全自动 budget allocation
- 深度 ROAS / MMP 归因闭环
- 自动调价 / 自动投放
- 多平台广告后台深度编排
- 复杂 BI 看板体系

原则：

**先把“创意生产系统”做深，再谈“增长自治系统”。**

---

## 5. 核心成功指标

建议把 KPI 分成产品效率、创意产能、业务代理指标三层。

## 5.1 产品效率指标

- `Time to First Valid Variant <= 15 分钟`
- brief 填写完成率 >= 70%
- 从主入口走完到导出/分发的完成率 >= 45%
- 二次打开后继续编辑/复用率 >= 35%

## 5.2 创意产能指标

- 单次 brief 产出有效变体数 >= 3
- 单次生成后进入编辑器继续精修的比例 >= 25%
- 单次生成后直接进入分发的比例 >= 20%
- 变体复用模板率 >= 30%

## 5.3 业务代理指标

- 市场同学单条创意初稿耗时从 30-45 分钟下降到 10-15 分钟
- 单个 campaign 首轮可测试创意数提升 2-3 倍
- 素材复用率持续提升
- 发布后可回溯到 brief / variant / asset 的比例 >= 90%

---

## 6. 产品形态建议

## 6.1 新的主入口

建议新增一级主入口：

- `Campaign Creative`

不建议把这套体验继续深埋在 `Editor` 内。

原因：

- 市场同学不是以时间轴思维开始工作的
- 他们先想 campaign、卖点、受众、hook，不是先想轨道和 clip
- 编辑器应是第二阶段接力工具，不应是第一入口

## 6.2 首页重构建议

首页主 CTA 建议从“做视频”改成“做创意测试包”。

推荐保留 3 条清晰路径：

1. `快速验证创意`
2. `Campaign Creative`
3. `高级制片`

其中：

- `Campaign Creative` 设为主推入口
- `高级制片` 明确标注为高控制度路径
- `视频剪辑` 从首页主流程降级为承接入口

## 6.3 两种模式

`Campaign Creative` 首版只做两种模式：

1. `Brand Content`
2. `TikTok UA`

区别要体现在：

- 默认叙事模板
- hook 强度
- 文案长度
- CTA 类型
- 变体策略

---

## 7. 信息架构建议

建议新入口下的信息架构如下：

```text
Campaign Creative
|- Brief
|  |- Goal
|  |- Region
|  |- Audience
|  |- Selling Points
|  |- CTA
|  |- Forbidden Claims
|  `- Reference Style
|- Asset Intelligence
|  |- Auto Tags
|  |- Recommended Assets
|  |- Missing Asset Diagnosis
|  `- Asset Suitability Score
|- Creative Strategy
|  |- Hook Angles
|  |- Narrative Templates
|  |- Audience Variants
|  `- CTA Strategy
|- Variant Pack
|  |- Variant A/B/C...
|  |- Difference View
|  |- Subtitle Style
|  |- Cover / Endcard / Caption
|  `- Timeline Preview
|- Delivery Package
|  |- Export Preset
|  |- Publish Metadata
|  `- Account Targeting
`- Editor Handoff
   |- Creative Rationale
   |- Locked Parts
   |- What Changed
   `- Fine Cut Entry
```

---

## 8. 分阶段落地建议

## Phase 0 - 定位收口与入口重建

建议周期：1 周

目标：

- 完成产品心智切换
- 让市场同学一进入就知道“这里是做 campaign creative 的”

产品动作：

- 首页文案、卡片、 quick ideas 全面换成游戏营销语境
- 新增 `Campaign Creative` 一级导航
- 为 `Brand Content` / `TikTok UA` 定义两套默认入口
- 将 `Editor` 明确标成“精修与接力”

建议改动文件：

- `h5-video-tool/src/pages/Home.tsx`
- `h5-video-tool/src/components/Layout.tsx`
- 新增 `h5-video-tool/src/pages/CampaignCreative.tsx`
- `h5-video-tool/src/App.tsx`

验收标准：

- 首页不再出现泛内容示例，如萌宠、产品种草、普通 vlog
- 首屏 5 秒内能理解产品不是“剪辑工具”，而是“创意生产系统”
- 市场同学可从首页直接进入 brief 流程

## Phase 1 - Brief First 主链路

建议周期：2 周

目标：

- 建立结构化 campaign brief
- 用市场语言驱动系统，而不是用编辑命令驱动系统

要做的能力：

- brief 表单
- 目标区域 / 游戏类型 / 卖点 / 受众 / CTA / 风险禁区
- 模式选择：`Brand Content` / `TikTok UA`
- brief 保存、复用、复制
- brief -> creative directions 生成

后端与数据建议：

- 新增 `CampaignBrief` 实体
- 为每个 brief 生成 `briefId`
- 保存 `goal / region / audience / sellingPoints / cta / forbiddenClaims / referenceStyle`

AI 侧建议：

- 强制输出 3-5 个 creative directions
- 每个方向必须包含：
  - target audience
  - hook
  - selling point focus
  - CTA type
  - why this angle

验收标准：

- 市场同学 2 分钟内可完成一次 brief
- 每次 brief 至少稳定给出 3 个可读方向
- 输出解释不再偏编辑术语，而改成营销语言

## Phase 2 - Variant First 输出系统

建议周期：2-3 周

目标：

- 把“做一条视频”升级成“产出一组测试变体”

要做的能力：

- 方向卡选择
- 3-5 条变体同时生成
- 变体差异视图
- hook / 字幕 / CTA / 节奏 / 封面策略的差异说明
- 变体打分与推荐

建议数据模型：

- `CreativeDirection`
- `VariantPack`
- `Variant`
- `variantId`
- `sourceBriefId`

每个 variant 至少记录：

- hook 类型
- 核心卖点
- CTA 类型
- 受众标签
- 选用素材 ID 列表
- 对应时间轴工程 ID

验收标准：

- 单次生成可稳定得到 3-5 条变体
- 用户能清楚看懂“这些变体差在哪里”
- 用户可一键把任意变体送进编辑器继续精修

## Phase 3 - Delivery Package 与轻反馈回流

建议周期：2 周

目标：

- 不只导出视频，还导出可发布的创意包
- 开始形成轻量数据闭环

要做的能力：

- 自动生成 caption / hashtags / cover text / endcard text
- 变体导出命名规则
- 发布时记录 `briefId / variantId / assetIds / publishBatchId / accountId / platform`
- 支持“手动结果标签”与“轻量 CSV 回写”

这里建议注意：

- 不急着做完整投放归因
- 先做轻量级 performance mapping
- 先保证“知道哪条发到了哪、表现大概如何”

建议首版回流字段：

- views
- ctr
- cvr
- cpi
- spend
- manual verdict
- fatigue status

验收标准：

- 每次发布都可回溯到具体 variant
- 每条 variant 都能挂上轻量表现结果
- 可以按“高点击 / 高转化 / 素材疲劳”做基础筛选

## Phase 4 - Editor Handoff 与团队协作

建议周期：1-2 周

目标：

- 让市场与剪辑协作顺畅，而不是市场和编辑器互相打架

要做的能力：

- editor handoff summary
- 锁定已确认部分
- 显示 creative rationale
- 显示 variant differences
- 市场反馈写回 agent memory

验收标准：

- 剪辑师接手后不需要重新理解 brief
- 剪辑师能看懂“这一版为什么这样剪”
- 精修完成后仍能保留与原 variant 的关系

---

## 9. 数据与埋点建议

为了未来能形成真正的创意闭环，建议从这轮开始统一 ID 体系。

## 9.1 必须有的对象

- `campaignBriefId`
- `creativeDirectionId`
- `variantPackId`
- `variantId`
- `timelineProjectId`
- `publishBatchId`
- `accountId`
- `platform`

## 9.2 必须记录的关系

- 一个 brief 生成了哪些 directions
- 一个 direction 生成了哪些 variants
- 一个 variant 用了哪些 assets
- 一个 variant 是否进入 editor
- 一个 variant 是否进入 distribute
- 一个 variant 最终发到了哪些账号

## 9.3 建议埋点

- brief_started
- brief_completed
- direction_generated
- direction_selected
- variant_generated
- variant_exported
- variant_opened_in_editor
- variant_published
- variant_feedback_updated

---

## 10. 与现有模块的关系

建议不要大拆现有模块，而是做“壳层重组”。

## 10.1 继续复用

- `Asset Library`
  - 做素材标签、推荐、缺失诊断
- `Production Wizard`
  - 作为高控制度内容生产路径
- `Editor`
  - 作为接力精修器
- `Distribute`
  - 作为投递与账号操作层

## 10.2 需要新增的壳层

- `Campaign Creative` 页面
- brief 数据模型
- variant pack 视图
- creative rationale 面板
- delivery package 面板

---

## 11. 明确不建议现在投入的方向

以下方向短期不应成为主任务：

- 新做更多平台概念页
- 做完整自治投放系统
- 为每个平台单独做一套复杂工作流
- 把太多精力放在底层“更像剪映”的编辑功能
- 先做复杂归因再做创意主链路

如果继续在这些方向上分散投入，产品会越来越强，但越来越不清楚“核心卖点是什么”。

---

## 12. 风险与对应策略

## 12.1 风险：还是被看成视频工具

应对：

- 首页、导航、文案、模板全部改成 campaign 语言
- 所有生成结果默认展示“为什么这样做”

## 12.2 风险：变体很多但不好用

应对：

- 先做少量高质量模板
- 变体差异必须显式展示
- 默认只给 3-5 条，不追求十几条噪声输出

## 12.3 风险：没有数据回流就无法证明价值

应对：

- 先做轻量 ID 体系和发布记录
- 先支持手工结果标签和 CSV 回流
- 不等完整归因系统后再启动

## 12.4 风险：市场和剪辑仍然断层

应对：

- 强制每个 variant 自带 rationale
- editor handoff 里显示 brief、卖点、hook、CTA 与差异

---

## 13. 推荐里程碑

建议按 6-8 周推进。

### M1 - 第 1 周

- 完成定位收口
- 首页与导航改造
- 新建 `Campaign Creative` 入口

### M2 - 第 2-3 周

- brief-first 主链路上线
- creative directions 可用

### M3 - 第 4-5 周

- variant pack 上线
- 可稳定生成 3-5 条变体
- 可送入 editor / export

### M4 - 第 6-7 周

- delivery package 上线
- publish record 与 lightweight feedback 打通

### M5 - 第 8 周

- editor handoff 完成
- 开始针对真实市场团队做一轮小范围试用

---

## 14. 第一轮落地的明确验收口径

只要首版满足以下条件，就算方向成立：

1. 市场同学能从 brief 出发，而不是从时间轴出发。
2. 单次输入能得到 3-5 条差异明确的可测试变体。
3. 每条变体都有 hook / 卖点 / CTA 的解释。
4. 变体可以直接导出，也可以无损交给编辑器。
5. 发布后能回溯到 brief 与 variant。
6. 团队开始用“创意测试包”而不是“单条视频”来讨论工作。

---

## 15. 推荐的下一步

建议立刻按下面顺序进入执行：

1. 先做 `Phase 0 + Phase 1`
2. 用真实游戏营销话术重写首页、示例、模板与默认 brief
3. 新建 `Campaign Creative` 顶层页面
4. 跑一个真实 campaign 的内部试点
5. 再决定 `Phase 2` 的变体机制细节

如果只能选一个最重要的切入点：

**优先做 `Campaign Creative` 顶层入口 + brief-first 主链路。**

这一步做好，GOBS 才会真正从“能力很多的工具”变成“方向明确的游戏营销创意生产系统”。
