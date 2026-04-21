# Builder Report - h5 stability polish

> Run: `2026-04-21-h5-stability-polish`
> Gate 2 产物

---

## 实现映射

| AC | 实现 |
|---|---|
| SP-01 / AC-1 AC-2 | `h5-video-tool/src/components/BatchJobsBoard.tsx`：成片预览与下载统一走 `absoluteApiUrl() + appendFileAccessToken()` |
| SP-01 / AC-3 | `h5-video-tool/src/pages/History.tsx`：导入批量任务视频前先补保护后的媒体 URL |
| SP-02 / AC-1 AC-2 AC-3 AC-4 | `h5-video-tool/src/hooks/useGlobalJobs.ts` + `h5-video-tool/src/components/BatchJobsBoard.tsx`：`EventSource` 增加指数退避自动重连；看板显示“实时同步 / 重连中” |
| SP-03 / AC-1 AC-2 | `h5-video-tool/src/pages/EditorWorkbench.tsx`：回跳链接改为 `/studio/production?projectId=...` |
| SP-04 / AC-1 AC-2 | `h5-video-tool/src/components/Layout.tsx`：挂载后拉取 `/api/system/version`，显示真实 `branch@commit` |

## 自测证据

- 后端：`npx tsc --noEmit` 通过
- 前端：`npm run build` 通过

## 约束确认

- 未修改禁止触碰的底层视频生成服务
- 未做 HTTPS 改造
- 本轮只收口前端稳定性与可观测性问题
