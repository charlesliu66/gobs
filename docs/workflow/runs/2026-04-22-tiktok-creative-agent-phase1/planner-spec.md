# Planner Spec — TikTok Creative Agent Phase 1

## Problem
当前剪辑 Agent 更偏“时间轴执行助手”，市场同学想做 TikTok 游戏内容 / 买量素材时，仍需要自己先把创意目标翻译成提示词。

## Proposed Slice
先落地最小可用的创意层：
- 结构化 brief
- 后端默认 brief prompt
- creative strategy 回传
- 前端结果卡展示

## Risks
- 旧 `editor.ts` API 文件已较大，直接扩展风险高。
- 编码历史较杂，局部 patch 稳定性较差。
- 前端构建存在 Asset Library 本地化导出缺口，可能阻断上线。

## Mitigations
- 前端新建 `editorCreative.ts` 独立接入。
- 对 `editorAgent.ts` 采用整文件替换，避免局部 patch 漏改。
- 同步补齐 Asset Library 本地化导出，确保构建可发布。

## Test Matrix
- 后端：`editorCreativeBrief` 纯函数测试
- 前端：`normalizeEditorCreativeBriefForRequest` 纯函数测试
- 集成：前后端 `npx tsc --noEmit`
- 构建：前后端 `npm run build`
