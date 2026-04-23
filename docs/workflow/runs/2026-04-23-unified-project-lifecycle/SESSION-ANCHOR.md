# SESSION-ANCHOR - 2026-04-23-unified-project-lifecycle

## 本轮目标（一句话）

统一优化剪辑器与高级制片的项目生命周期，让两端都先停留在临时草稿态，只有在形成有效内容并完成强制命名后才转正为正式项目，同时为历史未命名项目提供批量治理入口。

## 验收标准 ID

- AC-1: 进入剪辑器不会继续新增新的未命名正式项目
- AC-2: 进入高级制片不会继续新增新的未命名正式项目
- AC-3: 两端在首次转正时都会强制命名
- AC-4: 两端都提供未命名项目批量治理入口

## 本轮禁区（绝对不能改）

- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/types/productionTypes.ts`
- `h5-video-tool-api/src/config/productionAssets.ts`
- `.env`

## 允许读取的文件（按需展开，其它不看）

```
docs/workflow/runs/2026-04-23-unified-project-lifecycle/planner-spec.md
h5-video-tool/src/editor/hooks/useTimelineState.ts
h5-video-tool/src/pages/EditorWorkbench.tsx
h5-video-tool/src/editor/components/EditorProjectManager.tsx
h5-video-tool/src/pages/ProductionWizard.tsx
h5-video-tool/src/studio/ProductionWizardShell.tsx
h5-video-tool/src/studio/components/ProductionProjectListModal.tsx
h5-video-tool/src/studio/productionWizardStorage.ts
h5-video-tool/src/studio/productionTypes.ts
h5-video-tool/src/api/editor.ts
h5-video-tool/src/api/production.ts
h5-video-tool-api/src/routes/editorProjects.ts
h5-video-tool-api/src/routes/productionPersist.ts
```

## 当前进度

- [x] AC-1: 设计确认，待实现
- [x] AC-2: 设计确认，待实现
- [x] AC-3: 设计确认，待实现
- [x] AC-4: 设计确认，待实现
