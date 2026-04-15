# SESSION-ANCHOR — 2026-04-14-asset-lib-task-a

> 每轮对话开始时 AI 必须先读这个文件，然后只读"允许读取"列表中的文件。

## 本轮目标（一句话）

为 GOBS/QAS H5 视频工具套件实现资产中台后端基建——包括 SQLite 持久化、导入-解析-去重-规则打标-检索全链路 API——支撑前端（TASK-C）和打标引擎（TASK-B）快速接入。

## 验收标准 ID

- AC-1: 能导入 200+ 文件并稳定完成（分批处理，不阻塞请求；processed+failed == total）
- AC-2: 任务状态可轮询（GET /import/:jobId），服务重启后 running job 自动重置为 interrupted
- AC-3: 标签可批量编辑（PATCH 单条 + POST batch-tags 批量，支持 confirm/reject/modify）
- AC-4: 按角色/场景/用途/比例/时长/类型 6 个维度检索可用（GET /search + GET /assets + GET /facets）
- AC-5: `npm run build` 零 TypeScript 错误
- AC-6: 多用户隔离（用户只能看/操作自己的素材，跨用户操作返回 403）

## 本轮禁区（绝对不能改）

- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/routes/productionPersist.ts`（当前有未提交修改，禁止触碰）
- `h5-video-tool-api/src/types/productionTypes.ts`（如存在）
- `h5-video-tool-api/src/services/productionAssets.ts`（如存在）
- `h5-video-tool-api/src/services/assetLibrary.ts`（旧素材索引服务，不得修改，新模块另起文件名）
- `h5-video-tool-api/src/routes/assets.ts`（旧 /api/assets 路由，不得修改）

## 允许读取的文件（按需展开，其他不看）

```
docs/workflow/runs/2026-04-14-asset-lib-task-a/planner-spec.md   ← 首先读取
docs/TASK-A-素材中台后端基建.md
docs/PRD-素材中台-自动打标资产库.md
h5-video-tool-api/src/index.ts                                   ← 注册新路由时参考
h5-video-tool-api/src/middleware/auth.ts                         ← req.user 类型
h5-video-tool-api/src/config/apiDataDir.ts                       ← getApiDataDir() 路径
h5-video-tool-api/src/services/batchJobsQueue.ts                 ← 异步 job 模式参考
h5-video-tool-api/src/routes/editorProjects.ts                   ← SQLite better-sqlite3 用法参考（如有）
h5-video-tool-api/package.json                                   ← 确认已有依赖（better-sqlite3, ffmpeg-static, multer）
```

## 当前进度

- [ ] AC-1: 未开始（assetIngestService + 导入任务异步处理 + 分批 200+）
- [ ] AC-2: 未开始（import_jobs 轮询 + 服务重启恢复）
- [ ] AC-3: 未开始（PATCH /assets/:id/tags + POST /assets/batch-tags）
- [ ] AC-4: 未开始（assetSearchService + GET /search + GET /assets + GET /facets）
- [ ] AC-5: 未开始（npm run build 验证）
- [ ] AC-6: 未开始（多用户隔离 + 403 验证）

---

## 实现检查清单（Builder 用）

### 阶段 0：基础设施

- [ ] 确认 `package.json` 中存在 `better-sqlite3`、`ffmpeg-static`、`multer`（如缺失先 npm install）
- [ ] 新建 `src/db/assetDb.ts`：初始化 DB 连接单例，执行 CREATE TABLE IF NOT EXISTS（assets / asset_tags / import_jobs），开启 WAL 模式

### 阶段 1：类型定义

- [ ] 新建 `src/types/assetLibrary.ts`：导出 `AssetRecord`、`AssetTag`、`ImportJob`、`SearchQuery`、`FacetResult` 等类型

### 阶段 2：Service 层

- [ ] 新建 `src/services/assetIngestService.ts`
- [ ] 新建 `src/services/assetTaggingService.ts`（规则打标 + aiTagAsset 占位）
- [ ] 新建 `src/services/assetSearchService.ts`（分页/筛选/facets）
- [ ] 新建 `src/services/assetHighlightService.ts`（占位）

### 阶段 3：路由层

- [ ] 新建 `src/routes/assetLibrary.ts`（7 个端点，全部鉴权）

### 阶段 4：注册与恢复

- [ ] 修改 `src/index.ts`：import assetLibraryRouter，app.use('/api/asset-library', assetLibraryRouter)，启动时重置 interrupted jobs

### 阶段 5：验收

- [ ] `npm run build` 零错误（AC-5）
- [ ] curl 验收脚本验证 AC-1 ~ AC-4、AC-6

---

> **使用说明**：
> 1. Builder 每轮开始时先读本文件，更新"当前进度"勾选框
> 2. Verifier 在验证前读本文件，确认 AC 覆盖完整
> 3. Integrator 在写 release-decision 前检查所有 AC 是否已勾选
