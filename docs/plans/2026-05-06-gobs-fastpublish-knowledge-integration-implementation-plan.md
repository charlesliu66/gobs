# GOBS Fastpublish Knowledge Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把 fastpublish 中可复用的 knowledge 抽成 GOBS 自己的 `Campaign Knowledge Layer`，打通 `Knowledge Brain -> Campaign Creative -> Editor` 的知识闭环。

**Architecture:** 后端新增游戏级 knowledge pack 存储、导入和 context 派生 API；前端把 `Platform Framework` 里的“上传资料 -> 自动生成游戏大脑”从 mock 升级为真实数据入口；`Campaign Creative` 消费派生后的 knowledge context 生成 richer strategy，并把相同上下文继续 handoff 给 editor memory 和 prompt 链路。

**Tech Stack:** React, TypeScript, Vite, Express, node:test, local JSON storage under `API_DATA_DIR`

---

### Task 1: 锁定 knowledge pack 数据模型与存储契约

**Files:**
- Create: `h5-video-tool-api/src/services/campaignKnowledgeStore.ts`
- Create: `h5-video-tool-api/src/services/campaignKnowledgeDerivation.ts`
- Create: `h5-video-tool-api/tests/campaignKnowledgeStore.test.ts`
- Create: `h5-video-tool-api/tests/campaignKnowledgeDerivation.test.ts`
- Modify: `h5-video-tool/src/components/campaign/model.ts`
- Modify: `h5-video-tool/src/context/PlatformMemoryContext.tsx`

**Step 1:** 在前后端统一 `CampaignKnowledgePack`、`CampaignKnowledgeSource`、`DerivedCampaignKnowledgeContext` 的最小字段，不提前引入数据库。

**Step 2:** 约定后端目录结构为 `<API_DATA_DIR>/campaign-knowledge/<username>/<gameId>/...`，与现有 `editor-projects` 风格保持一致。

**Step 3:** 为 pack 存储和 context 派生补 node:test 覆盖，先验证：
- manifest 能正确读写
- selected pack ids 能稳定派生 `marketTruth / toneRules / forbiddenClaims / hookCandidates`

**Step 4:** 运行：

```bash
cd h5-video-tool-api
npx tsc --noEmit
```

Expected: 类型通过，新的 knowledge schema 不与现有 creative brief / strategy 类型冲突。

### Task 2: 新增 campaign knowledge 后端路由与导入服务

**Files:**
- Create: `h5-video-tool-api/src/routes/campaignKnowledge.ts`
- Create: `h5-video-tool-api/src/services/campaignKnowledgeImport.ts`
- Create: `h5-video-tool-api/tests/campaignKnowledgeImport.test.ts`
- Modify: `h5-video-tool-api/src/index.ts`

**Step 1:** 新增 `GET /api/campaign-knowledge/games/:gameId/packs`，返回当前游戏的所有 knowledge packs。

**Step 2:** 新增 `POST /api/campaign-knowledge/games/:gameId/import-template`，先支持从预设映射快速生成一组基础 packs。

**Step 3:** 新增 `POST /api/campaign-knowledge/games/:gameId/sources`，接收手工录入或上传后的文本 source，并归一化成 pack。

**Step 4:** 新增 `POST /api/campaign-knowledge/games/:gameId/derive-context`，根据 `selectedPackIds` 返回 `DerivedCampaignKnowledgeContext`。

**Step 5:** 给导入服务补 fail-fast 规则：
- 未知 pack type 拒绝写入
- 空 source 不生成 pack
- 相同 checksum 可选择覆盖或跳过

**Step 6:** 运行：

```bash
cd h5-video-tool-api
npx tsc --noEmit
```

Expected: 新路由成功挂载，导入与派生 API 均完成编译。

### Task 3: 把 Platform Memory 从 mock-only 升级为后端驱动

**Files:**
- Create: `h5-video-tool/src/api/campaignKnowledge.ts`
- Create: `h5-video-tool/tests/campaignKnowledgeApi.test.ts`
- Modify: `h5-video-tool/src/context/PlatformMemoryContext.tsx`

**Step 1:** 新增前端 API client，封装：
- `listKnowledgePacks`
- `importKnowledgeTemplate`
- `createKnowledgeSource`
- `deriveKnowledgeContext`

**Step 2:** 扩展 `PlatformMemoryContext`，加入：
- `knowledgePacks`
- `knowledgeLoading`
- `selectedKnowledgePackIds`
- `refreshKnowledgePacks`
- `toggleKnowledgePack`
- `importFastpublishKnowledge`
- `addKnowledgeSource`

**Step 3:** 保留现有页面其它 mock 状态，但把 knowledge 相关状态切换成真实 API 驱动。

**Step 4:** 运行：

```bash
cd h5-video-tool
npm run build
```

Expected: context 扩展后不破坏现有 platform 页面构建。

### Task 4: 把 Knowledge Brain 区块做成真实入口

**Files:**
- Modify: `h5-video-tool/src/pages/PlatformFramework.tsx`
- Create: `h5-video-tool/src/components/campaign/CampaignKnowledgePackCard.tsx`
- Create: `h5-video-tool/tests/platformKnowledgeBrain.test.tsx`

**Step 1:** 把“上传资料 -> 自动生成游戏大脑”区块从纯 mock 改成真实列表，展示：
- pack 类型
- title
- summary
- status
- source count

**Step 2:** 在页面上新增两类动作：
- 一键导入 fastpublish 推荐模板
- 添加一条知识 source

**Step 3:** 把 `uploadedFiles` 的视觉反馈与 `knowledge packs` 对齐，避免 UI 上有“已上传资料”但实际没有可消费 pack。

**Step 4:** 保留当前 Step 2 的故事线，不重做整页结构，只替换 knowledge 区块的内部数据来源。

### Task 5: 让 Campaign Creative 真正消费 knowledge context

**Files:**
- Create: `h5-video-tool/src/components/campaign/CampaignKnowledgeSelector.tsx`
- Create: `h5-video-tool/tests/campaignStrategyKnowledge.test.ts`
- Modify: `h5-video-tool/src/pages/CampaignCreative.tsx`
- Modify: `h5-video-tool/src/components/campaign/model.ts`
- Modify: `h5-video-tool/src/components/campaign/strategy.ts`
- Modify: `h5-video-tool/src/components/campaign/CampaignStrategyCard.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`

**Step 1:** 在 `CampaignCreative` 页面增加 knowledge pack 选择区，默认读取当前游戏可用的 packs。

**Step 2:** 在生成 strategy 前先调用 `derive-context`，把结果作为 `buildStrategyFromBrief` 的新增输入。

**Step 3:** 扩展 strategy 数据结构，至少增加：
- `knowledgePackIds`
- `marketTruth`
- `audienceTension`
- `toneRules`
- `forbiddenClaims`
- `visualCues`

**Step 4:** 在 `CampaignStrategyCard` 中显式展示最关键的 knowledge-driven 结果，避免这些信息只在内部 prompt 中可见。

**Step 5:** 保留 fallback：
- 没有任何 knowledge pack 时，继续走当前 heuristic-only strategy 生成

**Step 6:** 运行：

```bash
cd h5-video-tool
npm run build
```

Expected: `Campaign Creative` 在无 knowledge 和有 knowledge 两种模式下都能正常构建。

### Task 6: 把 knowledge context 继续 handoff 到 editor

**Files:**
- Modify: `h5-video-tool/src/pages/CampaignCreative.tsx`
- Modify: `h5-video-tool/src/pages/EditorWorkbench.tsx`
- Modify: `h5-video-tool/src/editor/utils/editorCreativeBrief.ts`
- Modify: `h5-video-tool-api/src/routes/editorAgent.ts`
- Modify: `h5-video-tool-api/src/services/editorCreativeBrief.ts`
- Modify: `h5-video-tool-api/src/services/editorAgentService.ts`
- Modify: `h5-video-tool-api/src/services/editorMemoryCompression.ts`
- Modify: `h5-video-tool-api/tests/editorCreativeBrief.test.ts`
- Modify: `h5-video-tool-api/tests/editorMemoryCompression.test.ts`

**Step 1:** 扩展 campaign handoff payload，追加 `knowledgeContext` 和 `knowledgePackIds`。

**Step 2:** 前端 `EditorWorkbench` 恢复这批字段，并继续通过现有 editor apply 流程发送给后端。

**Step 3:** 在后端把 knowledge context 转成 memory promotion 输入：
- `marketTruth / audienceTension` -> `stableFacts`
- `toneRules / visualCues` -> `preferenceSignals`
- `forbiddenClaims` -> `negativePreferenceSignals`

**Step 4:** 更新 `buildCreativeBriefPromptBlock` 或相邻 prompt 拼装逻辑，让 strategy + knowledge context 一起进入 editor prompt，但不要直接拼接 raw markdown。

**Step 5:** 为 editor tests 增加断言：
- knowledge context 存在时会进入 prompt
- forbidden claims 会进入 avoid bucket
- 没有 knowledge context 时旧行为不变

### Task 7: 补齐 editor 侧可见反馈

**Files:**
- Modify: `h5-video-tool/src/editor/components/AgentMemoryPanel.tsx`
- Create: `h5-video-tool/tests/agentKnowledgeMemoryPanel.test.tsx`

**Step 1:** 在 `AgentMemoryPanel` 中让用户能看见知识导入后形成的稳定事实与 avoid signals。

**Step 2:** 保持当前 panel 的风格，只增强可解释性，不把它做成新的大模块。

**Step 3:** 确保用户能区分：
- 来自当前 brief 的信息
- 来自知识包的长期约束

### Task 8: 文档、验证与发布准备

**Files:**
- Modify: `PRODUCT.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/workflow/runs/<run-id>/SESSION-ANCHOR.md`
- Modify: `docs/workflow/runs/<run-id>/planner-spec.md`
- Modify: `docs/workflow/runs/<run-id>/builder-report.md`
- Modify: `docs/workflow/runs/<run-id>/verifier-report.md`
- Modify: `docs/workflow/runs/<run-id>/release-decision.md`

**Step 1:** 在真正开始实现本计划前，新建一个独立 run，把本方案写入 `SESSION-ANCHOR` 和 `planner-spec`。

**Step 2:** 实现完成后至少执行：

```bash
cd h5-video-tool-api
npx tsc --noEmit

cd ../h5-video-tool
npm run build
```

Expected: 前后端构建通过。

**Step 3:** 手动走一遍端到端链路：
- 在 `Platform Framework` 导入一组 knowledge packs
- 打开 `Campaign Creative` 勾选 packs 并生成 strategy
- 进入 editor，确认 memory 和首次生成保留相同的 tone / avoid / angle

**Step 4:** 更新 `PRODUCT.md` 与 `CHANGELOG.md`，再进入 staging -> 验证 -> prod 的发布流程。

---

## 推荐实施顺序

1. `Task 1 + Task 2`
   - 先把后端 schema、存储和 API 奠定好
2. `Task 3 + Task 4`
   - 再把 Knowledge Brain 从 mock 变成真实入口
3. `Task 5`
   - 再让 Campaign Creative 变成 knowledge-aware
4. `Task 6 + Task 7`
   - 最后贯通 editor 和记忆层

这个顺序的好处是：

- 不会先做 UI 再倒逼后端拼凑字段
- 不会先把 raw markdown 塞进 prompt，导致后续难以收敛
- 能保证每一步都有可见业务价值

---

## 验收口径

计划执行完成后，需要满足以下验收口径：

1. 游戏维度的 knowledge packs 能真实保存和再次读取。
2. `Campaign Creative` 能基于 selected packs 生成更具体的 strategy，而不是只沿用本地默认 heuristics。
3. editor prompt 和记忆面板都能保留相同的品牌语气和合规边界。
4. 没有 knowledge pack 时，旧链路不回归。

---

Plan complete and saved to `docs/plans/2026-05-06-gobs-fastpublish-knowledge-integration-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
