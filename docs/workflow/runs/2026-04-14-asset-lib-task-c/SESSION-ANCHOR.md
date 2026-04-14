# SESSION-ANCHOR — TASK-C 前端审核与检索体验

## 会话状态

- **任务**: TASK-C 前端审核与检索体验
- **日期**: 2026-04-14
- **当前阶段**: Gate 1 (Planner) 完成，进入 Gate 1.5 (Challenger)

## 关键决策

1. 新页面放在 `h5-video-tool/src/pages/AssetLibraryPage/`（子目录组织）
2. API 封装放在 `h5-video-tool/src/api/assetLibraryApi.ts`
3. 修改 `App.tsx` 将 `/asset-library` 指向新 `AssetLibraryPage`
4. 旧 `AssetLibrary.tsx` 保留不删

## 文件清单（计划）

- `h5-video-tool/src/api/assetLibraryApi.ts` — API 封装
- `h5-video-tool/src/pages/AssetLibraryPage/index.tsx` — 主入口
- `h5-video-tool/src/pages/AssetLibraryPage/AssetImportPanel.tsx`
- `h5-video-tool/src/pages/AssetLibraryPage/AssetReviewQueue.tsx`
- `h5-video-tool/src/pages/AssetLibraryPage/AssetSearchPanel.tsx`
- `h5-video-tool/src/App.tsx` — 修改路由指向

## 后端 API（TASK-A 已实现，前缀 /api/asset-library）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /import | 多文件上传，返回 jobId |
| GET | /import/:jobId | 轮询进度 |
| GET | /assets | 列表+筛选 |
| PATCH | /assets/:id/tags | 单条标签编辑 |
| POST | /assets/batch-tags | 批量标签更新 |
| GET | /search | 全文搜索+筛选 |
| GET | /facets | 维度聚合 |
