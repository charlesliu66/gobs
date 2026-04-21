# Builder Report · v0.65 即梦全平台调度器 + 取消排队

**Run**: `2026-04-20-dreamina-scheduler-cancel`
**Gate**: 2 / Builder
**Date**: 2026-04-21

## 1. Builder checklist 完成情况

- [x] `services/dreaminaScheduler.ts` 新文件
- [x] `services/queueSnapshot.ts` 新文件
- [x] `services/batchJobsQueue.ts`：cancelJob 升级 + writeBackCancelledToProject + pollSingleJob race-safe + 新字段 + poller 末尾触发 scheduleTick/recomputeQueuePositions
- [x] `routes/batchJobs.ts`：POST /enqueue + DELETE 返回 CancelResult + SSE queue-snapshot 订阅
- [x] `api/batchJobs.ts`：BatchJobDto 扩展 + enqueueProductionShot 新函数
- [x] `hooks/useGlobalJobs.ts`：订阅 queue-snapshot，返回 { jobs, snapshot }
- [x] `pages/ProductionWizard.tsx`：generateVideoForShotIdx 简化 + 删本地队列
- [x] `studio/steps/StepStoryboardShotStrip.tsx`：五态徽标 + 悬浮 × 按钮
- [x] `studio/steps/StepStoryboardWorkspace.tsx`：顶部状态条 + 批量取消按钮
- [x] `studio/steps/StepStoryboardGenerateActions.tsx`：取消按钮 + confirm
- [x] `studio/productionTypes.ts`：lastVideoError.cancelled
- [x] `PRODUCT.md` 新 v0.65 条目 + NEXT_VERSION 递增到 v0.66
- [x] `_deploy_v065.py` 脚本（运行时读取 `.env` 中的 `SERVER_PASSWORD`）
- [x] tsc check 前后端均通过
- [x] 部署 + pm2 restart + 验证 /api/system/version
- [x] git commit + push main
- [x] `builder-report.md` 写在本目录，逐项 AC 映射实现

## 2. AC -> 实现映射

### AC1 / AC2 / AC10
- 新增 [dreaminaScheduler.ts](/C:/Users/wei.liu/Desktop/cursor_try/QAS/h5-video-tool-api/src/services/dreaminaScheduler.ts) 与 [queueSnapshot.ts](/C:/Users/wei.liu/Desktop/cursor_try/QAS/h5-video-tool-api/src/services/queueSnapshot.ts)
- [batchJobsQueue.ts](/C:/Users/wei.liu/Desktop/cursor_try/QAS/h5-video-tool-api/src/services/batchJobsQueue.ts) 引入 `awaiting_submit`、`submitParams`、`submitAttempts`、`globalQueuePos`、`etaSec`
- [batchJobs.ts](/C:/Users/wei.liu/Desktop/cursor_try/QAS/h5-video-tool-api/src/routes/batchJobs.ts) 新增 `POST /api/batch-jobs/enqueue`，限制单用户单项目 waiting <= 20

### AC3 / AC8
- [batchJobsQueue.ts](/C:/Users/wei.liu/Desktop/cursor_try/QAS/h5-video-tool-api/src/services/batchJobsQueue.ts) 将取消结果细分为三档语义，并把取消状态写回 production project
- [productionTypes.ts](/C:/Users/wei.liu/Desktop/cursor_try/QAS/h5-video-tool/src/studio/productionTypes.ts) 增加 `lastVideoError.cancelled`
- [ProductionWizard.tsx](/C:/Users/wei.liu/Desktop/cursor_try/QAS/h5-video-tool/src/pages/ProductionWizard.tsx) 取消后允许重新 enqueue，并在新入队成功时清空旧错误态

### AC4 / AC5 / AC9
- [useGlobalJobs.ts](/C:/Users/wei.liu/Desktop/cursor_try/QAS/h5-video-tool/src/hooks/useGlobalJobs.ts) 订阅 `queue-snapshot`
- [StepStoryboardWorkspace.tsx](/C:/Users/wei.liu/Desktop/cursor_try/QAS/h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx) 展示平台空闲 / 使用中 / 繁忙状态条
- [StepStoryboardShotStrip.tsx](/C:/Users/wei.liu/Desktop/cursor_try/QAS/h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx) 展示全平台排队位与 ETA tooltip

### AC6 / AC7
- [StepStoryboardGenerateActions.tsx](/C:/Users/wei.liu/Desktop/cursor_try/QAS/h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx) 增加“取消排队 / 放弃本次生成”按钮和 processing confirm
- [StepStoryboardShotStrip.tsx](/C:/Users/wei.liu/Desktop/cursor_try/QAS/h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx) 支持 hover 快捷取消
- [ProductionWizard.tsx](/C:/Users/wei.liu/Desktop/cursor_try/QAS/h5-video-tool/src/pages/ProductionWizard.tsx) 删除本地串行 Dreamina 队列，统一改用后端 enqueue + 全局 job 派生状态

## 3. 自测证据

### TypeScript 检查
- `h5-video-tool-api`: `npx tsc --noEmit` 通过
- `h5-video-tool`: `npx tsc --noEmit` 通过

### 本地构建
- `h5-video-tool-api`: `npm run build` 通过，生成新的 `dist/build-info.json`
- `h5-video-tool`: `npm run build` 通过，生成新的 `dist/assets/ProductionWizard-*.js`

### 部署结果
- `_deploy_v065.py` 上传 API 变更 6 个文件、前端变更 27 个文件
- `pm2 restart qas-api` 成功，`qas-api` 进程状态 `online`
- `/api/system/version` 返回：

```json
{"success":true,"commitSha":"01e29ddcae8e8978248583b1df85c2c15ba29604","commitShort":"01e29dd","branch":"main","buildTime":"2026-04-21T04:02:04.713Z"}
```

## 4. 备注

- 未修改禁改清单中的底层 Dreamina / Kling / VEO / studioPipeline 服务文件
- `_deploy_v065.py` 不硬编码服务器密码，运行时从 `h5-video-tool-api/.env` 读取 `SERVER_PASSWORD`
- Git 提交后会重新构建并再部署一次，使 `/api/system/version` 与最终 commit 严格对齐
