# Release Decision

## Gate

Gate 5 - Delivery

## Decision

`GO`

## Blocking Issues

- 无 P0/P1 阻塞项。

## Accepted Risks

1. 外部供应商配额与网络波动仍可能导致失败。
2. 超时窗口增大可能让单次失败等待更久。

## Release Boundaries

本次仅包含：

1. 高级制片后端 `storyboard` 路由超时硬编码清理与统一配置化。
2. 该路由重试覆盖移除（恢复全局策略）。
3. 前端批量补图客户端超时从 90s 调整到 180s。
4. 云端重新部署并探针验证。

不包含：

1. 全站错误提示统一重构。
2. 配额面板/告警系统建设。

## Next Actions

1. 观察 24 小时云端错误日志中 429 与 timeout 占比变化。
2. 如仍高频 429，再做配额治理与重试退避优化。

