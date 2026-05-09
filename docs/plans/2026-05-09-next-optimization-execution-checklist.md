# GOBS Next Optimization Execution Checklist

> Date: 2026-05-09
> Owner: Charles / Codex
> Source: 二轮优化后 OpenClaw 评估、GOBS 当前代码事实、最近 Distribution / Campaign -> Studio / release deploy 实操结果。
> Purpose: 将下一阶段优化从“方向判断”落成可逐项开工、验收和发布的执行清单。

## 1. Executive Decision

推荐执行顺序不是简单的 `A > C > B`，而是：

1. **P0 - 发布与协作稳定性收口**：先把多窗口协作、deploy 慢/卡、staging/prod 发布纪律稳定下来。
2. **P1 - 低风险减负清理**：优先处理 `sj-ui`、workflow run 膨胀策略、legacy route 可见性。
3. **P1 - Distribution 最后一公里体验**：继续打磨真实运营 happy path，而不是马上大拆架构。
4. **P2 - 跨模块数据契约治理**：先定义 Campaign / Studio / Distribution 的 ID 关系和持久化边界。
5. **P3 - 巨型组件拆解**：ProductionWizard / EditorWorkbench / TabGenerate 等进入测试先行、分阶段拆解。

一句话：**先稳施工脚手架，再清场地，再把运营主链路做顺，最后再动承重墙。**

## 2. Current Assessment After Round 2

### 2.1 已经明显改善

- Distribution Center 已经从“单个大页堆逻辑”转向“步骤组件 + view-model helper + recent context utility”的结构。
- Campaign -> Studio -> Distribution 已经有了完整数据流：Campaign Output item 可以进入 Studio，Studio 生成结果可以回填 Package / Output Plan，再进入 Distribution。
- 发布历史已从纯前端最近列表升级到后端兼容筛选、分页和 CSV export。
- 部署链路已经脚本化，并暴露出真实环境中的 SSH 上传/认证问题，这是好事：问题从“隐形手工风险”变成“可修的脚本风险”。

### 2.2 仍是关键问题

- `sj-ui` 仍是最大可删除候选：约 16,838 行、当前扫描零运行引用、占前端代码量约 20%。
- workflow run 文档已经明显膨胀：有审计价值，但主分支 review 噪音越来越大。
- `TabDistribute` 虽然变好，但 state / side effects 仍集中在父组件，不宜继续无限加功能。
- ProductionWizard / EditorWorkbench / TabGenerate 仍是巨型组件，但现在不是最应该优先动的地方。
- 状态治理仍以 `Context + URL + localStorage` 为主，短期可接受，但核心业务关联不能长期靠 localStorage。
- release deploy 仍要收口：最近真实发布中 SSH 上行链路极慢，说明部署脚本还需要一个专门 hardening run。

## 3. Execution Order Evaluation

| 顺序 | 方向 | 是否调整 OpenClaw 建议 | 判断 |
|---|---|---|---|
| 0 | 发布/协作稳定性 | 新增前置项 | 必须先做。否则开发再快，发版卡住会吞掉所有收益。 |
| 1 | workflow runs 治理策略 | 拆出独立项 | 不建议直接 `.gitignore` 全部 runs；先做 archive policy 和工具化。 |
| 2 | `sj-ui` 安全删除 | 保留 OpenClaw A | 优先级高、收益明确、风险低。 |
| 3 | Distribution 最后一公里 | 保留 OpenClaw C | 已经有模块化基础，继续做体验收益最高。 |
| 4 | RiskSentiment / TiktokMatrix / Platform 隔离 | 从 A 中拆出 | 不直接删除，先隐藏/标记/保留 direct link。 |
| 5 | 数据契约治理 | 提前于 Zustand | 先稳 ID / persistence，再考虑 store。 |
| 6 | 巨型组件治理 | 延后 OpenClaw B | 要做，但必须测试先行、分段拆，不能一次性大改。 |

## 4. Run 0 - Release And Collaboration Stabilization

> Execution status: started in `docs/workflow/runs/2026-05-09-release-and-workflow-governance/`. This first pass is commit-only by request; staging/prod validation belongs to a separate Release Owner window.

### Goal

让三窗口协作和发版链路稳定可重复，避免部署窗口与开发窗口互相覆盖，避免 SSH 上传卡住导致半发布状态。

### Scope

- 固化“三窗口协作”：
  - 开发窗口 A/B：只开发、测试、commit、push。
  - 部署窗口 C：只部署、smoke、恢复 deployment state。
  - 部署前强制 `git fetch origin main`、`git status --short`、`HEAD == origin/main`。
- 收口 deploy 脚本：
  - 评估当前 `deploy_api.py` 分片上传实现是否应该保留、简化或替换。
  - 给 SSH 上传增加更明确的 timeout、retry、progress、失败清理。
  - 保证 prod frontend promotion 继续使用 server-side staging -> prod，不重复本地上传。
- 增加一份简短 release operator checklist。

### Suggested Files

- `scripts/deploy_api.py`
- `scripts/deploy_frontend.py`
- `scripts/deploy_all.py`
- `scripts/tests/test_deploy_api.py`
- `scripts/tests/test_deploy_frontend.py`
- `docs/guides/` 或 `docs/plans/`
- `CHANGELOG.md`
- `PRODUCT.md`

### Acceptance Criteria

- `python -m unittest scripts.tests.test_deploy_api scripts.tests.test_deploy_frontend scripts.tests.test_deploy_all scripts.tests.test_release_guard scripts.tests.test_set_deployment_state` PASS。
- staging deploy 不需要人工手动拆分上传即可完成。
- prod deploy 能从 staging promote frontend，并完成 version convergence。
- 部署失败时不会长期停在 `deploying`；必须有明确恢复 `idle` 的步骤。
- 文档写清楚：什么时候允许 emergency bypass，什么时候必须等 staging。

### Risks

- 上传脚本继续膨胀，变成难维护的“网络补丁集合”。
- 如果另一个窗口同时部署，仍可能覆盖 PM2 / frontend 目录。

### Go / No-Go

- GO：SSH 上传可以稳定完成，且脚本测试覆盖失败路径。
- NO-GO：仍需手动上传前端，或需要人工清理服务器 `/tmp` 才能发版。

## 5. Run 1 - Workflow Run Governance

### Goal

减少 `docs/workflow/runs` 对主分支 review 的噪音，同时保留 4+1 审计价值。

### Recommendation

不建议直接把 `docs/workflow/runs` 整体 `.gitignore`。原因：

- 当前 `gobs-multi-agent-dev-loop` 依赖 run 文档做 scope guard、Builder/Verifier 证据和 release decision。
- 直接忽略可能导致另一个电脑 pull 后缺少上下文。
- 最低风险方案是：**主分支保留 active/latest runs，历史 runs 自动归档**。

### Scope

- 定义 run 生命周期：
  - `active`: 当前仍会被继续开发或 release 引用。
  - `closed`: 已发布且不再修改。
  - `archived`: 仅保留索引和压缩/迁移记录。
- 主分支策略：
  - `docs/workflow/runs/` 保留最近 N 个 active/critical runs。
  - 历史 run 迁入 `docs/workflow/archive/` 或 `workflow-archive` 分支。
  - `docs/TASK-INDEX.md` 只保留活跃 run 和重要历史链接。
- 增加 archive 工具脚本：
  - 列出超过 N 天且 release-decision GO 的 run。
  - 生成 archive manifest。
  - 不自动删除，先 dry-run。

### Suggested Files

- `docs/workflow/README.md`
- `docs/TASK-INDEX.md`
- `docs/plans/README.md`
- `scripts/archive_workflow_runs.py`（如果决定工具化）

### Acceptance Criteria

- 有明确规则说明哪些 run 能归档、哪些不能。
- `gobs-multi-agent-dev-loop` 仍能找到当前 active run。
- `docs/TASK-INDEX.md` 可读性提升，不再列出过多过期 run。
- 首轮只 dry-run 或移动少量已关闭 run，不一次性大迁移。

### Risks

- Codex / OpenClaw / Cursor 继续按旧路径创建 run，导致归档策略失效。
- 误归档仍在使用的 run，导致下一轮上下文丢失。

## 6. Run 2 - `sj-ui` Safe Deletion

### Goal

删除确认未使用的 `h5-video-tool/src/sj-ui`，降低前端代码体积和认知负担。

### Why Now

- 收益最大：约 16,838 行，占前端约 20%。
- 当前审计显示无 active imports。
- 风险比删除路由低，因为 `sj-ui` 没有在 App route 或 Layout nav 中使用。

### Scope

- 再跑一次引用审计：
  - static import
  - dynamic import
  - alias `@sj`
  - string route / iframe / docs reference
- 删除 tooling references：
  - `h5-video-tool/vite.config.ts` 中 `@sj` alias。
  - `h5-video-tool/tsconfig.app.json` 中 `src/sj-ui` exclude。
  - `h5-video-tool/eslint.config.js` 中 `src/sj-ui/**` ignore。
- 删除 `h5-video-tool/src/sj-ui/`。
- 增加 source-level test，防止 active app 再引入 `sj-ui` 或 `@sj`。

### Suggested Files

- `h5-video-tool/src/sj-ui/`
- `h5-video-tool/vite.config.ts`
- `h5-video-tool/tsconfig.app.json`
- `h5-video-tool/eslint.config.js`
- `h5-video-tool/tests/legacySurfacePresence.test.ts` 或同类测试

### Acceptance Criteria

- `rg` 扫描确认 app/test active source 无 `sj-ui` / `@sj` 引用。
- frontend build PASS。
- default routes smoke PASS。
- 删除后没有修改 Campaign / Studio / Distribution 业务行为。

### Risks

- 外部文档或历史说明中仍有 `@sj` 文字引用，不影响 runtime，但 review 时要区分文档引用和代码引用。
- 如果存在非常规 runtime string import，静态扫描可能漏掉；因此必须 build + smoke。

## 7. Run 3 - Distribution Last Mile Polish

### Goal

让市场/运营从 Campaign Package 或直接发布两条路径进入 `/distribute` 时，少思考、少回填、少丢上下文。

### Scope

- 删除或隐藏残留的重复 Campaign 手动输入：
  - 保留 Package inherited context 只读摘要。
  - Direct publish path 只保留轻量 `captionHint`。
  - 避免让运营在 Distribution 重新填写 Brief。
- Package deep link 行为：
  - `/distribute?package=xxx` 成功加载后自动定位到最需要操作的步骤。
  - 如果缺 asset，定位到 Asset step。
  - 如果缺账号，定位到 Accounts step。
  - 如果已 ready，定位到 Publish step。
- 发布成功后体验：
  - current batch 摘要突出成功/失败/等待数量。
  - 一键跳到当前 batch 对应历史详情或历史区域。
  - publish history refresh 和 scroll 不互相打架。
- recentContext 文案：
  - 明确为“当前浏览器最近使用”。
  - 不自动恢复，不自动发布。

### Suggested Files

- `h5-video-tool/src/pages/TabDistribute.tsx`
- `h5-video-tool/src/components/distribute/DistributeStepCopy.tsx`
- `h5-video-tool/src/components/distribute/DistributeStepPublish.tsx`
- `h5-video-tool/src/components/distribute/DistributeRecentContextPanel.tsx`
- `h5-video-tool/src/components/distribute/distributePageViewModel.ts`
- `h5-video-tool/src/components/distribute/distributionRecentContext.ts`
- `h5-video-tool/src/i18n/messages.ts`

### Acceptance Criteria

- Campaign Package path：
  - package loads.
  - inherited context appears as read-only summary.
  - no duplicate Brief form blocks the operator.
- Direct publish path：
  - operator can select asset, add/generate caption, select account, publish.
  - no campaign-heavy fields required.
- Refresh path：
  - recent context card appears.
  - explicit restore works.
  - stale account ids are filtered.
- Publish result：
  - latest batch has clear summary and next action.
  - history refresh works.

### Risks

- Locale keys may remain even after UI removal. This is acceptable if removal is staged, but final cleanup should remove unused keys or add a note.
- DOM id based scrolling can break after future component moves; source test should check section ids.

## 8. Run 4 - Account Group And Lightweight Onboarding

### Goal

减少高频运营重复选择账号的摩擦，并让首次使用者理解 4 步分发流程。

### Scope

- 账号组增强：
  - 组内账号预览。
  - 自定义组编辑：添加/移除账号。
  - 标记失效账号，并提供一键清理。
- Onboarding：
  - 首次进入 `/distribute` 显示 4 步轻提示。
  - 可关闭，并记住关闭状态。
  - 不遮挡高频操作，不强制教学流程。

### Suggested Files

- `h5-video-tool/src/components/distribute/AccountGroupPicker.tsx`
- `h5-video-tool/src/utils/accountGroups.ts`
- `h5-video-tool/src/components/distribute/DistributeStepReadinessNav.tsx`
- `h5-video-tool/src/i18n/messages.ts`

### Acceptance Criteria

- 账号组预览不改变已选账号，只有明确点击才应用。
- 编辑组只影响 custom groups，不改 config groups。
- Onboarding 可关闭，刷新后不再出现。
- localStorage malformed data 不会让页面崩溃。

### Risks

- Onboarding 做重会干扰熟练运营；必须轻量、可关闭。
- 账号权限变化后旧组可能失效；必须过滤当前账号列表。

## 9. Run 5 - RiskSentiment / TiktokMatrix / Platform Isolation

### Goal

把非主线功能从默认产品心智中降级，减少“这个项目到底是 Campaign Agent 还是一堆工具”的认知混乱。

### Scope

- `/tiktok-matrix`：
  - 先从主导航隐藏或改为 Experimental / Legacy label。
  - direct route 保留一个 release。
  - 不直接删除 `RiskSentimentPage`。
- Platform pages：
  - 保持 direct-link-only。
  - 在文档中归类为 parked planning surfaces。
  - 如果后续没有使用证据，再做删除 run。

### Suggested Files

- `h5-video-tool/src/App.tsx`
- `h5-video-tool/src/components/Layout.tsx`
- `h5-video-tool/src/pages/RiskSentimentEmbed.tsx`
- `h5-video-tool/src/pages/TiktokMatrix.tsx`
- `h5-video-tool/src/pages/PlatformFramework.tsx`
- `h5-video-tool/src/pages/PlatformMemory.tsx`
- `h5-video-tool/src/pages/PlatformLearningLab.tsx`
- `h5-video-tool/src/pages/PlatformOpsCenter.tsx`

### Acceptance Criteria

- Campaign / Studio / Distribution 主导航更清晰。
- `/tiktok-matrix` 如被隐藏，direct URL 仍能打开。
- Platform routes 保持 direct URL 可访问。
- build + smoke PASS。

### Risks

- 如果有外部 iframe 或书签依赖，直接删除会造成隐性回归；因此本 run 只隐藏/标记，不删除。

## 10. Run 6 - Campaign / Studio / Distribution Data Contract

### Goal

把跨页面业务对象关联从“临时上下文”升级为明确的数据契约，避免 localStorage / router state 成为关键链路。

### Core Contract

需要稳定定义以下关系：

- `campaignId`
- `campaignOutputPlanId`
- `productionItemId`
- `distributionPackageId`
- `generatedAssetId`
- `sourceAssetRequirementId`

### Scope

- 写一份 contract doc，明确每个 ID 的 owner、生命周期、存储位置、可为空条件。
- 检查当前 API response 是否已经能承载这些关系。
- 如果需要新增字段，优先走兼容 additive fields，不破坏旧数据。
- recentContext 仍保持 local browser cache，不升级为关键业务存储。

### Suggested Files

- `docs/plans/`
- `h5-video-tool/src/components/campaign/studioPackagePatch.ts`
- `h5-video-tool/src/context/CreateFlowContext.tsx`
- `h5-video-tool/src/api/campaignOutputPlan.ts`
- `h5-video-tool-api/src/routes/campaignOutputPlan.ts`
- `h5-video-tool-api/src/services/campaignOutputPlan.ts`

### Acceptance Criteria

- 有 contract doc。
- Campaign -> Studio -> Distribution 的每个跳转能说明用哪个 ID 恢复上下文。
- 刷新后关键业务关联不依赖 localStorage。
- 不引入 Zustand。

### Risks

- 过早改数据库 schema 可能扩大范围；优先 doc + additive fields。
- 如果把 UI 状态和业务状态混在一起，会让 contract 变脏。

## 11. Run 7 - Giant Component Preparation

### Goal

为 ProductionWizard / EditorWorkbench / TabGenerate 的拆解补齐测试和边界，不立刻大拆。

### Scope

- 先补关键路径 source/render tests：
  - ProductionWizard：project load、storyboard status、batch generate入口、export入口。
  - EditorWorkbench：timeline load、agent command入口、preview/export入口。
  - TabGenerate：prompt input、model options、generation status、result history入口。
- 先抽 pure helpers / view-model，不移动核心 state。
- 写拆分设计，而不是直接改 2,000 行组件。

### Acceptance Criteria

- 每个巨型组件至少有一组“核心入口仍存在”的 source-level regression tests。
- 拆分计划明确 state owner、side effects、presentational components。
- 不在同一个 run 同时拆多个巨型组件。

### Risks

- 没有测试直接拆，回归概率高。
- ProductionWizard / EditorWorkbench 涉及视频任务、时间线和导出，一旦状态边界拆错，问题很难靠静态测试发现。

## 12. Global Definition Of Done

每个 run 完成时必须满足：

- Planner / Challenger / Builder / Verifier / ReleaseDecision 文档齐全，除非该 run 明确是纯规划文档。
- 前端 build PASS。
- 后端 build PASS，除非 run 明确不触及 runtime 且有记录说明。
- Focused tests PASS。
- `git diff --check` PASS。
- `PRODUCT.md` 和 `CHANGELOG.md` 同步更新。
- 提交并 push 到 `origin/main`。
- 发布类 run 由专门部署窗口完成 staging/prod 或明确记录为什么不部署。

## 13. Suggested Calendar

| Week | Focus | Expected Output |
|---|---|---|
| Week 1 | Run 0 + Run 1 | 部署链路稳定；workflow run 归档策略明确。 |
| Week 1 | Run 2 | 删除 `sj-ui` 与工具引用，前端 build/smoke PASS。 |
| Week 2 | Run 3 | Distribution 去重输入、package deep link 定位、发布后详情体验。 |
| Week 2 | Run 4 | 账号组编辑和轻 onboarding。 |
| Week 3 | Run 5 + Run 6 | Legacy route 降级；Campaign/Studio/Distribution ID contract。 |
| Week 4+ | Run 7 | 巨型组件测试补齐和拆分设计，准备下一阶段治理。 |

## 14. Immediate Next Task Recommendation

如果下一条指令是“开始执行”，建议先开：

`2026-05-09-release-and-workflow-governance`

原因：

- 最近真实发布已经证明 deploy 链路仍是最大不确定性。
- 三窗口协作需要制度化，否则前两个开发窗口和部署窗口会互相覆盖。
- 这个 run 做完后，后续 `sj-ui` 删除和 Distribution 打磨会更顺，不会每次都被发版卡住。

如果希望直接做产品可见收益，则开：

`2026-05-09-distribution-last-mile-polish`

但前提是部署窗口保持独占，不和开发窗口并发发布。
