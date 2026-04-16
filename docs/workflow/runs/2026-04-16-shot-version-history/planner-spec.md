# Planner Spec — 镜头版本历史完整实现

> Run ID: `2026-04-16-shot-version-history`  
> Gate: 1 (Planner)  
> 日期: 2026-04-16

---

## 目标

补齐镜头多版本系统的两个缺口：后端版本切换 API + 版本数上限提示，使版本管理链路端到端完整。

## 现状分析

已实现（无需改动）：

| 模块 | 状态 |
|---|---|
| `ProductionShotVideoVersion` 接口 | ✅ |
| `previewVideoVersions` / `selectedPreviewVideoVersionId` 字段 | ✅ |
| 前端版本选择器 UI（StepStoryboardPreviewPanel） | ✅ |
| 前端版本切换逻辑（ProductionWizard `selectShotVideoVersion`） | ✅ |
| 旧数据迁移 `previewVideoPath` → `videoVersions[0]`（migrateProject） | ✅ |
| 前后端 merge 逻辑（union merge by id） | ✅ |
| 胶片条 vN 角标 | ✅ |
| A/B 对比面板 | ✅ |
| batchJobsQueue 生成完自动追加版本 | ✅ |
| "仅保留当前"按钮 | ✅ |

缺失（本次实现）：

| 缺失项 | 说明 |
|---|---|
| 后端 PATCH API | 版本切换目前仅前端 state 更新，下次 auto-save 才持久化到服务器；缺少专用即时持久化接口 |
| 版本上限提示 | 超过 5 个版本时无警告，可能导致磁盘膨胀 |

## AC（验收条件）

### AC-1: 后端版本切换 API

- `PATCH /api/production/project/:id/shots/:shotIndex/version`
- Body: `{ versionId: string }`
- 行为：读取项目 JSON → 找到对应 shotIndex → 设置 `selectedPreviewVideoVersionId` + 同步 `previewVideoPath`/`previewVideoUrl` → 写回
- 返回 `{ ok: true, shotIndex, versionId }`
- 无效 shotIndex/versionId 返回 400

### AC-2: 前端调用 PATCH API

- `selectShotVideoVersion` 回调中除了更新本地 state，还调用 PATCH API 即时持久化
- API 调用失败时不阻塞 UI（fire-and-forget + console.warn）

### AC-3: 版本上限提示

- 当某镜头 `previewVideoVersions.length >= 5` 时，在版本列表上方显示黄色提示：「版本已达 N 个，建议清理旧版本以节省磁盘空间」
- "仅保留当前"按钮已存在，无需新增

### AC-4: 后端版本清理 API

- `DELETE /api/production/project/:id/shots/:shotIndex/versions`
- Body: `{ keepVersionId: string }`
- 行为：保留 keepVersionId，删除该 shot 其他版本的视频文件（如果 videoPath 存在） + 更新项目 JSON
- 前端 "仅保留当前" 按钮调用此 API

## 改动范围

### 后端（不涉及禁止修改的文件）

| 文件 | 改动 |
|---|---|
| `h5-video-tool-api/src/routes/productionPersist.ts` | 新增 PATCH 和 DELETE 路由 |

### 前端

| 文件 | 改动 |
|---|---|
| `h5-video-tool/src/api/production.ts` | 新增 `patchShotVersion` / `deleteShotVersions` API 函数 |
| `h5-video-tool/src/pages/ProductionWizard.tsx` | `selectShotVideoVersion` 中追加 API 调用；`onKeepOnlyCurrentVersion` 中追加 API 调用 |
| `h5-video-tool/src/studio/steps/StepStoryboardPreviewPanel.tsx` | 版本 >= 5 时显示黄色提示 |

## 风险

| 风险 | 缓解 |
|---|---|
| PATCH 并发：auto-save 和 PATCH 同时写同一个 JSON | PATCH 只修改目标 shot 的两个字段，save 做 merge；可接受 |
| 版本文件误删 | DELETE 只删除非 keepVersionId 的文件；操作前确认文件路径在 production 目录内 |

## 测试矩阵

| 场景 | 验证方式 |
|---|---|
| 切换版本后刷新，版本保持 | 手动验证 |
| 新生成视频，版本数递增 | 生成一次，检查版本列表 |
| 版本 >= 5 时黄色提示出现 | 手动验证 |
| 仅保留当前：其他版本文件删除 | 检查服务器磁盘 |
| 无效 shotIndex 返回 400 | curl 测试 |

---

*Planner: Gate 1 PASS*
