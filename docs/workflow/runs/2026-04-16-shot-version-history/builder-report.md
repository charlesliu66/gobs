# Builder Report — 镜头版本历史完整实现

> Gate: 2 (Builder)  
> 日期: 2026-04-16

## AC 映射

| AC | 状态 | 实现位置 |
|---|---|---|
| AC-1: 后端 PATCH 版本切换 API | ✅ | `productionPersist.ts` L390-L450 |
| AC-2: 前端调 PATCH API | ✅ | `ProductionWizard.tsx` `selectShotVideoVersion` 回调 |
| AC-3: 版本上限提示 | ✅ | `StepStoryboardPreviewPanel.tsx` 版本 >= 5 黄色提示 |
| AC-4: 后端版本清理 API | ✅ | `productionPersist.ts` DELETE 路由 + 路径穿越校验（S-1）|

## 改动文件

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `h5-video-tool-api/src/routes/productionPersist.ts` | 新增 | PATCH + DELETE 两个路由 |
| `h5-video-tool/src/api/client.ts` | 新增 | `apiPatch` 函数 |
| `h5-video-tool/src/api/production.ts` | 新增 | `patchShotVersion` + `deleteShotVersions` |
| `h5-video-tool/src/pages/ProductionWizard.tsx` | 修改 | 两个回调中追加 API 调用 |
| `h5-video-tool/src/studio/steps/StepStoryboardPreviewPanel.tsx` | 修改 | 版本 >= 5 黄色提示 |

## 自测证据

```
后端 tsc --noEmit: 0 错误 ✅
前端 tsc --noEmit: 0 错误 ✅
Lint: 0 错误 ✅
```

## Challenger S-1 处理

DELETE 路由中路径穿越防护已实现：`abs.startsWith(outputBase)` 校验。

*Builder: Gate 2 PASS*
