# Planner Spec

## Feature

`h5-imagen-linear-stability-and-observability`

## Goal

在不更换现有 Compass key 与模型的前提下，降低 H5 高级制片生图失败率，重点解决“本地可用但云端 H5 经常超时/429”的问题。

## Scope (In)

1. 将服务端 Imagen 请求改为进程内线性执行（并发=1）。
2. 将高级制片“批量补图”前端并发改为 1，避免前端侧放大并发。
3. 明确诊断结论：区分本地单次成功与云端高负载失败的差异原因。
4. 产出验证证据：本地构建、云端日志与运行状态检查。

## Out of Scope

1. 更换/新增 key 或多 key 路由策略。
2. 改造供应商计费策略或模型切换策略。
3. 新增完整监控后台页面（调用次数/成功率/token 面板）。
4. 引入跨进程分布式队列（当前仅保证单进程串行）。

## Context & Problem Statement

- 本地脚本单次调用 `gemini-3.1-flash-image-preview` 可成功出图。
- 云端 H5 在高级制片场景下出现大量 `Imagen 调用超时` 与 `429 RESOURCE_EXHAUSTED`。
- 原因并非“key 无效”，而是高频请求叠加造成链路抖动与配额/限流触发。

## Acceptance Criteria

- **AC-1**: 服务端 `generateImageWithPython()` 对并发请求进行串行化，任意时刻只执行一个 Imagen 任务（单进程内）。
- **AC-2**: 前端高级制片批量补图任务并发数从 2 调整为 1。
- **AC-3**: 前后端均可成功构建（`npm run build`）。
- **AC-4**: 代码变更不引入新的 lint 错误（针对改动文件）。
- **AC-5**: 验证结论可解释“本地可用、H5不稳”的原因，并提供后续调优建议。

## Risks

1. **吞吐下降**：并发降为 1 会延长批量补图总时长。
2. **单进程假设**：若未来 PM2 多实例部署，进程内队列不能跨实例互斥。
3. **外部依赖不稳定**：即使线性化，429/网络抖动仍可能发生，但概率会下降。

## Mitigation

1. 保留后续可配置开关（并发参数可再调回）。
2. 后续如启用多实例，升级为 Redis/DB 锁或消息队列。
3. 下一阶段补充错误码细分与配额提示、重试策略优化。

## Test Matrix

1. **Build**: `h5-video-tool-api` 构建通过。
2. **Build**: `h5-video-tool` 构建通过。
3. **Static check**: 改动文件无 lint 报错。
4. **Behavior check**: 检查代码路径中并发值与队列逻辑已生效。
5. **Runtime evidence**: 云端日志继续采样，确认核心错误从“并发放大”角度被抑制（非保证 0 错误）。

