# Release Decision

## Gate

Gate 5 - Delivery

## Decision

`GO`（带边界发布）

## Release Boundaries

1. 包含：
   - 后端 Imagen 串行队列。
   - 前端高级制片批量补图并发=1。
2. 不包含：
   - 管理员监控面板（日调用/成功率/token）。
   - 跨进程分布式队列。
   - 完整错误提示体系重构。

## Blocking Issues

- 无阻塞发布问题。

## Accepted Risks

1. 补图总耗时会增加。
2. 外部配额打满时仍可能报 429。

## Post-release Follow-ups

1. 增加 429/timeout/auth 的统一错误文案与引导。
2. 增加管理员可见的 key 调用监控页面（按账号、日聚合）。
3. 如启用 PM2 多实例，升级队列为跨进程方案。

