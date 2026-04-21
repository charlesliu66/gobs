# SESSION-ANCHOR - h5-stability-polish

> Run ID: `2026-04-21-h5-stability-polish`
> Sprint: stability polish
> 对应优化清单：`batch-jobs` 鉴权 / SSE 重连 / 制片回跳 / 真实版本展示

---

## 目标（一句话）
先把线上 H5 当前最影响可用性和排障效率的 4 个坑点补平，不碰 HTTPS 和底层视频生成服务。

## 本轮交付物

| ID | 优化项 | 主要落地文件 |
|---|---|---|
| SP-01 | `batch-jobs` 媒体 URL 统一补鉴权参数，避免预览/下载/导入 401 | `h5-video-tool/src/components/BatchJobsBoard.tsx`<br/>`h5-video-tool/src/pages/History.tsx` |
| SP-02 | `batch-jobs` SSE 自动重连，断线后继续追踪队列与任务状态 | `h5-video-tool/src/hooks/useGlobalJobs.ts`<br/>`h5-video-tool/src/components/BatchJobsBoard.tsx` |
| SP-03 | 剪辑器回跳制片项目改到真实路由参数 | `h5-video-tool/src/pages/EditorWorkbench.tsx` |
| SP-04 | 侧边栏显示真实运行版本，而不是硬编码假版本 | `h5-video-tool/src/components/Layout.tsx` |

## 只读文件（允许参考，不允许改）
- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/types/productionTypes.ts`
- `h5-video-tool-api/src/config/productionAssets.ts`
- `.env`

## 本轮禁区
- 不做 HTTPS 相关改造（公司内网模式暂不支持）
- 不改 Dreamina / Kling / VEO 底层生成服务
- 不做 `ProductionWizard` 大规模状态重构，只做稳定性止血

## 参考文件
- `docs/reviews/2026-04-21-qas-current-state-assessment.md`
- `h5-video-tool/src/api/client.ts`
- `h5-video-tool-api/src/routes/batchJobs.ts`
- `h5-video-tool-api/src/routes/system.ts`

## 通过门禁条件
- Gate 2 Builder：前端 `npm run build`、后端 `npx tsc --noEmit` 通过
- Gate 3 Verifier：手动验证 `batch-jobs` 预览/下载/导入、SSE 断线恢复、编辑器回跳、版本展示
- Gate 5 Integrator：更新 `PRODUCT.md` changelog，并记录本轮验证结论
