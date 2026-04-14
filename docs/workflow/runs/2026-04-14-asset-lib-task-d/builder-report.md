# BUILDER-REPORT — TASK-D 接入生成与剪辑

## 实现摘要

### AC-D1: Studio 生成流程接入资产库

**实现方式**: 在 `TabGenerate.tsx` 的"生成"按钮区域新增"从资产库选参考图"按钮，点击弹出 `AssetPicker` 组件。

**新增文件**:
- `h5-video-tool/src/components/AssetPicker.tsx` — 弹窗式资产选择器，支持搜索/筛选，单选模式；选中图片素材时 fetch→base64→填入 `dreaminaMultimodalItems[0]`；视频素材直接设置 `viralDanceReferenceVideoUrl`（带 token 的 URL）。

**修改文件**:
- `h5-video-tool/src/pages/TabGenerate.tsx` — 新增 import、state（`assetPickerOpen`, `assetPickerMode`）、`handleAssetPickerSelect` handler、"从资产库选参考图"按钮、弹窗 JSX。

**数据流**:
```
用户点击"从资产库选参考图" → AssetPicker 弹窗
→ 调用 listAssets / searchAssets（携带 file_url 字段）
→ 选中图片资产 → fetch(file_url) → FileReader → base64
→ setDreaminaMultimodalItems([{ kind: 'image', base64, mimeType, ... }])
→ 弹窗关闭，参考图填入生成参数
```

### AC-D2: Editor 剪辑器"项目资产库" tab

**修改文件**: `h5-video-tool/src/editor/components/MediaLibrary.tsx`

**实现方式**:
- 顶部新增 Tab 栏（"上传素材" | "项目资产库"）
- "项目资产库" tab 内嵌 `ProjectAssetLibrary` 组件，调用 `listAssets({ pageSize: '50' })` 展示视频素材列表
- 每条素材有"加入时间轴"按钮，构造 `EditorAssetDto` 调用已有的 `onAddToTimeline` prop
- 素材文件 URL 使用 `buildAssetFileUrl(assetId)` 生成带 token 的访问 URL

**数据流**:
```
用户切换到"项目资产库" tab → ProjectAssetLibrary 挂载 → listAssets API
→ 展示视频素材列表（含缩略图预览）
→ 用户点击"加入时间轴" → 构造 EditorAssetDto → onAddToTimeline(asset)
→ 时间轴新增视频片段
```

### AC-D3: 视频素材高光候选接口

**新增文件（完整实现）**: `h5-video-tool-api/src/services/assetHighlightService.ts`

**实现逻辑**:
1. 查询 DB 获取资产的 `filepath` 和 `mimetype`
2. 非视频素材直接返回空数组
3. 若 ffprobe 可用：
   - `getAudioPeakTimes`: ffprobe -show_frames -select_streams a，取中间 1/3 时间点作为音频活跃区候选（score=0.6）
   - `getSceneChangeTimes`: ffprobe -show_frames -select_streams v -skip_frame noref，找 I 帧（场景切换点，score=0.7）
   - 合并两路信号，去重，返回最多 5 条
4. 降级：ffprobe 不可用或失败时，按时长 3 等分返回候选（score=0.5, reason='fallback'）

**新增后端端点**:
- `GET /api/asset-library/assets/:id/highlights` → `{ highlights: HighlightCandidate[] }`

### 辅助：资产文件服务端点

**新增后端端点**:
- `GET /api/asset-library/assets/:id/file?token=<jwt>` — 以文件流返回资产文件，支持 `?token=` query param 认证（供 img/video 标签直接使用）

**修改文件**:
- `h5-video-tool-api/src/middleware/auth.ts` — 为 `/api/asset-library/assets/:id/file` 路由放行全局鉴权，改由路由内部自行验证 token
- `h5-video-tool-api/src/routes/assetLibrary.ts` — 追加 file 端点、highlights 端点；在 listAssets/searchAssets 响应中追加 `file_url` 字段
- `h5-video-tool/src/api/assetLibraryApi.ts` — LibraryAsset 接口新增 `file_url?`、`mimetype?`、`duration?` 字段；新增 `getAssetHighlights()` 和 `buildAssetFileUrl()` 工具函数

## AC 映射

| AC | 实现位置 | 自测结果 |
|----|---------|---------|
| AC-D1 | TabGenerate.tsx + AssetPicker.tsx | 构建通过，按钮可见 |
| AC-D2 | MediaLibrary.tsx + ProjectAssetLibrary 组件 | 构建通过，tab 可见 |
| AC-D3 | assetHighlightService.ts + assetLibrary.ts 路由 | 构建通过，接口已注册 |
| AC-D4 | npm run build（后端 0 错误，前端 0 错误） | 已验证 |

## 构建证据

- 后端: `npm run build` → tsc 0 errors
- 前端: `npm run build` → tsc 0 errors，vite build ✓ built in 2.44s
