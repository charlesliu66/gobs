# Builder Report

## Gate

Gate 2 - Build

## Implemented

1. `h5-video-tool-api/src/services/imagenPython.ts`
   - 新增 `COMPASS_IMAGEN_MODEL_CANDIDATES` 候选模型解析。
   - Node 层按候选模型顺序执行降级尝试（严格单模型执行）。
2. `h5-video-tool-api/scripts/imagen_generate.py`
   - 新增 `COMPASS_IMAGEN_STRICT_MODEL` 开关（开启时只尝试传入模型）。
3. 云端配置更新：
   - `IMAGEN_RETRY_ATTEMPTS=2`
   - `IMAGEN_REQUEST_TIMEOUT_MS=120000`
   - `STORYBOARD_IMAGE_TIMEOUT_MS=120000`
   - `COMPASS_IMAGEN_MODEL_CANDIDATES=gemini-3.1-flash-image-preview,gemini-3-pro-image-preview`

## Self-test Evidence

1. Backend build：通过。
2. Python 语法检查：`py_compile` 通过。
3. 云端探针：
   - `HAS_MODEL_CANDIDATES true`
   - 配置项已生效并可读。

## Not Implemented

1. 云端代理地址自动探测与自动切换（需要可用代理基础设施）。

## Known Risks

1. 若云端到 Compass TLS 握手超时，fallback 仍可能全部失败。

