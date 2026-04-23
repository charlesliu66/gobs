# Production Wizard Usability Trim Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将高级制片从“功能密集型专业工作台”收敛为“默认路径清晰、状态可信、专业能力可展开”的生产向导，并与平台易用性/效率优化主线对齐。

**Architecture:** 本计划采用低风险渐进式改造：先通过文档和配置明确范围，再做前端默认模式瘦身与分镜切换体验优化，最后补齐任务状态口径、数据归属约束和文档治理。首轮尽量不改底层生成服务，不触碰已列为禁区的后端服务文件。

**Tech Stack:** React + Vite 前端 `h5-video-tool/`，Node.js + TypeScript + Express 后端 `h5-video-tool-api/`，项目文档 `PRODUCT.md` / `docs/plans/` / `docs/workflow/runs/`，部署遵循 staging -> prod SOP。

---

## 0. 背景与输入

### 0.1 必读文档

- `.claude/memory/feedback.md`
- `docs/TASK-INDEX.md`
- `docs/plans/2026-04-23-platform-usability-efficiency-optimization.md`
- `PRODUCT.md`
- `docs/guides/2026-04-23-single-owner-staging-prod-release-runbook.md`

### 0.2 本轮产品判断

高级制片当前能力很强，但默认暴露的功能过多。用户真正关心的是：

1. 我现在在哪一步。
2. 我点了之后有没有真的开始。
3. 任务卡在哪里，能不能恢复。
4. 最后能不能拿到可播放结果，并继续进入剪辑/分发。

本轮不追求新增大功能，而是优先做减法和路径收口。

### 0.3 本轮不做

- 不新增更多模型入口。
- 不重做整个 H5 视觉系统。
- 不改底层生成服务文件。
- 不在状态模型未统一前继续扩大任务看板功能。
- 不在数据归属未固化前继续增加跨项目复用能力。

### 0.4 禁止修改文件

除非用户在当前 run 中重新明确批准，否则不要修改：

- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/types/productionTypes.ts`
- `h5-video-tool-api/src/config/productionAssets.ts`
- `.env`

---

## 1. 总体执行顺序

推荐拆成 5 个可独立验收的阶段：

| Phase | 名称 | 目标 | 风险 |
|---|---|---|---|
| Phase 0 | Run 与验收基线 | 建立本轮任务规格、验收标准和文档边界 | 低 |
| Phase 1 | 高级制片默认模式瘦身 | 主流程只保留必要动作，高级工具收纳 | 中低 |
| Phase 2 | 多分镜切换体验优化 | 分镜列表状态清晰，可筛选、可定位、可重试 | 中 |
| Phase 3 | 用户态任务状态统一起步 | 分镜页/任务看板/历史页统一展示用户能懂的状态 | 中高 |
| Phase 4 | 文档与治理收口 | 更新 PRODUCT/CHANGELOG 策略、沉淀状态模型和归属模型 | 低 |

如果时间有限，优先完成 Phase 0-2。Phase 3-4 可以作为后续 run。

---

## 2. 核心取舍表

| 功能 | 处理 | 说明 |
|---|---|---|
| 输入设定 | 保留 | 视频风格、画幅、故事类型、参考图是主流程源头 |
| 从素材库选参考图 | 保留 | 降低重复上传成本 |
| 参考图反解析 | 保留 | 对非专业用户有明显帮助 |
| 故事大纲重新生成 | 保留 | 但要提示会影响后续内容 |
| 多版本故事弧 | 删除概念 | 当前没有真实完整版本体验，不作为功能宣传 |
| 角色设计 | 保留 | 影响连续性和生成质量 |
| 场景设计 | 保留 | 影响画面质量和分镜稳定性 |
| 道具设计 | 移到高级功能 | 默认不应占据主流程 |
| 形象演化树 | 移到高级功能 | 主界面改成“角色形象/形象变体” |
| 形象演化按钮 | 改名/改行为 | 改成“编辑形象变体”，点击打开明确弹窗/抽屉 |
| 分镜表生成 | 保留 | 主流程核心 |
| 分镜手动编辑 | 保留 | 用户需要控制感 |
| 生成分镜图 | 从默认主流程删除 | 只有作为 image2video 首帧时才放高级功能 |
| 生成分镜视频 | 保留 | 核心产物 |
| 批量生成缺失视频 | 保留 | 效率和留存关键 |
| 批量任务状态 | 保留 | 解决等待焦虑 |
| 分镜页连续播放 | 删除 | 与放映室重复 |
| 放映室 | 保留 | 统一审片入口 |
| A/B 对比 | 删除或高级隐藏 | 当前默认价值低 |
| AI 审片 | 移到高级功能 | 专业能力，不挡主流程 |
| 连续性检查 | 移到高级功能 | 成片前高级检查 |
| 完整字段编辑 | 移到高级功能 | 默认只露出关键字段 |
| Prompt 一致性检查 | 移到高级功能 | 可变成导出前风险提示 |

---

## 3. 验收标准

### 3.1 用户体验验收

- 新用户进入高级制片后，默认只看到一条清晰主路径：输入 -> 故事 -> 角色/场景 -> 分镜 -> 视频 -> 审片/剪辑。
- 每一步都有一个主按钮，用户不需要猜“下一步点哪个”。
- 形象演化不再作为默认复杂树状功能暴露。
- 分镜切换能清楚看到每个分镜状态：未生成、排队中、生成中、已完成、失败、已取消。
- “生成分镜图”不再作为默认主按钮误导用户。
- 放映室成为唯一默认连续审片入口。

### 3.2 工程验收

- 前端构建通过：`cd h5-video-tool && npm run build`
- 后端 TypeScript 检查通过：`cd h5-video-tool-api && npx tsc --noEmit`
- 相关单测通过，至少覆盖新增的状态/筛选/展示逻辑。
- 不修改禁区文件。
- 不引入新的硬编码密钥。
- 新增 UI 文案尽量进入 i18n 消息体系；如历史组件暂未 key 化，需要在 builder report 中记录。

### 3.3 发布验收

- 本地构建通过。
- 代码提交并 push 到 `origin/main`。
- 先部署 staging。
- staging 验证通过后再标记 release ready。
- 再部署 prod。
- prod 验证完成后恢复 deployment state idle。

---

## 4. Phase 0: Run 与验收基线

### Task 0.1: 创建 workflow run 目录

**Files:**

- Create: `docs/workflow/runs/2026-04-23-production-wizard-usability-trim/SESSION-ANCHOR.md`
- Create: `docs/workflow/runs/2026-04-23-production-wizard-usability-trim/planner-spec.md`
- Create: `docs/workflow/runs/2026-04-23-production-wizard-usability-trim/challenger-review.md`

**Step 1: 创建目录**

Run:

```bash
mkdir -p docs/workflow/runs/2026-04-23-production-wizard-usability-trim
```

Expected: 目录存在。

**Step 2: 写 SESSION-ANCHOR**

写入内容要包含：

- 本轮目标。
- 明确不触碰禁区文件。
- 优先文件范围。
- 验收命令。
- staging/prod 发布要求。

**Step 3: 写 planner-spec**

必须包含：

- 背景。
- 用户路径问题。
- 功能取舍表。
- AC。
- 非目标。
- 风险矩阵。
- 测试矩阵。

**Step 4: 写 challenger-review**

先写初版挑战问题：

- 是否会误删仍被 image2video 使用的首帧能力。
- 是否会让高级用户找不到原有工具。
- 是否会破坏分镜视频生成路径。
- 是否会让 i18n 残留更多。

**Step 5: Commit**

Run:

```bash
git add docs/workflow/runs/2026-04-23-production-wizard-usability-trim docs/plans/2026-04-23-production-wizard-usability-trim.md
git commit -m "docs: plan production wizard usability trim"
```

Expected: 只提交本轮文档，不带入无关 dirty 文件。

---

## 5. Phase 1: 高级制片默认模式瘦身

### Task 1.1: 给高级制片增加默认/高级工具分层

**Files:**

- Modify: `h5-video-tool/src/pages/ProductionWizard.tsx`
- Modify: `h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`

**Goal:** 默认界面只展示主流程工具，高级工具统一收进一个入口。

**Step 1: 找到高级工具挂载点**

重点检查：

- `StepStoryboardAiReview`
- `StepStoryboardQuickAdjust`
- `StepStoryboardContinuityCheck`
- `StepStoryboardAbCompare`
- `StepStoryboardContinuousPlay`
- `StepExportPromptConsistency`

Run:

```bash
Select-String -Path "h5-video-tool/src/pages/ProductionWizard.tsx","h5-video-tool/src/studio/steps/*.tsx" -Pattern "AiReview|QuickAdjust|Continuity|AbCompare|ContinuousPlay|PromptConsistency"
```

Expected: 找到所有默认展示入口。

**Step 2: 增加 `showAdvancedTools` 状态**

在 `ProductionWizard.tsx` 或 `StepStoryboardWorkspace.tsx` 中新增本地 UI 状态。

Acceptance:

- 默认值为 `false`。
- 页面刷新后不要求持久化。
- 高级工具入口文案清晰，例如“高级工具”。

**Step 3: 收纳高级工具**

默认隐藏：

- AI 审片。
- 连续性检查。
- 快速调整面板。
- A/B 对比入口。
- 完整字段编辑中的低频字段。

保留默认展示：

- 当前分镜核心描述。
- 生成分镜视频。
- 批量生成缺失视频。
- 任务状态。
- 预览结果。

**Step 4: Run frontend build**

Run:

```bash
cd h5-video-tool
npm run build
```

Expected: build 成功。

**Step 5: Commit**

Run:

```bash
git add h5-video-tool/src/pages/ProductionWizard.tsx h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx h5-video-tool/src/i18n/messages.ts
git commit -m "feat: simplify production wizard default tools"
```

Expected: commit 只包含本任务相关文件。

### Task 1.2: 下线默认“生成分镜图”入口

**Files:**

- Modify: `h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`
- Modify: `h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`

**Goal:** 默认主流程不再展示“生成分镜图”，避免用户以为它一定会作为即梦参考图。

**Step 1: 确认现有首帧链路**

检查 `generateVideoForShotIdx` 中 `previewStillDataUrl` 的使用。

Run:

```bash
Select-String -Path "h5-video-tool/src/pages/ProductionWizard.tsx" -Pattern "previewStillDataUrl|image2video|handleGenerateShotFrame" -Context 3,6
```

Expected: 确认首帧仍可被 image2video 使用。

**Step 2: 调整按钮展示**

实现策略：

- 默认不展示“生成分镜图”。
- 在高级工具模式下展示，并改文案为“生成首帧”。
- 如选择 image2video 且没有首帧，显示明确提示“需要先生成或上传首帧”。

**Step 3: 保留函数，不删除底层能力**

不要删除：

- `handleGenerateShotFrame`
- `onGenerateShotFrame`
- `previewStillDataUrl` 数据字段

**Step 4: Run frontend build**

Run:

```bash
cd h5-video-tool
npm run build
```

Expected: build 成功。

**Step 5: Commit**

Run:

```bash
git add h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx h5-video-tool/src/i18n/messages.ts
git commit -m "feat: move storyboard still generation to advanced tools"
```

### Task 1.3: 形象演化树降级为高级功能

**Files:**

- Modify: `h5-video-tool/src/studio/steps/StepDesignCharactersPanel.tsx`
- Modify: `h5-video-tool/src/components/production/CharacterLookTreeCanvas.tsx`
- Modify: `h5-video-tool/src/components/production/CharacterPortraitEditorModal.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`

**Goal:** 主界面不再默认强调“形象演化树”，改成更易懂的“角色形象/形象变体”。

**Step 1: 改主界面文案**

推荐替换：

- “形象演化树” -> “角色形象变体”
- “形象演化”按钮 -> “编辑形象变体”
- “分支” -> “生成新变体”
- “定稿” -> “设为当前形象”

**Step 2: 修改按钮行为**

当前按钮如果只是切换焦点，体验像“没反应”。需要改为：

- 点击后打开明确区域、抽屉或弹窗。
- 若仍在页面内展开，滚动到展开区域并给出标题反馈。
- Toast 提示可以作为辅助，但不要只靠 toast。

**Step 3: 默认折叠树状视图**

主界面默认展示角色卡片和当前定稿形象。

高级区域展示：

- 树状关系。
- 重绘。
- 新增分支。
- 设为当前形象。

**Step 4: Run frontend build**

Run:

```bash
cd h5-video-tool
npm run build
```

Expected: build 成功。

**Step 5: Commit**

Run:

```bash
git add h5-video-tool/src/studio/steps/StepDesignCharactersPanel.tsx h5-video-tool/src/components/production/CharacterLookTreeCanvas.tsx h5-video-tool/src/components/production/CharacterPortraitEditorModal.tsx h5-video-tool/src/i18n/messages.ts
git commit -m "feat: simplify character look variant editing"
```

---

## 6. Phase 2: 多分镜切换体验优化

### Task 2.1: 抽取分镜用户态状态工具

**Files:**

- Create: `h5-video-tool/src/studio/shotUserStatus.ts`
- Create: `h5-video-tool/tests/shotUserStatus.test.ts`
- Modify: `h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`

**Goal:** 在不重构全平台状态中心前，先为高级制片分镜列表提供稳定的用户态状态。

**Step 1: 写 failing test**

Test cases:

- 有视频 -> `completed`
- active job `awaiting_submit` -> `waiting_submit`
- job status `queuing` -> `platform_queueing`
- job status `processing` -> `generating`
- job status `failed` 且无视频 -> `failed`
- job status `cancelled` 且无视频 -> `cancelled`
- 无视频无 job -> `not_started`

Expected test file outline:

```ts
import { getShotUserStatus } from '../src/studio/shotUserStatus';

describe('getShotUserStatus', () => {
  it('returns completed when shot has preview media', () => {
    expect(getShotUserStatus({
      hasVideo: true,
      jobStatus: undefined,
      hasPendingSubmitId: false,
    }).status).toBe('completed');
  });
});
```

**Step 2: Run test to verify fail**

Run:

```bash
cd h5-video-tool
npm test -- shotUserStatus
```

Expected: fail because file/function does not exist.

**Step 3: Implement utility**

Create `shotUserStatus.ts` with:

```ts
export type ShotUserStatus =
  | 'not_started'
  | 'waiting_submit'
  | 'platform_queueing'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export function getShotUserStatus(input: {
  hasVideo: boolean;
  jobStatus?: 'awaiting_submit' | 'queuing' | 'processing' | 'failed' | 'cancelled';
  hasPendingSubmitId?: boolean;
}): { status: ShotUserStatus; labelKey: string } {
  if (input.hasVideo) return { status: 'completed', labelKey: 'productionWizard.status.completed' };
  if (input.jobStatus === 'failed') return { status: 'failed', labelKey: 'productionWizard.status.failed' };
  if (input.jobStatus === 'cancelled') return { status: 'cancelled', labelKey: 'productionWizard.status.cancelled' };
  if (input.jobStatus === 'processing' || input.hasPendingSubmitId) {
    return { status: 'generating', labelKey: 'productionWizard.status.generating' };
  }
  if (input.jobStatus === 'queuing') return { status: 'platform_queueing', labelKey: 'productionWizard.status.platformQueueing' };
  if (input.jobStatus === 'awaiting_submit') return { status: 'waiting_submit', labelKey: 'productionWizard.status.waitingSubmit' };
  return { status: 'not_started', labelKey: 'productionWizard.status.notStarted' };
}
```

Adjust details to match existing project test tooling and i18n helpers.

**Step 4: Run tests**

Run:

```bash
cd h5-video-tool
npm test -- shotUserStatus
```

Expected: PASS.

**Step 5: Commit**

Run:

```bash
git add h5-video-tool/src/studio/shotUserStatus.ts h5-video-tool/tests/shotUserStatus.test.ts
git commit -m "feat: add production shot user status helper"
```

### Task 2.2: 将横向分镜条升级为可筛选状态列表

**Files:**

- Modify: `h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`
- Modify: `h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`
- Test: `h5-video-tool/tests/shotUserStatus.test.ts`

**Goal:** 分镜多时，用户能快速知道哪些没生成、哪些在排队、哪些失败。

**Step 1: 设计 UI 结构**

推荐结构：

- 顶部状态筛选：全部、未开始、排队中、生成中、已完成、失败。
- 分镜项显示：`#3 / 8s / 场景名 / 状态 badge`。
- 当前选中项强高亮。
- 失败项直接显示重试/取消入口。

**Step 2: 保持原回调不变**

不要改变这些外部接口含义：

- `onSelectShot`
- `onCancelShotJob`
- `shotActiveJobMap`
- `shotJobStatusMap`
- `shotJobQueueInfoMap`

**Step 3: 增加状态筛选本地状态**

在 `StepStoryboardShotStrip.tsx` 内部增加：

```ts
const [filter, setFilter] = useState<ShotUserStatus | 'all'>('all');
```

**Step 4: 增加空状态**

筛选后无结果时显示：

- “没有符合条件的分镜”
- “切换到全部查看”

**Step 5: Run frontend build**

Run:

```bash
cd h5-video-tool
npm run build
```

Expected: build 成功。

**Step 6: Commit**

Run:

```bash
git add h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx h5-video-tool/src/i18n/messages.ts h5-video-tool/tests/shotUserStatus.test.ts
git commit -m "feat: improve production storyboard shot navigation"
```

### Task 2.3: 增加上一镜/下一镜快捷操作

**Files:**

- Modify: `h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`

**Goal:** 多分镜切换更像工作流，而不是只靠横向滚动。

**Step 1: 在当前分镜头部增加位置提示**

展示：

```txt
第 3 / 12 镜
```

**Step 2: 增加上一镜/下一镜按钮**

Rules:

- 第一镜禁用上一镜。
- 最后一镜禁用下一镜。
- 切换后当前分镜详情和预览同步更新。

**Step 3: 可选键盘快捷键**

如果实现简单，可支持：

- `[` 上一镜
- `]` 下一镜

不要影响文本输入框内打字。

**Step 4: Run frontend build**

Run:

```bash
cd h5-video-tool
npm run build
```

Expected: build 成功。

**Step 5: Commit**

Run:

```bash
git add h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx h5-video-tool/src/i18n/messages.ts
git commit -m "feat: add previous and next shot navigation"
```

---

## 7. Phase 3: 用户态任务状态统一起步

### Task 3.1: 编写平台级状态模型文档

**Files:**

- Create: `docs/product/status-model.md`

**Goal:** 先固化统一口径，再逐步改代码。

**Content:**

必须包含：

- 用户态状态定义。
- provider 原始状态到用户态状态映射。
- 页面展示规则。
- 刷新恢复规则。
- 失败/取消规则。
- 日志和用户文案边界。

用户态状态：

| 用户态 | 用户文案 | 含义 |
|---|---|---|
| `waiting_submit` | 等待提交 | H5 内部或平台调度器等待提交 |
| `platform_queueing` | 平台排队中 | 已提交给 Dreamina/Kling/VEO 等平台，等待平台资源 |
| `generating` | 正在生成 | provider 正在生成 |
| `completed` | 已完成 | 结果可访问 |
| `failed` | 生成失败 | 明确失败，可重试 |
| `cancelled` | 已取消 | 用户或系统取消 |

**Step 1: 写文档**

Run:

```bash
New-Item -ItemType Directory -Force docs/product
```

**Step 2: Commit**

Run:

```bash
git add docs/product/status-model.md
git commit -m "docs: define user-facing job status model"
```

### Task 3.2: 为高级制片使用统一用户态状态

**Files:**

- Modify: `h5-video-tool/src/studio/shotUserStatus.ts`
- Modify: `h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`
- Modify: `h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`
- Modify: `h5-video-tool/src/studio/steps/StepStoryboardPreviewPanel.tsx`
- Test: `h5-video-tool/tests/shotUserStatus.test.ts`

**Goal:** 高级制片内部先不再分散判断 `awaiting_submit` / `pending` / `queuing` / `processing`。

**Step 1: 扩展测试覆盖**

增加：

- pending submitId 但无 active job 时展示为 generating 或 tracking。
- completed 优先级高于 pending submitId。
- failed 不覆盖已有 completed video。

**Step 2: 替换分散文案**

在 UI 组件中尽量使用 `getShotUserStatus` 输出，而不是散落判断。

**Step 3: 保留 provider 细节为 tooltip**

用户默认看到用户态；provider 原始状态可放在 hover title 或开发日志，不作为主文案。

**Step 4: Run tests/build**

Run:

```bash
cd h5-video-tool
npm test -- shotUserStatus
npm run build
```

Expected: PASS / build 成功。

**Step 5: Commit**

Run:

```bash
git add h5-video-tool/src/studio/shotUserStatus.ts h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx h5-video-tool/src/studio/steps/StepStoryboardPreviewPanel.tsx h5-video-tool/tests/shotUserStatus.test.ts
git commit -m "feat: align production shot status display"
```

---

## 8. Phase 4: 数据归属与文档治理

### Task 4.1: 编写数据归属不变量文档

**Files:**

- Create: `docs/product/data-ownership-invariants.md`

**Goal:** 避免项目、分镜、视频版本、batch job、素材继续串线。

**Content:**

必须定义：

| 对象 | 必须字段 |
|---|---|
| Project | `ownerId`, `projectId`, `projectType`, `createdFrom` |
| Shot | `projectId`, `shotIndex`, `shotId` |
| VideoVersion | `sourceProjectId`, `sourceShotIndex`, `batchJobId`, `provider` |
| BatchJob | `ownerId`, `projectId`, `sourceType`, `sourceShotIndex` |
| Asset | `ownerId`, `assetId`, `source`, `visibility` |
| PublishJob | `ownerId`, `videoId`, `platform`, `accountId` |

同时写明：

- 不允许无 owner 的 batch job。
- 不允许视频版本缺 sourceProjectId。
- 不允许跨 owner 读取素材。
- 不允许旧目录数据静默丢失。

**Step 1: 写文档**

**Step 2: Commit**

Run:

```bash
git add docs/product/data-ownership-invariants.md
git commit -m "docs: define platform data ownership invariants"
```

### Task 4.2: 拆分 PRODUCT / CHANGELOG 的执行准备

**Files:**

- Create: `docs/product/user-journeys.md`
- Create: `CHANGELOG.md`
- Modify: `PRODUCT.md`

**Goal:** 不要求一次性完全迁移历史，但建立新规则。

**Step 1: 新建 user journeys**

包含三条路径：

- 一键成片：最快拿到视频。
- 高级制片：专业制作项目。
- 分发运营：视频发布和复盘。

**Step 2: 新建 CHANGELOG**

从 `PRODUCT.md` 顶部 changelog 复制最近 10-20 条即可，不必一次迁移全部历史。

**Step 3: 缩减 PRODUCT.md 责任**

`PRODUCT.md` 保留：

- 当前产品定位。
- 当前核心模块。
- 用户路径入口。
- 指向 `CHANGELOG.md` 的链接。
- 指向 `docs/product/*.md` 的链接。

**Step 4: Commit**

Run:

```bash
git add PRODUCT.md CHANGELOG.md docs/product/user-journeys.md
git commit -m "docs: split product overview and changelog"
```

---

## 9. Phase 5: 验证与发布

### Task 5.1: 全量本地验证

**Files:** none

**Step 1: 后端检查**

Run:

```bash
cd h5-video-tool-api
npx tsc --noEmit
```

Expected: exit code 0。

**Step 2: 前端测试**

Run:

```bash
cd h5-video-tool
npm test -- shotUserStatus
```

Expected: PASS。

**Step 3: 前端构建**

Run:

```bash
cd h5-video-tool
npm run build
```

Expected: build 成功。

**Step 4: 检查 dirty files**

Run:

```bash
git status --short
```

Expected: 只剩本轮有意修改文件；不要带入其他任务文件。

### Task 5.2: 更新 PRODUCT.md 与 release 文档

**Files:**

- Modify: `PRODUCT.md`
- Modify/Create: `docs/workflow/runs/2026-04-23-production-wizard-usability-trim/builder-report.md`
- Modify/Create: `docs/workflow/runs/2026-04-23-production-wizard-usability-trim/verifier-report.md`
- Modify/Create: `docs/workflow/runs/2026-04-23-production-wizard-usability-trim/release-decision.md`

**Step 1: 更新 PRODUCT.md**

记录：

- 高级制片默认模式瘦身。
- 分镜切换和状态筛选优化。
- 生成分镜图移入高级工具。
- 形象演化树降级为角色形象变体。

**Step 2: 写 builder-report**

包含：

- 每个 AC 对应实现。
- 测试输出摘要。
- 未完成项。

**Step 3: 写 verifier-report**

覆盖：

- 状态展示。
- 刷新恢复。
- 生成按钮。
- 多分镜切换。
- 高级工具展开。
- i18n 基础检查。

**Step 4: 写 release-decision**

明确：

- GO / NO-GO。
- commit SHA。
- staging 验收结果。
- prod 发布结果。

**Step 5: Commit**

Run:

```bash
git add PRODUCT.md docs/workflow/runs/2026-04-23-production-wizard-usability-trim
git commit -m "docs: record production wizard usability release"
```

### Task 5.3: Push and deploy

**Files:** none

**Step 1: Push**

Run:

```bash
git push origin main
```

Expected: push 成功。

**Step 2: Build artifacts**

Run:

```bash
cd h5-video-tool-api
npm run build
cd ../h5-video-tool
npm run build
```

Expected: both successful。

**Step 3: Deploy staging**

Run:

```bash
python scripts/deploy_all.py --target staging
```

Expected: staging 部署成功。

**Step 4: Staging manual checks**

Open:

```txt
http://43.134.186.196:8080
```

Check:

- 高级制片可以打开。
- 默认不展示生成分镜图。
- 高级工具可以展开。
- 分镜列表能筛选状态。
- 批量生成视频入口仍存在。
- 进入导出/放映室仍可用。

**Step 5: Mark release ready**

Run:

```bash
python scripts/mark_release_ready.py --updated-by codex
```

Expected: release ready 标记成功。

**Step 6: Deploy prod**

Run:

```bash
python scripts/deploy_all.py --target prod --updated-by codex
```

Expected: prod 部署成功。

**Step 7: Prod verification**

Open:

```txt
http://43.134.186.196
```

Check same critical path as staging.

**Step 8: Set idle**

Run:

```bash
python scripts/set_deployment_state.py --target prod --phase idle --updated-by codex
```

Expected: prod deployment state restored to idle。

---

## 10. Manual QA Checklist

### 高级制片主流程

- 新建项目后不会自动产生多个无名项目。
- 输入页参考图上传正常。
- 从素材库选择参考图正常。
- 参考图反解析可用。
- 生成故事大纲可用。
- 生成角色/场景设计可用。
- 生成分镜表可用。
- 默认界面不再出现低频高级工具堆叠。
- 生成分镜视频可用。
- 批量生成缺失视频可用。
- 进入导出/放映室可用。
- 导入剪辑器入口可用。

### 分镜列表

- 全部列表显示正确。
- 未开始筛选正确。
- 排队中筛选正确。
- 生成中筛选正确。
- 已完成筛选正确。
- 失败筛选正确。
- 点击分镜切换详情正确。
- 上一镜/下一镜正确。
- 当前分镜高亮明显。

### 高级工具

- 高级工具默认收起。
- 展开后能看到 AI 审片/连续性检查/快速调整等入口。
- A/B 对比若保留，只在有两个以上版本时出现。
- 生成首帧只在高级工具中出现。
- image2video 缺首帧时有清晰提示。

### 任务状态

- 入队后显示等待提交或平台排队。
- Dreamina 生成中显示正在生成。
- 完成后显示已完成，不被旧 pending submitId 覆盖。
- 失败后显示失败原因和重试入口。
- 取消后显示已取消。

---

## 11. Rollback Plan

如 staging 发现问题：

- 优先只回滚 UI 收纳改动，不回滚数据结构。
- 保留 `shotUserStatus.ts` 测试和文档，除非它导致构建失败。
- 如果生成视频入口异常，立即恢复 `StepStoryboardGenerateActions.tsx` 上一版本。
- 如果分镜切换异常，优先恢复 `StepStoryboardShotStrip.tsx`。

如 prod 发现问题：

- 按服务器备份/SOP 回滚前一版本。
- 在 `release-decision.md` 记录问题和回滚 SHA。
- 不使用 `--emergency-bypass`，除非用户明确批准紧急回滚。

---

## 12. Suggested Commit Sequence

1. `docs: plan production wizard usability trim`
2. `feat: simplify production wizard default tools`
3. `feat: move storyboard still generation to advanced tools`
4. `feat: simplify character look variant editing`
5. `feat: add production shot user status helper`
6. `feat: improve production storyboard shot navigation`
7. `feat: add previous and next shot navigation`
8. `docs: define user-facing job status model`
9. `feat: align production shot status display`
10. `docs: define platform data ownership invariants`
11. `docs: split product overview and changelog`
12. `docs: record production wizard usability release`

---

## 13. Handoff Prompt For New Chat

复制下面这段到新聊天窗：

```txt
请按照 `docs/plans/2026-04-23-production-wizard-usability-trim.md` 执行。

先读取：
1. AGENTS.md
2. `.claude/memory/feedback.md`
3. `docs/TASK-INDEX.md`
4. `docs/plans/2026-04-23-platform-usability-efficiency-optimization.md`
5. `docs/plans/2026-04-23-production-wizard-usability-trim.md`

执行时请使用 executing-plans 流程，按 Task 逐步推进。每个 Task 完成后运行对应测试/构建，并单独 commit。不要触碰计划中列出的禁区文件，不要带入当前工作区里和本任务无关的 dirty files。

优先完成 Phase 0-2；如果风险可控，再继续 Phase 3-5。发布必须遵守 staging -> prod。
```

