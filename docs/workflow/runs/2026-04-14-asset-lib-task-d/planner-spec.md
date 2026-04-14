# PLANNER-SPEC — TASK-D 接入生成与剪辑

## 目标
将素材中台（TASK-A/B/C 已完成）与 Studio 视频生成流程和 Editor 剪辑工作台双向集成，消除重复上传摩擦。

## 模块拆解

### M1: 后端 — 资产文件服务端点
**目的**: 资产库的文件存储在服务端 `output/asset-lib/<username>/` 目录下，前端需要能通过 URL 访问。
**方案**: 在 `assetLibrary.ts` 路由中添加 `GET /assets/:id/file`，根据 asset.filepath 返回文件流（带鉴权），并在 `listAssets`/`searchAssets` 响应中拼接 `file_url` 字段。
**替代方案分析**: 
- 方案A：直接暴露静态目录 → 绕过鉴权，不安全
- 方案B：在现有 list/search 响应中追加 `file_url` 字段 + 单独的 `/assets/:id/file` 端点 → 选用，安全且可直接在 `img`/`video` 标签中使用

### M2: 后端 — 高光候选服务
**目的**: 实现 `assetHighlightService.ts` 的 `getHighlightCandidates()` 规则版。
**方案**: 
- 使用 ffprobe 提取音频帧级别的均方根（volumedetect），找出音量峰值时段
- 使用 ffprobe 场景检测（select filter）找出画面剧变点
- 合并两种信号，输出 `{ startSec, endSec, score, reason }[]` 
**降级策略**: 若 ffprobe 不可用或视频无音频，返回基于时长的等分候选片段

### M3: 后端 — 高光接口
**目的**: 添加 `GET /api/asset-library/assets/:id/highlights` 端点。
**响应格式**: `{ highlights: Array<{ startSec: number; endSec: number; score: number; reason: string }> }`

### M4: 前端 — assetLibraryApi 扩展
**目的**: 添加 `getHighlights(assetId)` 和 asset 文件 URL 辅助函数。
**方案**: 扩展 `assetLibraryApi.ts`，`LibraryAsset` 新增可选 `file_url?: string` 字段；添加 `getAssetHighlights()` 函数。

### M5: 前端 — AssetPicker 组件
**目的**: 弹窗式资产选择器，可在 Studio 的生成表单中复用。
**方案**: 创建 `h5-video-tool/src/components/AssetPicker.tsx`，内嵌搜索+筛选列表，支持单选/多选，通过回调返回选中的 `LibraryAsset[]`。

### M6: 前端 — Studio TabGenerate 接入
**目的**: 在 TabGenerate（Studio 生成主界面）的参考素材区域，提供"从资产库选"按钮。
**扩展点**: `TabGenerate.tsx` 中已有 `DriveMaterialPicker`、`ShortDramaMaterialPicker` 等组件，在"参考视频"区域（viralDanceReferenceVideoUrl 相关 UI）旁边添加 AssetPicker 入口。选中的参考图/视频 URL 填入 `setDreaminaMultimodalItems` 或 `viralDanceReferenceVideoUrl`。
**最小化接入**: 不改动 CreateFlowContext 核心逻辑，仅在 UI 层增加选择入口。

### M7: 前端 — Editor MediaLibrary 增加"项目资产库" tab
**目的**: 在剪辑器左侧面板顶部增加 tab 切换，让用户可以浏览资产中台素材并一键加入时间轴。
**方案**: 修改 `MediaLibrary.tsx`，顶部添加 tab bar（"上传素材" | "项目资产库"），"项目资产库" tab 调用 `listAssets` 展示素材列表，每条素材有"加入时间轴"按钮，调用已有的 `onAddToTimeline` prop（需适配 `EditorAssetDto` 格式）。

## 技术方案详细

### 文件 URL 方案
资产文件存储路径: `output/asset-lib/<username>/<assetId>/<filename>`
新增端点: `GET /api/asset-library/assets/:id/file` → 302 到可访问 URL 或直接 pipe 文件流
前端 list/search 响应在 handler 层拼接 `file_url: /api/asset-library/assets/${id}/file`

### AssetPicker → TabGenerate 数据流
```
用户点击"从资产库选" → AssetPicker 弹窗 → 搜索/筛选 → 选中资产
→ 资产 file_url → 调用 setDreaminaMultimodalItems([{ type: 'image_url', url: file_url }])
  （图片类）或 setViralDanceReferenceVideoUrl(file_url)（视频类）
```

### Editor AssetLibrary tab → 时间轴
```
用户切换到"项目资产库" tab → listAssets API → 展示素材列表
→ 用户点击"加入时间轴" → 构造 EditorAssetDto { id, url: file_url, ... }
→ 调用 onAddToTimeline(asset) （已有逻辑）
```

## 风险分析

| 风险 | 概率 | 影响 | 缓解方案 |
|------|------|------|----------|
| ffprobe 在 Windows dev 环境不可用 | 中 | 高光 AC-D3 降级 | 实现降级：返回均分时间段候选 |
| 资产文件访问鉴权（file_url 暴露给 img 标签） | 中 | 中 | file 端点加 JWT 鉴权；img 标签暂无法携带 Authorization header，改用带 token 的 query param 或 blob URL |
| TabGenerate 参数注入不兼容 dreaminaMultimodalItems 格式 | 低 | 高 | 先读 CreateFlowContext 和 DreaminaMultimodalItems 类型定义 |
| MediaLibrary tab 切换影响现有上传功能 | 低 | 低 | 仅添加 tab，原有内容不变 |

## 验收标准（AC）

| AC | 测试方法 |
|----|---------|
| AC-D1 | 在 Studio 页面看到"从资产库选"按钮，点击后弹窗展示资产，选中后 URL 填入参考图/视频字段 |
| AC-D2 | 在 Editor 左侧面板看到"项目资产库" tab，切换后展示资产列表，点击"加入时间轴"后时间轴新增片段 |
| AC-D3 | curl /api/asset-library/assets/:id/highlights 返回 highlights 数组 |
| AC-D4 | cd h5-video-tool-api && npm run build → 0 error；cd h5-video-tool && npm run build → 0 error |

## 测试矩阵

| # | 场景 | 期望 | 优先级 |
|---|------|------|--------|
| T1 | AssetPicker 搜索关键词 | 展示匹配素材 | P0 |
| T2 | AssetPicker 选中图片 → Studio 参考图字段 | URL 被填入 | P0 |
| T3 | AssetPicker 选中视频 → Studio 参考视频字段 | URL 被填入 | P0 |
| T4 | Editor 切换"项目资产库" tab | 展示素材列表 | P0 |
| T5 | Editor 资产"加入时间轴" | 时间轴新增片段 | P0 |
| T6 | GET /assets/:id/highlights（视频资产） | 返回非空 highlights | P1 |
| T7 | GET /assets/:id/highlights（图片资产） | 返回空数组 | P1 |
| T8 | npm run build 前后端 | 0 error | P0 |
