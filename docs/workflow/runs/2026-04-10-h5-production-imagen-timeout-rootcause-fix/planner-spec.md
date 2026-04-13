# Planner Spec

## Feature

`h5-production-imagen-timeout-rootcause-fix`

## Goal

修复 Gobs 高级制片生图仍报 `Imagen 调用超时（>55s）` 的问题，确保云端实际生效的超时与重试策略与预期一致。

## Scope (In)

1. 排查并确认 `>55s` 报错来源代码路径。
2. 清理后端 `storyboard` 路由硬编码超时（55s/60s）并统一为环境可配置常量。
3. 移除该路径中强制 `maxAttempts: 1` 的覆盖，让重试策略回归统一配置。
4. 前端批量补图本地超时从 90s 提升，避免客户端先于服务端超时。
5. 云端部署与远端探针验证（确认无 `55_000` 残留）。

## Out of Scope

1. 更换模型或新增多 key 调度。
2. 重构全站所有调用链路的超时策略（仅覆盖高级制片相关核心路径）。
3. 计费/监控体系新增字段（本次聚焦故障修复）。

## Acceptance Criteria

- **AC-1**: `h5-video-tool-api/src/routes/storyboard.ts` 不再存在 `55_000/60_000` 的硬编码超时。
- **AC-2**: `storyboard` 生图调用统一使用 `STORYBOARD_IMAGE_TIMEOUT_MS`（默认 120000，可由 env 覆盖并限幅）。
- **AC-3**: `storyboard` 生图调用不再强制 `maxAttempts: 1`。
- **AC-4**: `h5-video-tool/src/pages/ProductionWizard.tsx` 批量补图前端超时提升到 180s。
- **AC-5**: 前后端构建通过，且改动文件 lint 无错误。
- **AC-6**: 云端探针验证 `HAS_55K false` 且 `HAS_TIMEOUT_CONST true`。

## Risks

1. 超时增大可能使失败反馈变慢。
2. 若供应商侧持续限流，仍可能失败（但错误不再被 55s 硬截断放大）。

## Mitigation

1. 超时通过 `STORYBOARD_IMAGE_TIMEOUT_MS` 可回调。
2. 保留串行化与重试策略，后续可叠加配额告警。

## Test Matrix

1. 静态扫描：无 `55_000` 残留于 `src/routes/storyboard.ts`。
2. Backend build: `h5-video-tool-api npm run build`。
3. Frontend build: `h5-video-tool npm run build`。
4. Lint: 改动文件 `ReadLints` 无错误。
5. Cloud deploy probe: 远端 `dist/routes/storyboard.js` 字符串探针。

