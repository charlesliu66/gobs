# Challenger Review — TASK-B 自动打标引擎

**Date:** 2026-04-14  
**Reviewer:** Challenger (Gate 1.5)  
**Reviewed:** planner-spec.md

---

## 挑战项逐一验证

### C1: Compass Vision API 是否支持图片 base64 输入

**结论：CONFIRMED（无风险）**

通过读取 `src/services/video/frameVisionRank.ts` 和 `src/services/promptPolish.ts`，确认：

- `compassChatCompletionWithContent()` 函数（promptPolish.ts:256）已支持 `image_url` content 类型
- 实际调用格式：`{ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...' } }`
- `frameVisionRank.ts` 已在生产中使用此模式处理视频帧，可直接复用
- **可以直接 import `compassChatCompletionWithContent` 使用，无需重造**

### C2: 视频截帧方案（ffmpeg spawn）是否会阻塞

**结论：无风险，但需注意实现细节**

- `ffmpeg-static` 已在 package.json 依赖中（`"ffmpeg-static": "^5.3.0"`）
- `frameVisionRank.ts` 使用 `spawn` + Promise 包装（非阻塞），但 spec 计划用 `promisify(execFile)` — 两者都是异步子进程，均不阻塞 Node.js 事件循环
- `assetIngestService.ts` 中 aiTagAsset 将以 fire-and-forget 方式调用（不 await），进一步确保不阻塞导入任务
- 临时文件清理：需在 finally 块中清理，防止 ffmpeg 失败时遗留 tmp 文件

**修正建议（minor）：** 在 extractFirstFrame 中用 try/finally 包裹 unlinkSync，确保即使后续逻辑报错也能清理 tmpFile。

### C3: Confidence 来源是否可信

**结论：方案合理，有明确 fallback**

- 主路径：prompt 明确要求 `{ confidence: { type: 0.9, scene: 0.85, ... } }` 格式
- fallback：若模型未返回 confidence 字段，给 0.6（低于阈值，进入 pending 状态）— 此设计保守且安全
- 无法完全验证 Gemini 是否总是遵守 confidence 格式，但 fallback 机制确保 AC-B1 和 AC-B2 可达
- `frameVisionRank.ts` 的经验表明 gemini-2.5-flash 对结构化 JSON 输出遵从度高

### C4: aiTagAsset 激活方式（assetIngestService.ts 修改）

**结论：无阻塞风险**

- processFile 函数中，规则打标后调用 `void aiTagAsset(assetId)` — fire-and-forget，不 await
- 即使 aiTagAsset 抛出（代码层面不应该，但双重保障），不影响 processFile 返回值
- AC-B3（不阻塞整体导入任务）可满足

### C5: 平台规则打标（新增）

**结论：可行，需添加到 computeRuleTags 中**

- 平台标签（TikTok/YouTube）属于规则打标范畴，应在 applyRuleTags 中处理
- 需要 orientation + duration 信息，asset 记录已有这些字段
- 不影响 AI 打标路径

---

## Must-Fix 清单

无 must-fix 项。

---

## Should-Fix 清单（Builder 实现时注意）

1. **extractFirstFrame 的 tmpFile 清理** 用 try/finally 包裹（而非简单在末尾 unlinkSync）
2. **JSON 解析容错**：模型可能返回 markdown 代码块（```json ... ```），需要先 strip
3. **图片大小限制**：大图（>10MB base64）可能超 API 限制，建议如果 filesize > 5MB 则 resize（可用 ffmpeg 或简单截断）— 本版本可跳过，记录为 TODO
4. **import `compassChatCompletionWithContent` from promptPolish.ts**（不要自造调用层）

---

## 决定

**PASS — 进入 Builder 阶段**
