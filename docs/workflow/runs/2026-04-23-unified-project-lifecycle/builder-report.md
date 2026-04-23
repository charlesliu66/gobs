# Builder Report - unified project lifecycle

> Run: `2026-04-23-unified-project-lifecycle`
> Gate 2 artifact

---

## Implementation Map

| AC | Implementation |
|---|---|
| UPL-01 | `h5-video-tool/src/utils/projectLifecycle.ts`, `h5-video-tool/src/editor/hooks/useTimelineState.ts`, `h5-video-tool/src/pages/EditorWorkbench.tsx`: 剪辑器改为草稿先行，仅在形成有效内容后要求命名并转正 |
| UPL-02 | `h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool/src/studio/components/ProductionProjectListModal.tsx`, `h5-video-tool/src/api/production.ts`, `h5-video-tool/src/utils/projectLifecycle.ts`: 高级制片改为本地草稿优先，首次云端保存前强制命名 |
| UPL-03 | `h5-video-tool/src/editor/components/EditorProjectManager.tsx`, `h5-video-tool/src/studio/components/ProductionProjectListModal.tsx`, `h5-video-tool/src/pages/EditorWorkbench.tsx`, `h5-video-tool/src/pages/ProductionWizard.tsx`: 两端项目列表统一补齐搜索、重命名、删除与“治理未命名项目”入口 |
| UPL-04 | `h5-video-tool-api/src/services/projectPersistenceGuards.ts`, `h5-video-tool-api/src/routes/editorProjects.ts`, `h5-video-tool-api/src/routes/productionPersist.ts`: 后端新增首次正式保存守卫，拒绝空名转正，同时兼容旧项目继续更新 |
| UPL-05 | `h5-video-tool/tests/projectLifecycle.test.ts`, `h5-video-tool-api/tests/projectPersistenceGuards.test.ts`: 回归测试覆盖有效草稿判定、命名门槛、智能命名建议、治理动作与保存守卫 |

## Batch Notes

- 剪辑器和高级制片现在共享同一套生命周期判定 helper，保证“何时算有效草稿、何时必须命名、如何智能建议名称、如何治理历史未命名项目”两端口径一致。
- 高级制片保留本地草稿体验，不会因为用户只是进入页面或随手试一下就往服务端项目列表写一条“未命名项目”。
- 治理历史遗留项目的策略明确限定为两类：
  - 明显空项目：直接删除
  - 有实际内容但仍未命名：智能重命名
- 本轮没有触碰底层视频生成服务、生产资产配置或任何密钥文件。

## Self-check Evidence

- `h5-video-tool`: `npx tsx --test tests/projectLifecycle.test.ts`
- `h5-video-tool-api`: `node --import tsx --test tests/projectPersistenceGuards.test.ts`
- `h5-video-tool`: `npx tsc --noEmit`
- `h5-video-tool-api`: `npx tsc --noEmit`
- `h5-video-tool`: `npm run build`
- `h5-video-tool-api`: `npm run build`

## Constraints Confirmed

- no forbidden low-level generation services were modified
- no secrets or `.env` values were changed
- no unrelated temporary directory was included in the intended release scope
