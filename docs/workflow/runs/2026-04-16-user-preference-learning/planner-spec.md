# Planner Spec — 用户反馈学习基础版

> Run ID: `2026-04-16-user-preference-learning`  
> Gate: 1-5 (简化流程)  
> 日期: 2026-04-16

## 目标

为剪辑 Agent 提供用户历史偏好学习能力。导出时静默收集行为统计，下次 LLM 排片时注入偏好上下文。

## AC

| AC | 描述 | 状态 |
|---|---|---|
| AC-1 | 后端 `userPreferenceService.ts`：存储/加载/更新偏好 + EMA 平滑 | ✅ |
| AC-2 | `POST /api/editor/preference/report`：接收导出行为统计 | ✅ |
| AC-3 | `GET /api/editor/preference`：查看偏好画像 | ✅ |
| AC-4 | `buildPreferencePromptSnippet` 注入 LLM 排片 prompt | ✅ |
| AC-5 | 前端导出成功后静默上报（fire-and-forget） | ✅ |
| AC-6 | tsc --noEmit 零错误（前后端） | ✅ |

## 改动文件

| 文件 | 改动 |
|---|---|
| `h5-video-tool-api/src/services/userPreferenceService.ts` | **新建** |
| `h5-video-tool-api/src/routes/editorAgent.ts` | 新增 2 个路由 |
| `h5-video-tool-api/src/services/editorAgentService.ts` | 注入偏好 prompt |
| `h5-video-tool/src/editor/components/ExportPanel.tsx` | 导出成功后上报 |

*Gate 1-5: PASS*
