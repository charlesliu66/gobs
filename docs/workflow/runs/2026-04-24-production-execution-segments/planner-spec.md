# Planner Spec: Production Execution Segments

## Background

高级制片此前直接按 `shots[]` 提交分镜视频任务。对于非常短的连续镜头和明显超过平台舒适时长的长镜，这种“叙事视图即执行视图”的模式会带来 3 个问题：

1. 即梦执行粒度不稳定，容易出现短镜过碎、长镜过长。
2. 任务状态回写只能按原始 shot 对齐，长短镜特殊情况容易串状态。
3. 用户界面一边展示叙事 shot，一边要理解平台执行态，心智成本高。

## Decision

引入 `executionSegments[]` 作为执行层：

- 保留 `shots[]` 作为主叙事视图。
- 连续短镜自动合并为一个 segment。
- 超长镜自动拆分为多个 segment。
- enqueue / cancel / persist / export 优先面向 segment。
- UI 仍以 shot 为主，但统一消费 segment 聚合状态。

## Acceptance Criteria

### Product

- 用户仍按 shot 浏览和编辑分镜。
- “生成当前分镜视频”在内部按 segment 执行，不要求用户理解底层拆分/合并细节。
- 分镜条、工作区和导出页对同一镜头显示一致的聚合状态。
- 已失败 / 已取消 / 已完成状态不再因旧本地快照而被错误覆盖。

### Engineering

- 不修改禁区文件。
- `batch-jobs` 与项目持久化支持 `segmentId / sourceShotIndexes / primaryShotIndex`。
- 前后端各补至少一个 targeted test。
- 本地 frontend / backend build 通过。

### Release

- 当前提交已在 `origin/main`。
- staging smoke 通过后再提升 prod。

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| segment 聚合状态覆盖已完成视频 | High | 聚合逻辑优先保留终态视频结果，活动任务只补充状态 |
| 长短镜拆并后导出视图混乱 | Medium | UI 保持 shot 为主，只在内部消费 segment |
| 旧项目 JSON 缺 segment 信息 | Medium | 持久化与加载逻辑提供回填与兼容路径 |

## Test Matrix

| Area | Verification |
|---|---|
| Frontend build | `cd h5-video-tool && npm run build` |
| Backend build | `cd h5-video-tool-api && npm run build` |
| Frontend tests | `cd h5-video-tool && node --test tests/executionSegments.test.ts` |
| Backend tests | `cd h5-video-tool-api && node --test tests/productionExecutionSegments.test.ts` |
| Release guard | `gobs-release-guard` preflight |
| Staging smoke | `gobs-h5-smoke-test` quick/full |
