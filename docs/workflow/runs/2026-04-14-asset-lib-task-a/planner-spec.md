# PlannerSpec — TASK-A 资产中台后端基建

## 1) Project Goal

- **Business goal:** 为 GOBS/QAS H5 视频工具套件提供可用的"导入-解析-打标-检索"后端能力，支撑素材中台前端（TASK-C）与打标引擎（TASK-B）快速接入。
- **User value:** 用户上传素材包后，系统自动去重、提取元数据、规则打标，并支持多维度检索，消除"手动翻找素材"痛点。
- **Success metrics:** 200+ 文件导入零丢失；6 个筛选维度可用；所有接口鉴权隔离；`npm run build` 零错误。

---

## 2) Scope

### In Scope

- 新增 SQLite 数据库（better-sqlite3）及三张表：`assets`、`asset_tags`、`import_jobs`
- 新增路由模块 `routes/assetLibrary.ts`，前缀 `/api/asset-library/`，全部路由需要 JWT 鉴权
- 新增服务模块：
  - `services/assetIngestService.ts`：文件接收 → sha256 去重 → ffprobe 元数据提取 → 入库 → 触发规则打标
  - `services/assetTaggingService.ts`：规则打标（比例/质量/时长/类型），预留 AI 打标接口（占位，TASK-B 接管）
  - `services/assetSearchService.ts`：分页筛选 + 关键词全文检索 + facets 统计
  - `services/assetHighlightService.ts`：占位模块，TASK-D 实现
- 新增类型定义 `types/assetLibrary.ts`
- 导入任务异步执行：POST 立即返回 jobId，后台分批处理（每批 20 文件）；服务重启后 `running` 任务重置为 `interrupted`
- 多用户隔离：所有查询强制过滤 `username = req.user.username`
- 素材文件存储路径：`{API_DATA_DIR}/assets/{username}/`

### Out of Scope

- AI 打标实现（由 TASK-B 接管，`assetTaggingService.ts` 只留空接口 `aiTagAsset()`）
- 视频高光候选实现（由 TASK-D 接管，`assetHighlightService.ts` 仅导出占位函数）
- 前端 UI（由 TASK-C 接管）
- 接入生成/剪辑流水线（由 TASK-D 接管）
- 修改任何已存在的禁区文件（见"本轮禁区"）
- 云盘/zip 批量导入（后续版本）
- 断点续传（后续版本，当前 job 可轮询状态但不支持 resume from offset）

---

## 3) Module Breakdown

- **`types/assetLibrary.ts`**
  - 职责：所有 TASK-A 使用的 TypeScript 类型定义（Asset, AssetTag, ImportJob, SearchQuery, FacetResult 等）
  - 依赖：无

- **`services/assetIngestService.ts`**
  - 职责：创建 import job、分批处理文件上传（multipart/form-data）、sha256 去重、ffprobe 元数据提取（分辨率/时长/帧率/方向/音轨）、写入 assets 表、触发同步规则打标、更新 job 进度
  - 依赖：`types/assetLibrary.ts`、better-sqlite3 DB 实例、ffmpeg-static（ffprobe）、crypto（sha256）

- **`services/assetTaggingService.ts`**
  - 职责：规则打标（orientation → portrait/landscape/square；duration → short/medium/long；ratio → 9:16/16:9/1:1/other；quality → hd/sd；type → image/video）；预留 `aiTagAsset(assetId: string): Promise<void>` 占位接口（TASK-B 实现）
  - 依赖：`types/assetLibrary.ts`、better-sqlite3 DB 实例

- **`services/assetSearchService.ts`**
  - 职责：分页+多维度筛选列表查询、关键词全文搜索（LIKE filename + tag value）、facets 统计（各维度 key 的 value 计数）
  - 依赖：`types/assetLibrary.ts`、better-sqlite3 DB 实例

- **`services/assetHighlightService.ts`**
  - 职责：占位，导出 `getHighlightCandidates(assetId: string): Promise<never[]>`（TASK-D 实现）
  - 依赖：无

- **`routes/assetLibrary.ts`**
  - 职责：挂载所有 `/api/asset-library/*` 路由，使用 `req.user`（由全局 jwtAuthMiddleware 注入）进行用户隔离，调用上述 service 层
  - 依赖：所有 services 模块、`src/middleware/auth.ts`（req.user 类型）

---

## 4) Technical Approach

### Architecture Decisions

- **持久化**：better-sqlite3（同步 API，无回调地狱），单文件 SQLite 位于 `{API_DATA_DIR}/assets.db`
- **DB 初始化**：在 `assetIngestService.ts` 或独立 `db/assetDb.ts` 中执行 `CREATE TABLE IF NOT EXISTS`，服务启动时自动建表
- **去重策略**：`sha256 + filesize` 双重校验，同一 username 下查 assets 表，如命中则跳过写入、记录到 job 的 `skipped` 计数
- **元数据提取**：调用 `ffprobe`（通过 `ffmpeg-static` 获取路径），JSON 输出解析 streams 字段；图片文件用 `sharp` 或直接读 EXIF 获取宽高（如 sharp 未安装则回退为 0）
- **异步导入**：`POST /api/asset-library/import` 接收 multipart 上传文件列表 → 立即将文件落盘到 `{API_DATA_DIR}/assets/{username}/` → 创建 import_job 记录（status=pending）→ 返回 `{ jobId }` → `setImmediate`/`Promise.resolve().then()` 启动后台处理循环，每批 20 文件
- **服务重启恢复**：`index.ts` 启动时查询 `import_jobs WHERE status='running'`，批量 UPDATE 为 `interrupted`
- **规则打标时机**：每个文件 ingest 完成后同步执行规则打标（插入 asset_tags），不阻塞批次循环

### Data Flow

```
POST /api/asset-library/import (multipart files)
  → 落盘到 {API_DATA_DIR}/assets/{username}/
  → INSERT import_jobs (status=pending)
  → return { jobId }
  → [background] 分批处理:
      sha256 去重 → INSERT assets → 规则打标 INSERT asset_tags
      → UPDATE import_jobs (processed++/failed++)
  → [final] UPDATE import_jobs (status=done)

GET /api/asset-library/import/:jobId
  → SELECT * FROM import_jobs WHERE id=? AND username=?
  → return { id, status, total, processed, failed }

GET /api/asset-library/assets
  → SELECT assets JOIN asset_tags ... WHERE username=? [filters] LIMIT/OFFSET
  → return { items: Asset[], total, page, pageSize }

PATCH /api/asset-library/assets/:id/tags
  → 验证 assets.username = req.user
  → INSERT/UPDATE/DELETE asset_tags (status=confirmed/rejected)

POST /api/asset-library/assets/batch-tags
  → 同上，批量执行

GET /api/asset-library/search
  → LIKE filename/tag value + dimension filters
  → return paged results

GET /api/asset-library/facets
  → SELECT key, value, COUNT(*) FROM asset_tags
    JOIN assets ON asset_id=assets.id WHERE assets.username=?
    GROUP BY key, value
  → return { [key]: { [value]: count } }
```

### API Changes

新增路由，注册到 `src/index.ts`：

```
import assetLibraryRouter from './routes/assetLibrary.js';
app.use('/api/asset-library', assetLibraryRouter);
```

现有 `/api/assets`（`routes/assets.ts`）保持不变，无冲突。

### Migration / Compatibility Notes

- `assets.db` 首次运行时自动创建，无需迁移脚本
- 现有 `services/assetLibrary.ts`（旧素材索引服务）命名冲突：新服务应命名为 `assetIngestService.ts`、`assetTaggingService.ts`、`assetSearchService.ts`，避免与旧文件同名
- `types/assetLibrary.ts` 与旧 `services/assetLibrary.ts` 中的 `Asset` 类型不同，新类型文件命名空间独立

---

## 5) Risks

| Risk | Trigger | Impact | Mitigation | Owner |
|------|---------|--------|-----------|-------|
| R-1: ffprobe 不可用 | ffmpeg-static 包缺失或路径解析失败 | 视频元数据提取失败，asset 部分字段为 null | try/catch 降级：元数据字段设为 null，asset 仍入库；日志告警 | Builder |
| R-2: 大批量导入内存溢出 | 200+ 文件一次性读入内存 | OOM 崩溃 | 分批处理（每批 20 文件，逐个 stream 到磁盘），不在内存中堆积 Buffer | Builder |
| R-3: SQLite 并发写冲突 | 多用户同时 POST import | SQLITE_BUSY 错误 | better-sqlite3 开启 WAL 模式（`PRAGMA journal_mode=WAL`） | Builder |
| R-4: 服务名/类型命名与旧代码冲突 | 新 `types/assetLibrary.ts` 中 `Asset` 与旧 `services/assetLibrary.ts` 中 `Asset` 同名 | TypeScript 编译器 import 混淆 | 新类型均加前缀 `Lib` 或使用模块别名（`import type { LibAsset }`），或在新类型文件中以 `AssetRecord` 命名，避免歧义 | Builder |
| R-5: multipart 文件大小限制 | Express 默认 `json({ limit: '50mb' })`，但 multipart 另行配置 | 大文件上传 413 | 引入 `multer`，配置合理的单文件上限（如 500MB），总量不限制（流式存盘） | Builder |
| R-6: 用户隔离遗漏 | service 层遗漏 username 过滤 | 跨用户数据泄露 | 所有 DB 查询强制带 `WHERE username = ?`，Code Review 检查 | Builder |

---

## 6) Acceptance Criteria

| ID | Requirement | Validation Method | Done Definition |
|----|------------|------------------|----------------|
| AC-1 | 能导入 200+ 文件并稳定完成，分批处理不阻塞请求 | 上传 200 个混合图片/视频文件，轮询 jobId 至 status=done，检查 processed+failed=total | processed+failed == total，服务进程内存无异常增长，请求未超时 |
| AC-2 | 任务状态可轮询（GET /import/:jobId 返回进度），服务重启后 running job 重置为 interrupted | 手动杀进程后重启，查询之前 running 的 job | GET /import/:jobId 返回 { status: "interrupted", processed: N, total: M }；重启后状态不为 running |
| AC-3 | 标签可批量编辑：PATCH /assets/:id/tags 支持单条 confirm/reject/modify；POST /assets/batch-tags 支持批量 | 构造请求验证 tag status 变更持久化 | DB 中 asset_tags.status 正确更新；非本人资产返回 403 |
| AC-4 | 按角色/场景/用途/比例/时长/类型 6 个维度检索可用（GET /search 和 GET /assets 均支持） | 写入含多维度标签的测试资产，发起各维度筛选请求 | 各维度筛选返回正确结果集；GET /facets 返回各维度计数；查询不跨用户 |
| AC-5 | npm run build 零错误 | 在 h5-video-tool-api/ 根目录执行 npm run build | 无 TypeScript 编译错误，无 missing module |
| AC-6 | 多用户隔离：用户只能看/操作自己的素材 | 用两个不同 JWT token 各导入一批素材，互相查询 | GET /assets 返回的每条记录 username 均等于当前 JWT 用户；跨用户 PATCH 返回 403 |

---

## 7) Test Matrix

| Category | Cases |
|----------|-------|
| Happy path | POST /import 上传 5 个混合文件，轮询 jobId 至 done，GET /assets 返回对应记录，GET /facets 包含对应维度计数 |
| Happy path | PATCH /assets/:id/tags 修改单条标签为 confirmed，持久化后再查验 |
| Happy path | POST /assets/batch-tags 批量 reject 多条 pending 标签 |
| Happy path | GET /search?q=角色&key=type&value=video 返回过滤结果 |
| Happy path | GET /assets?page=2&pageSize=10&ratio=9:16 分页正确 |
| Edge cases | 重复上传同一文件（sha256 相同）：job processed++ 但 assets 表不重复插入 |
| Edge cases | 上传 0 字节文件：标记为 failed，不写入 assets 表 |
| Edge cases | ffprobe 对非视频文件执行：捕获错误，duration/fps 写 null，asset 正常入库 |
| Edge cases | GET /assets 无匹配筛选条件：返回 { items: [], total: 0 } |
| Edge cases | PATCH /assets/:id/tags 对不存在的 id：返回 404 |
| Error path | 上传 200 文件中途服务崩溃重启：GET /import/:jobId 返回 interrupted，processed 反映已完成数量 |
| Error path | 无效 JWT 请求所有 /api/asset-library/* 接口：返回 401 |
| Error path | 用户 A 的 token PATCH 用户 B 的资产：返回 403 |
| Error path | SQLite DB 文件权限问题启动：打印明确错误日志，进程不崩溃（graceful degradation） |
| Regression | 现有 /api/assets 路由（旧素材索引）功能不受影响 |
| Regression | 现有 /api/auth/login 及其他路由不受影响 |
| Stress/Stability | 并发 3 个用户各导入 100 文件：WAL 模式下无 SQLITE_BUSY；各用户数据互不干扰 |
| Stress/Stability | 200 文件导入全程内存不超出正常范围（< 500MB RSS 增量） |

---

## 8) Delivery Artifacts

- **Code changes:**
  - 新增：`h5-video-tool-api/src/types/assetLibrary.ts`
  - 新增：`h5-video-tool-api/src/services/assetIngestService.ts`
  - 新增：`h5-video-tool-api/src/services/assetTaggingService.ts`
  - 新增：`h5-video-tool-api/src/services/assetSearchService.ts`
  - 新增：`h5-video-tool-api/src/services/assetHighlightService.ts`
  - 新增：`h5-video-tool-api/src/routes/assetLibrary.ts`
  - 修改：`h5-video-tool-api/src/index.ts`（注册新路由 + 启动时重置 interrupted jobs）
  - 可选新增：`h5-video-tool-api/src/db/assetDb.ts`（DB 初始化与连接单例）

- **Test evidence:**
  - `curl` / REST 请求日志截图：POST import → GET import/:jobId（done）→ GET assets（有数据）→ GET facets
  - `npm run build` 输出截图（零错误）
  - 多用户隔离验证：两组 token 的 GET /assets 返回各自数据

- **Documents to update:**
  - `docs/TASK-A-素材中台后端基建.md`：勾选完成验收标准
  - `docs/TASK-INDEX-ASSET-LIB.md`：TASK-A 状态改为已完成

---

## 9) Challenger 决策追记（Gate 1.5）

**BLOCK-1 解决方案（已确认）**：新旧两套系统并存，互不干扰：
- 旧系统：`routes/assets.ts` + `services/assetLibrary.ts`（JSON 索引）→ 完全不动
- 新系统：`routes/assetLibrary.ts` + `services/assetIngestService.ts` 等（SQLite）→ 独立新建

**BLOCK-4 解决方案（已确认）**：在 `src/db/assetDb.ts` 中用以下模式适配 ESM：
```ts
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
```
生产环境（Linux CVM）直接编译安装，无兼容性问题。

**BLOCK-2/3（误判）**：新路由前缀 `/api/asset-library/` 与旧 `/api/assets/` 无冲突；jobId 异步模式已在 spec 中定义。
