# Planner Spec

## Feature

`h5-imagen-multi-model-fallback-reliability`

## Goal

解决“高级制片一张图都生成不成功（>120s）”问题，并增加可配置的模型 backup 降级能力。

## Scope (In)

1. 复盘云端超时根因（代码、配置、网络）。
2. 实现后端多模型候选降级（优先 Flash，失败再 Pro）。
3. 云端参数落地（重试、超时、候选模型）。
4. 给出发布判定（GO/NO-GO）与阻塞项。

## Out of Scope

1. 更换供应商（离开 Compass）。
2. 新增跨地域网络基础设施（专线、NAT 网关改造）。

## Acceptance Criteria

- AC-1：后端支持 `COMPASS_IMAGEN_MODEL_CANDIDATES` 候选模型降级。
- AC-2：Python 脚本支持“严格单模型执行”开关，便于 Node 层接管降级顺序。
- AC-3：云端生图配置更新：`IMAGEN_RETRY_ATTEMPTS=2`，`IMAGEN_REQUEST_TIMEOUT_MS=120000`。
- AC-4：完成云端连通性证据采集并解释“为何一张都不成功”。
- AC-5：形成可执行的下一步修复建议（含网络/代理方向）。

## Risks

1. 若云端到 Compass 链路 TLS 握手不稳定，模型切换也可能全部失败。
2. 提高重试会增加请求时长与排队时间。

## Test Matrix

1. Backend build 通过。
2. 云端部署探针验证新逻辑与新 env 生效。
3. 云端网络连通性探针（DNS/HTTP/TLS）输出证据。

