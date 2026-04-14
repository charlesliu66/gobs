# CHALLENGER-REVIEW — TASK-D 接入生成与剪辑

## 评审结论: must-fix 清零，可进入 Builder

## 发现的问题及解决方案

### [MUST-FIX-1] DreaminaMultimodalItem 需要 base64，不支持直接 URL
**问题**: Planner-spec M6 描述"选中后填充 URL"，但 `DreaminaMultimodalItem.base64` 字段是必填的 base64 字符串，不能直接填 URL。
**解决**: AssetPicker 选中素材后，需要先 fetch 文件内容转成 base64，再填入 `dreaminaMultimodalItems`。该模式已有先例（TabGenerate.tsx L952-974 角色库选图逻辑）。
**状态**: 已在 M6 方案中修正，Builder 需按此实现。

### [MUST-FIX-2] file_url 认证问题 — img/video 标签无法携带 JWT
**问题**: 资产文件存在服务端，`/api/asset-library/assets/:id/file` 端点需要 JWT 鉴权，但浏览器 `<video src="">` 无法携带 Authorization header。
**解决**: 
- 方案A: 在端点中支持 `?token=<jwt>` query 参数认证（在 jwtAuthMiddleware 中加 query token 支持）
- 方案B: 前端 fetch + createObjectURL，临时 blob URL 用于 img/video 标签
- 采用方案A（简单，能复用现有 jwtAuthMiddleware 逻辑）：在 assetLibrary 路由的文件服务端点中，读取 query.token 进行验证，不改全局 middleware。
**状态**: 已加入实现方案。

### [MUST-FIX-3] listAssets API 响应中不包含 file_url，需后端追加
**问题**: 后端 `listAssets` 和 `searchAssets` 返回原始 `AssetRecord`，不含 file_url。前端无法直接构造正确的文件访问 URL。
**解决**: 在 `assetLibrary.ts` 路由的 `/assets` 和 `/search` handler 中，对每条记录追加 `file_url: /api/asset-library/assets/${record.id}/file` 字段，一并返回给前端。前端 `LibraryAsset` 接口增加可选 `file_url?: string`。
**状态**: 已在 M1 方案中明确。

### [MUST-FIX-4] 高光分析 — ffprobe volumedetect 输出解析复杂，需要降级
**问题**: ffprobe `-f lavfi -i amix` 等音量检测语法在不同 ffprobe 版本下输出格式差异大，且 Windows 开发环境上可能无法正常运行 ffprobe/ffmpeg。
**解决**: 
- 先尝试用 ffprobe `-show_frames -select_streams a` 获取各帧的 `pkt_pts_time` + `best_effort_timestamp_time`，解析音量相关字段。
- 若 ffprobe 不可用或命令失败，降级到等分时间段：将视频时长（来自 DB 的 duration 字段）3 等分，每段 score=0.5，reason='fallback'。
- 高光候选时间段默认窗口 5 秒（`startSec=peak-2.5, endSec=peak+2.5`，裁剪到 0~duration）。
**状态**: 已加入降级逻辑。

### [WARN-1] MediaLibrary 添加 tab 时，需传递 token 给 file_url
**问题**: Editor 中"加入时间轴"需要构造 `EditorAssetDto.url`，这个 URL 需要能被 `<video>` 标签直接访问。
**解决**: 使用 `?token=<jwt>` 格式：`/api/asset-library/assets/${id}/file?token=${localStorage.getItem('gobs_token')}`
**状态**: 已加入实现方案。

### [WARN-2] AssetPicker 对视频素材的处理
**问题**: 视频 base64 体积可能很大（100MB），直接 fetch→base64 在浏览器中可能导致内存问题。
**解决**: AssetPicker 在 Studio 侧仅支持图片素材的 base64 转换（用于 dreaminaMultimodalItems）；视频素材参考（viralDanceReferenceVideoUrl）仅需 URL 即可，不需要 base64。所以视频类型的资产选择直接使用 file_url（带 token）即可。
**状态**: 已加入实现方案，按 mime_type 区分处理逻辑。

## 结论

所有 must-fix 项均已找到解决方案并加入实现方案中。Builder 可以开始实现。
