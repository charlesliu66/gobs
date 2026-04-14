# ChallengerReview - TASK-A 资产中台后端基建

## 1) Inputs

- PlannerSpec file: `docs/workflow/runs/2026-04-14-asset-lib-task-a/planner-spec.md`
- Planner version/date: 2026-04-14

---

## 2) Challenge Findings

| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Feasibility | ~~must-fix-before-build~~ **已解决** | **BLOCK-1**：新 `services/assetIngestService.ts` 与旧 `services/assetLibrary.ts` 共存时，模块命名和 `Asset` 类型是否冲突？ | 若编译器 import 路径混淆，`npm run build` 可能报错，且旧功能可能被意外破坏 | **已通过架构决策解决**：新旧两套系统完全并存、互不干扰。旧路由 `/api/assets/`（`routes/assets.ts` + `services/assetLibrary.ts`，JSON 索引）完全不动；新路由 `/api/asset-library/`（`routes/assetLibrary.ts` + `services/assetIngestService.ts` 等，SQLite）独立新建。新类型文件 `types/assetLibrary.ts` 使用 `AssetRecord` 等不冲突命名。 |
| C-002 | Feasibility | ~~must-fix-before-build~~ **误判** | **BLOCK-2**：新路由前缀 `/api/asset-library/` 与旧 `/api/assets/` 是否存在 Express 路径冲突？ | 若路径前缀重叠，旧接口可能被新 router 拦截，造成 404 或行为异常 | **误判，无需处理**：`/api/asset-library/` 与 `/api/assets/` 字符串完全不同，Express 不会产生匹配歧义。两者通过独立 `app.use()` 注册，路由隔离。 |
| C-003 | Feasibility | ~~must-fix-before-build~~ **误判** | **BLOCK-3**：spec 中 `POST /import` 是否真的是 jobId 异步模式，还是同步阻塞？200 文件同步处理会超时 | 若为同步阻塞，200 文件 ffprobe 提取会造成请求超时（几十秒），前端体验极差 | **误判，spec 已定义**：planner-spec §4 Technical Approach"异步导入"一节明确定义：POST 立即返回 `{ jobId }`，后台 `setImmediate`/`Promise.resolve().then()` 分批处理，每批 20 文件。BLOCK-3 对 spec 理解有误。 |
| C-004 | Feasibility | ~~must-fix-before-build~~ **已解决** | **BLOCK-4**：better-sqlite3 是 C++ 原生模块，ESM 项目（`"type":"module"`）中无法用 `import` 直接引入，`require()` 在 ESM 上下文不可用，可能导致构建失败 | 若无法正确加载 better-sqlite3，整个 DB 层无法工作，`npm run build` 可能零错误但运行时崩溃 | **已通过 createRequire 方案解决**：在 `src/db/assetDb.ts` 中使用 `import { createRequire } from 'module'; const require = createRequire(import.meta.url); const Database = require('better-sqlite3');`。生产环境（Linux CVM）直接编译安装，无兼容性问题；开发环境（Windows）需要 node-gyp，可接受。 |

---

## 3) Plan Improvement Requests

- Request 1（should-fix，Builder 实现时注意）：
  - Planner section to update: §4 Technical Approach - Architecture Decisions（持久化）
  - Expected revision: 明确标注 Builder 在 `src/db/assetDb.ts` 初始化时须执行 `PRAGMA journal_mode=WAL`，以支撑 §7 压力测试"并发 3 用户各导入 100 文件"场景，避免 `SQLITE_BUSY` 错误。spec 已在 Risk R-3 提及，但 Delivery Artifacts 和 DB 初始化描述中未将其列为必须项。

- Request 2（should-fix，Builder 实现时注意）：
  - Planner section to update: §3 Module Breakdown - `services/assetSearchService.ts`
  - Expected revision: 明确提示 Builder：所有 DB 查询（包括 search/facets）必须强制携带 `WHERE username = ?` 子句，不得依赖调用方传入。AC-6 和 R-6 已要求，但 module 描述中未显式重申，易在实现时遗漏。

- Request 3（should-fix，Builder 实现时注意）：
  - Planner section to update: §4 Technical Approach - 异步导入
  - Expected revision: 明确 200 文件分批 20 个的循环边界条件：最后一批若不足 20 个文件，循环须正常终止并将 `import_jobs.status` 设为 `done`，避免 off-by-one 导致 job 永远停留在 `running` 状态。

---

## 4) Gate 1.5 Verdict

- Verdict: **PASS**
- Blocking item count: **0**（所有 4 个原始 BLOCK 均已解决或认定为误判）
- Notes: Challenger 发现的全部 4 项 BLOCK 已在本次 Gate 1.5 会议中通过架构决策逐一闭合。新旧系统并存方案（BLOCK-1）、ESM createRequire 适配方案（BLOCK-4）已明确可行；路径冲突（BLOCK-2）和同步阻塞（BLOCK-3）为对 spec 的误读，无需处理。Builder 可以开始 Build 阶段。

---

## 5) Residual Risks Accepted for Build

- Risk: WAL 模式若未开启，高并发写入可能出现 `SQLITE_BUSY`
  - Why accepted now: 属于实现细节，Builder 已被明确告知（Request 1），且 spec Risk R-3 已记录缓解措施
  - Boundary: 仅影响并发导入场景，单用户场景不触发
  - Follow-up gate: Builder 提交代码后 Code Review 检查 `PRAGMA journal_mode=WAL` 是否存在于 `assetDb.ts`

- Risk: 用户隔离 WHERE 子句遗漏
  - Why accepted now: 属于实现细节，已在 should-fix Request 2 中告知 Builder，AC-6 有验收测试覆盖
  - Boundary: 仅在遗漏时才触发跨用户数据泄露
  - Follow-up gate: AC-6 验收测试（两组 JWT token 互查数据）

- Risk: Windows 开发环境 node-gyp 安装摩擦
  - Why accepted now: 生产环境（Linux CVM）无问题，BLOCK-4 createRequire 方案已确认可行；Windows 开发摩擦属于一次性环境配置成本
  - Boundary: 仅影响 Windows 开发者首次安装，不影响生产构建和 CI
  - Follow-up gate: 无需额外门控，开发者按需安装 node-gyp 即可
