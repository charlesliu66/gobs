# GOBS Current State Optimization Recommendation

> Date: 2026-05-09
> Owner: Charles / Codex
> Source: 基于 OpenClaw 项目现状评估、最近一轮 Distribution Center / Campaign -> Studio 优化结果，以及本地代码事实核对。
> Purpose: 把下一轮优化优先级从“泛技术债清单”收敛成可执行的产品与工程路线。

## 一、结论摘要

当前最应该继续推进的是 **方案 C + 方案 A**：

1. **先做体验闭环（方案 C）**：把 `Campaign Creative -> Studio -> Distribution` 真正跑顺，让市场/运营能完整完成一次 campaign 创意生产与分发。
2. **并行做低风险减法（方案 A）**：清理或隔离明显非主线代码，尤其是 `sj-ui`、`RiskSentiment/TiktokMatrix` 这类疑似边缘模块。
3. **暂缓大规模架构治理（方案 B）**：巨型组件和跨页面状态确实是问题，但不建议此刻同时拆四个大页面或直接引入 Zustand。先补业务 ID 关联和服务端持久化，再决定是否需要全局 store。

一句话：**先让运营主链路变顺，再清掉负担，最后做系统性工程治理。**

## 二、对 OpenClaw 评估的判断

### 仍然成立

- 单体 Express + React SPA + SQLite + Nginx/PM2 适合当前阶段，不需要微服务。
- 前端依赖克制是优势，应继续避免为短期便利引入重依赖。
- 巨型页面组件是真风险：当前仍有 `ProductionWizard`、`EditorWorkbench`、`TabDistribute`、`TabGenerate` 四个高复杂度入口。
- `sj-ui` 是清理候选。快速核对后，`h5-video-tool/src/sj-ui` 约 180 个文件，主 App 路由没有直接引用，适合单独做安全清理 run。
- `RiskSentiment/TiktokMatrix` 需要产品归类：如果不是核心运营链路，应隐藏、降级或拆出独立入口，而不是继续占据主包心智。

### 需要修正

- “分发中心 Campaign 重复输入字段还没删”已经不完全准确。Distribution Center operator MVP 已经把 Package 路径改成只读 inherited campaign context，并加入 direct caption hint。当前代码里的 `campaignObjective` 等字段更多是 package context / caption generation 数据，不应简单等同于重复输入表单。
- “环境变量没有校验”也不完全准确。后端已有 `h5-video-tool-api/src/config/env.ts` 启动校验，会检查 `COMPASS_API_URL`、`COMPASS_API_KEY` 等必填项。但它还不是完整 schema，仍值得后续治理。
- “引入 Zustand 统一状态”不宜立即执行。当前最痛的是跨页面业务对象关联，而不是纯前端状态共享。应优先明确 `campaignOutputItemId`、`distributionPackageId`、`generatedAssetId` 等服务端关联。

## 三、优先级重排

| 优先级 | 方向 | 当前判断 | 原因 |
|---|---|---|---|
| P0 | Campaign -> Studio -> Distribution 体验闭环 | 立即做 | 直接影响运营能不能用起来，反馈价值最高。 |
| P1 | 死代码/边缘模块减法 | 可并行做 | 风险较低，能降低后续维护成本。 |
| P2 | 分发中心继续组件化 | 分阶段做 | `TabDistribute` 仍大，但刚经历一轮优化，下一步应围绕体验断点拆。 |
| P3 | 大组件系统性治理 | 暂缓 | 同时拆四个大组件风险高，且不直接提升运营闭环。 |
| P3 | Zustand 或全局状态迁移 | 暂缓 | 先补业务 ID 和持久化，再评估是否需要。 |

## 四、下一轮推荐执行包

### Run 1：Campaign Production Loop Closeout

**目标**：Studio 生成结果能回到 Campaign/Distribution 上下文，形成端到端生产闭环。

范围：
- 在 Campaign -> Studio handoff 中保留稳定关联：
  - `campaignOutputPlanId`
  - `productionItemId`
  - `distributionPackageId`（如果已创建）
  - `sourceAssetRequirementIds`
- Studio 生成成功后，为结果记录来源上下文。
- Distribution Package 能识别“这个视频来自哪个 Campaign Output item”，并提供继续发布入口。
- 发布成功后跳转到历史详情或当前 batch 摘要，而不是停留在模糊状态面板。

不做：
- 不改 Dreamina/Kling/VEO 底层服务。
- 不引入全局状态库。
- 不做投放效果回流。

验证标准：
- `Campaign Creative -> Output Workbench -> Open in Studio -> Generate -> Back to Package/Distribute -> Publish` 至少能走通一条 happy path。
- 刷新页面后，已生成结果与 package 关联不丢。
- 无 source asset 的 video item 仍能进入 Studio，不阻断 prompt 生产。

### Run 2：Legacy Surface Reduction

**目标**：先做低风险减法，降低前端维护面。

范围：
- 对 `h5-video-tool/src/sj-ui` 做引用审计：
  - 静态 import 搜索。
  - 动态 import / route / iframe 入口搜索。
  - 构建产物中是否出现相关 chunk。
- 若确认未使用：
  - 删除 `src/sj-ui`。
  - 删除相关 i18n/类型/样式残留。
  - 加一个 source-level test 防止 App 重新引用遗留入口。
- 对 `RiskSentiment/TiktokMatrix` 做产品归类：
  - 如果保留：标记为运营实验/风险监控侧线，不作为 Campaign Creative 默认主链路。
  - 如果不保留：先隐藏导航，再观察是否有外部入口依赖；不要直接删除后端 route/service。

不做：
- 不碰核心 Campaign/Studio/Distribution 链路。
- 不删除任何可能被外部嵌入的路由，除非有明确证据。

验证标准：
- 前端 build 通过。
- 主路由 smoke 通过。
- 删除后行数下降，但默认体验无变化。

### Run 3：Distribution Center Step Refinement

**目标**：继续消化 `TabDistribute` 巨型组件，但围绕用户步骤拆，不做纯技术拆分。

范围：
- 把 `TabDistribute` 进一步拆为流程编排器 + 视觉步骤组件：
  - Asset / Package intake
  - Copy / platform draft cards
  - Account selection / account groups
  - Preflight / publish
  - Publish history
- 状态仍可暂时留在父组件，避免一次性迁移过大。
- 每拆一段就加 source-level presence test 和一条 smoke checklist。

不做：
- 不新增 Zustand。
- 不重写 GeeLark publish API。
- 不做定时发布/审批流/效果回流。

验证标准：
- 两条入口都可用：
  - Campaign Package path
  - Direct publish path
- `TabDistribute.tsx` 行数显著下降，但行为不变。

## 五、方案 B 的正确打开方式

方案 B 不是不要做，而是要拆小：

1. **先服务端关联**：跨页面业务对象先落在 API/SQLite，避免用 localStorage 承载关键链路。
2. **再局部 hook 化**：优先把巨型组件里的纯业务逻辑抽成 hooks，例如 `useDistributionDraft`、`usePublishHistoryFilters`、`useStudioCampaignHandoff`。
3. **最后评估 store**：只有当多个页面同时读写同一个短生命周期 UI 状态时，再考虑 Zustand。

不建议现在做：
- 一次性拆 `ProductionWizard / EditorWorkbench / TabDistribute / TabGenerate` 四个页面。
- 在业务 ID 未稳定前引入全局 store。
- 用 Zustand 替代服务端持久化。

## 六、近期不建议投入的方向

- 微服务拆分。
- 大型前端依赖升级或 UI 框架替换。
- 发布效果回流和 A/B 投放闭环。
- 多人审批流、发布日历、定时发布。
- Provider 底层大改，除非当前 run 明确需要且可验证。

## 七、决策记录

- 选择 **方案 C + 方案 A** 作为下一阶段组合。
- 方案 C 的第一个执行点不是“更多 UI”，而是 **生成结果与 package 的稳定 ID 关联**。
- 方案 A 的第一个执行点是 **`sj-ui` 引用审计与安全清理**。
- 方案 B 降级为持续治理，不作为下一轮主任务。
