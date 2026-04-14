# SESSION-ANCHOR — 2026-04-14-asset-lib-task-d

## 本轮目标
TASK-D: 接入生成与剪辑 — 将素材中台与 Studio 生成流程、Editor 剪辑工作台集成

## 验收标准
- AC-D1: 用户可在 Studio/生成流程中选择资产库素材作为参考，不需要重复上传
- AC-D2: 剪辑器侧边栏有"项目资产库" tab，可展示素材列表，支持添加到时间轴
- AC-D3: 视频素材有高光候选时间点提示（GET /api/asset-library/assets/:id/highlights）
- AC-D4: npm run build 零错误（前后端均需通过）

## 需要修改的文件（本轮 SESSION 中仅读/改这些）

### 后端
- `h5-video-tool-api/src/services/assetHighlightService.ts` — 实现 getHighlightCandidates()
- `h5-video-tool-api/src/routes/assetLibrary.ts` — 添加 GET /assets/:id/highlights 和 GET /assets/:id/file

### 前端
- `h5-video-tool/src/api/assetLibraryApi.ts` — 添加 getAssetFile/getHighlights API
- `h5-video-tool/src/components/AssetPicker.tsx` — 新建资产选择器弹窗组件
- `h5-video-tool/src/pages/TabGenerate.tsx` — 接入 AssetPicker（Studio 生成侧）
- `h5-video-tool/src/editor/components/MediaLibrary.tsx` — 添加"项目资产库" tab

## 禁止修改的文件
- dreaminaVideo.ts / klingVideo.ts / veoPython.ts / studioPipeline.ts
- productionTypes.ts / productionAssets.ts
- .env
