# Planner Spec: Production Wizard Usability Trim

## Background

高级制片已有完整专业能力，但默认界面暴露了过多低频工具。新用户最关心的是当前步骤、点击后是否开始、任务卡在哪里、最终是否能拿到可播放结果。本 run 以减法和状态收口为主，降低默认路径复杂度，同时保留专业工具的可发现入口。

## User Problems

1. 默认界面高级工具密度高，主按钮不够明确。
2. “生成分镜图”容易被误解为生成视频前必走步骤。
3. “形象演化树”概念偏工程化，点击反馈不明确。
4. 多分镜项目缺少清晰状态筛选和上一 / 下一镜操作。
5. 分镜状态在不同组件中散落判断，用户文案不稳定。

## Functional Decisions

| Capability | Decision | Reason |
|---|---|---|
| Story / character / scene setup | Keep default | 主流程源头 |
| Prop design | Advanced | 默认不占据主路径 |
| Character look tree | Advanced | 改为角色形象变体 |
| Generate storyboard still | Advanced | 仅作为 image2video 首帧能力 |
| Generate storyboard video | Keep default | 核心产物 |
| Batch generate missing videos | Keep default | 生产效率关键 |
| AI review / continuity / A-B compare | Advanced | 专业能力，不挡主流程 |
| Continuous playback in storyboard page | Hide by default | 放映室是默认审片入口 |

## Acceptance Criteria

### UX

- 新用户默认只看到清晰主路径：输入 -> 故事 -> 角色/场景 -> 分镜 -> 视频 -> 审片/剪辑。
- 分镜页默认保留生成视频、批量生成缺失视频、任务状态和预览结果。
- 生成首帧能力仍可用，但默认移入高级工具。
- 形象演化树默认不以复杂树概念暴露，主界面使用“角色形象变体”。
- 分镜列表能展示并筛选：未开始、等待提交、平台排队中、正在生成、已完成、失败、已取消。
- 当前分镜支持上一镜 / 下一镜操作，首尾按钮禁用。

### Engineering

- 不修改禁区文件。
- 不硬编码密钥。
- 新增 UI 文案进入 `messages.ts` 或在报告中记录历史组件限制。
- 新增状态 helper 有 targeted test 覆盖。
- `h5-video-tool-api` TypeScript 检查通过。
- `h5-video-tool` build 通过。

### Release

- 更新 `PRODUCT.md` / `CHANGELOG.md` 与本 run 报告。
- staging 验证通过后再提升 prod。

## Risk Matrix

| Risk | Impact | Mitigation |
|---|---|---|
| 首帧能力被误删，image2video 断链 | High | 只隐藏默认入口，不删除 `previewStillDataUrl` 和生成函数 |
| 高级用户找不到原功能 | Medium | 提供明确“高级工具”入口和可展开区域 |
| 分镜状态映射覆盖已完成视频 | High | `completed` 优先于 pending / failed 等状态 |
| 组件 props 改动破坏生成路径 | High | 保持外部回调语义不变 |
| i18n key 缺失导致英文模式残留 | Medium | 新文案补 `messages.ts`，构建前检查 |
| 当前 dirty 文件被误提交 | Medium | 每次提交前用指定 path stage 并检查 `git diff --cached` |

## Test Matrix

| Area | Verification |
|---|---|
| Status helper | `node --test tests/shotUserStatus.test.ts` |
| Frontend build | `cd h5-video-tool && npm run build` |
| Backend typecheck | `cd h5-video-tool-api && npx tsc --noEmit` |
| Dirty scope | `git status --short` and staged diff review |
| Manual staging | Open staging, verify advanced tools, shot filters, previous/next navigation |
| Manual prod | Same critical path after prod deploy |

## Source Files To Inspect First

- `h5-video-tool/src/pages/ProductionWizard.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`
- `h5-video-tool/src/studio/steps/StepDesignCharactersPanel.tsx`
- `h5-video-tool/src/i18n/messages.ts`
