# Challenger Review

Run: `2026-05-06-campaign-creative-agent-phase0-phase1`  
Date: 2026-05-06  
Reviewer: Codex Challenger sidecars

## Must-Fix Before Builder Completes

1. 首页重定位不能只改文案，不改主路径。
   - 必须让用户从首页和导航都能显式进入 `Campaign Creative`
   - 不能仍然把 `Editor` 作为默认 first-touch 入口

2. `Campaign Creative` 必须是独立页面，而不是继续埋在现有 `AgentPanel` 里。
   - Phase 1 的目标是 brief-first entry
   - 如果只是在 editor 内补几个表单字段，会回退成“编辑器增强”而不是“campaign creative 入口”

3. brief 字段扩展必须前后端类型一致。
   - `region`
   - `forbiddenClaims`
   - 不能只改前端或只改 prompt block

4. `Brand Content / TikTok UA` 必须做到 UI 标签与内部 mode 映射一致。
   - UI 用市场语言
   - 内部仍可沿用 `tiktok_content / tiktok_ua`
   - 但不能出现显示名、请求字段、strategy 输出三套口径漂移

5. strategy card 不能只是展示文案，至少要真正进入 handoff 链路。
   - 从 `/campaign-creative` 跳到 `Editor` 时，brief / strategy 不能丢
   - `Editor` 首次 agent 执行时必须优先消费 handoff 上下文

6. handoff 失败时必须可回退到现有 editor 逻辑。
   - `sessionStorage` 或轻量状态方案可以用
   - 但不能让 editor 因 handoff 缺失或脏数据直接不可用

7. 首页收口不能破坏现有 `Studio / Editor / Distribute` 主链路。
   - 允许优先级调整
   - 不允许出现旧入口消失、误跳转、路由高亮错误或主操作不可达

8. 本 run 禁止借机扩成 variant system 或 brief persistence 系统。
   - 不做真实多变体 timeline 批产
   - 不做长期 brief 库
   - 不做 publish feedback 回流

## Recommended Implementation Guardrails

- 首页目标要从“做视频”改成“做创意测试包 / Campaign Creative”
- `/campaign-creative` 页面首版只保留一条主 CTA：进入 `Editor`
- `Editor` 在这个 run 中是接力器，不是主入口
- 新增字段先保证进入 strategy / prompt / handoff，不要求本轮做持久化
- 所有新文案要同步进 `messages.ts`，避免中英文和旧硬编码继续分裂

## Main Risks To Watch

1. Scope creep into variant pack
   - 一旦开始做 3-5 条真实变体，当前 run 会立刻失控

2. Page-only implementation
   - 如果只做入口页视觉和文案，不打通 editor handoff，这轮价值会明显不足

3. Editor regression
   - `AgentPanel` 和 `EditorWorkbench` 一旦改坏，会影响当前已可用链路

4. Prompt drift
   - 新增 brief 字段如果没有真正进入后端 prompt path，会变成“假字段”

## Gate Result

- Challenger approves Builder start only if Builder keeps the run scoped to:
  - `homepage/nav repositioning`
  - `campaign-creative page`
  - `brief + strategy typing`
  - `editor handoff`
- Any move toward:
  - `variant pack`
  - `brief persistence`
  - `publish feedback`
  must be treated as scope expansion and stopped for re-confirmation.
