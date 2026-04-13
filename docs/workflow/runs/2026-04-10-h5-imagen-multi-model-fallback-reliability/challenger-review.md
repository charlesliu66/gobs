# Challenger Review

## Gate

Gate 1.5 - Challenge Planning

## Findings

### must-fix-before-build

1. 必须确认“超时是模型问题还是网络问题”，不能只改模型。
2. 必须避免单次调用把所有候选模型一起卡死（需要可控降级顺序）。

### should-fix-in-plan

1. 云端 `IMAGEN_RETRY_ATTEMPTS` 不应为 1，应至少 2。
2. 候选模型应可通过环境变量配置，便于后续热调。

### accepted-with-risk

1. 仅靠模型 fallback 不能兜底网络 TLS 握手超时。

## Gate Verdict

`accepted-with-risk`，允许进入 Build。

