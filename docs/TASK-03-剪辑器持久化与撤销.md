# 任务包 03: 剪辑器项目持久化 + 撤销重做

## 任务目标
让剪辑工作台支持项目保存/加载（刷新不丢失），并增加撤销/重做能力。

## 范围
- ✅ 做: 剪辑项目自动保存到后端
- ✅ 做: 剪辑项目列表 + 加载
- ✅ 做: 时间轴操作撤销/重做（Ctrl+Z / Ctrl+Shift+Z）
- ❌ 不做: 不改剪辑 Agent 逻辑
- ❌ 不做: 不改导出逻辑

## 后端改动

### 新建 `routes/editorProjects.ts`

```
POST   /api/editor/projects              ← 创建/保存项目
GET    /api/editor/projects              ← 列表
GET    /api/editor/projects/:id          ← 加载
DELETE /api/editor/projects/:id          ← 删除
```

存储结构（JSON 文件，放在 `gobs-data/editor-projects/` 下）：
```json
{
  "id": "ep_xxx",
  "name": "项目名",
  "createdAt": "2026-04-13T...",
  "updatedAt": "2026-04-13T...",
  "aspectRatio": "16:9",
  "project": { /* TimelineProject */ },
  "assets": { /* Record<string, MediaAsset> */ }
}
```

### 前端改动

### 新建 `src/editor/hooks/useUndoRedo.ts`

```typescript
function useUndoRedo<T>(initial: T, maxHistory?: number): {
  state: T;
  setState: (next: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (s: T) => void;
}
```

- 默认保留 50 步历史
- 只记录 TimelineProject 的快照（不记录 assets，因为 assets 只增不改）

### 改造 `useTimelineState.ts`

1. 把 `project` 状态接入 `useUndoRedo`
2. 暴露 `undo` / `redo` / `canUndo` / `canRedo`
3. 增加自动保存：project 变化后 debounce 3s 自动保存到后端

### 改造 `EditorWorkbench.tsx`

1. 顶部增加项目名 + 保存状态指示器（"已保存" / "保存中..."）
2. 顶部增加撤销/重做按钮
3. 绑定 Ctrl+Z / Ctrl+Shift+Z 快捷键
4. 增加"打开项目"入口（可以是侧边栏或模态框）

### URL 设计

```
/editor              ← 新建空项目
/editor?project=xxx  ← 加载已有项目
```

## 验收标准
1. 新建剪辑项目 → 添加素材 → 操作时间轴 → 刷新页面 → 项目完整恢复
2. Ctrl+Z 撤销最近操作，Ctrl+Shift+Z 重做
3. 撤销/重做对所有时间轴操作生效（添加片段、删除、拖动、裁剪、分割、调速、调音量）
4. 项目列表能展示所有已保存项目
5. 自动保存 debounce 3s，不会在快速操作时频繁请求
6. `npm run build` 无报错

## 风险点
- useTimelineState 目前直接用 useState 管理 project，改成 useUndoRedo 后要确保所有 setter 都走同一个入口
- Agent 的 `applyEditorAgentStream` 会直接调 `setProject`，也需要走 undo 栈
- 自动保存需要 debounce，但快速连续操作（如拖拽裁剪）会产生大量中间状态

## 给 Cursor 的 Prompt

```
我需要给剪辑工作台加两个核心能力：项目持久化和撤销重做。

Part 1: 撤销重做
- 新建 src/editor/hooks/useUndoRedo.ts，通用 hook，保留 50 步历史
- 改造 src/editor/hooks/useTimelineState.ts，把 project 状态接入 useUndoRedo
- 暴露 undo/redo/canUndo/canRedo
- 在 EditorWorkbench.tsx 顶栏加撤销/重做按钮 + 绑定 Ctrl+Z/Ctrl+Shift+Z

Part 2: 项目持久化
- 后端新建 routes/editorProjects.ts，CRUD 接口，JSON 文件存储在 gobs-data/editor-projects/
- 前端在 useTimelineState 中增加自动保存（debounce 3s）
- EditorWorkbench 支持从 URL query 参数 ?project=xxx 加载项目
- 顶栏显示项目名 + 保存状态

注意：
- useUndoRedo 只追踪 TimelineProject 对象，不追踪 assets
- setProject 调用需要统一走 undo 栈的 setState
- Agent 的 applyEditorAgentStream 也要走同一个入口
- 后端存储路径用 getApiDataDir() + '/editor-projects/'
- 在 index.ts 中注册新路由：app.use('/api/editor', editorProjectsRouter)
- 完成后确保 npm run build 通过
```
