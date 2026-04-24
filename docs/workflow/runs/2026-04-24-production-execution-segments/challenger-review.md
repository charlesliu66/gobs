# Challenger Review: Production Execution Segments

## Must-Fix Review

### 1. 用户心智不能从 shot 被强行切换到 segment

- Risk: 如果 UI 直接暴露 segment，会破坏高级制片原本按叙事分镜浏览的心智。
- Resolution: 本轮保持 `shots[]` 为主视图，只在 enqueue / persist / aggregate status 时使用 `executionSegments[]`。
- Status: cleared

### 2. 旧项目 JSON 不能因为缺失 segment 字段而失效

- Risk: 历史项目只有 `shots[]`，如果加载链路没有兼容，会导致项目打不开或状态丢失。
- Resolution: execution segment 服务层提供基于 `shots[]` 的派生与 merge 逻辑，保存时保留已有字段并增量写回。
- Status: cleared

### 3. 入队状态不能继续出现“已入队但其实已失败”的假成功

- Risk: 用户会误判即梦后台和批量看板不同步。
- Resolution: 前端在 enqueue 返回后立刻 upsert 最新 job，并在 `failed/cancelled` 终态时直接展示错误，不再统一 toast 成功。
- Status: cleared

## Residual Risk

- `PRODUCT.md` 仍是历史编码文件，本轮未继续整理其编码格式，仅保留现有仓库状态。
- release run 产物是补录的，后续如继续扩展高级制片主流程，建议把 builder / verifier 模板进一步标准化。

