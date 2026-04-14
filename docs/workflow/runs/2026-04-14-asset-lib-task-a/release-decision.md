# ReleaseDecision - TASK-A 资产中台后端基建

## 1) Inputs Reviewed
- PlannerSpec: `docs/workflow/runs/2026-04-14-asset-lib-task-a/planner-spec.md`
- BuilderReport: `docs/workflow/runs/2026-04-14-asset-lib-task-a/eval-result.json` (commit `13a04fb` — feat: implement TASK-A asset library backend)
- VerifierReport: `docs/workflow/runs/2026-04-14-asset-lib-task-a/verifier-report.md` (Gate 3: GO, AC-1~AC-6 all PASS)
- Additional evidence: `docs/workflow/runs/2026-04-14-asset-lib-task-a/challenger-review.md` (Gate 1.5: PASS, must-fix 已清零)

## 2) Delivery Decision
- Decision: **GO**
- Decision time: 2026-04-14
- Decision owner: Integrator (Gate 5)

## 3) Blocking Issues
| ID | Severity | Description | Owner | Required before release |
|---|---|---|---|---|
| — | — | 无 P0/P1 缺陷 | — | — |

## 4) Accepted Risks
| Risk | Severity | Why accepted | Boundary/Workaround | Follow-up date |
|---|---|---|---|---|
| P3: PATCH /assets/:id/tags 仅接受 flat 格式（`{key, value, status}`），不接受数组格式；与 batch-tags 数组格式不对称 | P3 | spec 示例措辞模糊；flat 格式满足所有已知用例；不阻断功能 | 在 TASK-B 或 API v2 中统一 body 格式；文档补充说明 flat 格式为唯一有效格式 | TASK-B 开始前 |
| 200 文件压测未在本地运行（测试语料库不足） | P3 | 代码已实现 BATCH_SIZE=20 分批处理、WAL 模式、sha256 去重；单文件端到端通过；Medium 风险可接受至预生产环境验证 | 在预生产环境（或 CI 沙箱）补跑 200 文件压测后方可正式上线 | 预生产部署前 |

## 5) Scope Compliance
- Delivered in scope: Yes
- Out-of-scope changes found: No
- Notes: 已交付 7 个文件（6 个新增 + index.ts 修改）；旧路由 `/api/assets` 及 `routes/assets.ts` 未触碰，回归通过。`aiTagAsset()` 占位接口已预留给 TASK-B；`assetHighlightService.ts` 占位已预留给 TASK-D。

## 6) Release Boundary
- What is guaranteed:
  - POST `/api/asset-library/import` — 异步批量导入，立即返回 jobId，后台 BATCH_SIZE=20 分批处理
  - GET `/api/asset-library/import/:jobId` — 任务状态轮询（pending / running / done / interrupted / failed）
  - 服务重启自动将 running 任务重置为 interrupted
  - GET `/api/asset-library/assets` — 分页 + 多维度筛选（ratio / type / orientation / quality / character / scene / purpose）
  - PATCH `/api/asset-library/assets/:id/tags` — 单条标签 upsert（flat 格式）
  - POST `/api/asset-library/assets/batch-tags` — 批量标签 upsert
  - GET `/api/asset-library/search` — 关键词全文检索（filename + tag value LIKE）
  - GET `/api/asset-library/facets` — 各维度计数统计
  - 全路由 JWT 鉴权，多用户数据隔离（username 过滤）
  - `npm run build` 零 TypeScript 错误（eval-result.json PASS）
- What is not guaranteed:
  - 200 文件并发导入稳定性（压测未验证，留预生产环境补跑）
  - 多用户并发写 WAL 碰撞率（理论安全，实测未覆盖）
  - PATCH body 数组格式支持（仅 flat 格式有效，数组格式返回 400）
  - AI 打标（`aiTagAsset()` 为占位，TASK-B 实现）
  - 视频高光候选（`assetHighlightService.ts` 为占位，TASK-D 实现）
- Environments validated: 本地开发环境（localhost:3456）；Linux CVM 预生产环境部署兼容性未单独验证

## 7) Next Actions
1. TASK-B（自动打标引擎）与 TASK-C（前端审核与检索体验）可并行开始，两者均以 TASK-A 交付的 API 为接入点。
2. TASK-B 接管 `assetTaggingService.ts` 中的 `aiTagAsset()` 占位接口，实现 AI 打标逻辑。
3. TASK-D 接管 `assetHighlightService.ts`，实现视频高光候选服务。
4. 预生产部署前，由 TASK-B 或独立测试任务在 CI 沙箱补跑 200 文件压测，验证 P3 风险。
5. API 文档中补充 PATCH /assets/:id/tags 仅接受 flat 格式的说明，消除与 batch-tags 格式不对称的歧义。
