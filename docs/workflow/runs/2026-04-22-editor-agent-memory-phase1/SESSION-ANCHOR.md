# SESSION-ANCHOR - editor-agent-memory-phase1

> Run ID: `2026-04-22-editor-agent-memory-phase1`
> Sprint: editor agent memory P0 first batch
> 对应规划：项目级记忆持久化、用户级沟通画像、基础上下文保留骨架

---

## 目标（一句话）
先把剪辑 Agent 的同项目历史、结构化项目记忆和用户级沟通画像接进现有编辑器存储链路，为后续压缩与可视化控制打底。

## 本轮交付件
| ID | 范围 | 主要落地文件 |
|---|---|---|
| MEM-01 | 定义项目记忆 / 用户画像 / 摘要快照的数据契约与默认归一化 | `h5-video-tool-api/src/types/editorAgentMemory.ts`<br/>`h5-video-tool/src/editor/types/agentMemory.ts` |
| MEM-02 | 剪辑项目保存/打开时持久化项目级 Agent 历史与摘要 | `h5-video-tool-api/src/routes/editorProjects.ts`<br/>`h5-video-tool/src/api/editor.ts`<br/>`h5-video-tool/src/editor/hooks/useTimelineState.ts` |
| MEM-03 | Agent 聊天/剪辑请求后生成结构化项目记忆并更新用户级沟通画像 | `h5-video-tool-api/src/services/editorAgentMemoryStore.ts`<br/>`h5-video-tool-api/src/services/editorUserProfileService.ts`<br/>`h5-video-tool-api/src/routes/editorAgent.ts`<br/>`h5-video-tool/src/pages/EditorWorkbench.tsx` |

## 只读文件（允许参考，不允许改）
- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/types/productionTypes.ts`
- `h5-video-tool-api/src/config/productionAssets.ts`
- `.env`

## 本轮禁区
- 不做底层视频生成链路改造
- 不做 Agent prompt 压缩注入（留到下一批 Task 4）
- 不做记忆面板 UI（留到 Task 5）

## 参考文档
- `docs/plans/2026-04-22-editor-agent-memory-system-design.md`
- `docs/plans/2026-04-22-editor-agent-memory-system-implementation-plan.md`
- `h5-video-tool-api/src/routes/editorProjects.ts`
- `h5-video-tool-api/src/routes/editorAgent.ts`
- `h5-video-tool/src/editor/hooks/useTimelineState.ts`
- `h5-video-tool/src/pages/EditorWorkbench.tsx`

## 通过门禁条件
- Gate 2 Builder：首批 schema / store / profile 三组测试通过，前后端 `npx tsc --noEmit` 通过
- Gate 3 Verifier：验证项目打开后可恢复最近对话，聊天/剪辑后可写入项目记忆，并为用户生成跨项目沟通画像
- Gate 5 Integrator：更新 `PRODUCT.md`，完成本地 / GitHub / 云端三端同步
