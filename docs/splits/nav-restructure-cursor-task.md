# 导航精简 — Cursor 任务包

> 分支：`feat/nav-restructure-cursor`
> 基于：`main` @ commit `043e84d`
> 并行分支：`feat/nav-restructure-claude`（由 Claude Code 负责，不要动）

## 任务目标

精简侧边栏导航从 17 项到 10 项，移除演示/规划/冗余页面，调整分组结构。

## 改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `h5-video-tool/src/components/Layout.tsx` | 修改 | 重写 NAV_GROUPS，新增 GalleryIcon |
| `h5-video-tool/src/pages/Studio.tsx` | 修改 | 移除 gallery 子 tab |
| `h5-video-tool/src/App.tsx` | 修改 | 加 /materials 重定向 |

## 详细步骤

### Step 1: 修改 Layout.tsx

找到 `NAV_GROUPS` 数组（约第 197 行），替换为：

```typescript
const NAV_GROUPS: NavItemDef[][] = [
  // 📐 创作
  [
    { to: '/quickfilm', label: '一键成片', icon: QuickFilmIcon },
    { to: '/studio/production', label: '高级制片', icon: ProductionIcon },
    { to: '/studio', label: '生成视频', icon: StudioIcon, end: true },
  ],
  // ✂️ 后期 & 素材
  [
    { to: '/editor', label: '视频剪辑', icon: EditorIcon },
    { to: '/gallery', label: '我的成片', icon: GalleryIcon },
    { to: '/asset-library', label: '素材库', icon: AssetLibraryIcon },
  ],
  // 📢 分发 & 工具
  [
    { to: '/distribute', label: '视频分发', icon: DistributeIcon },
    { to: '/tiktok-matrix', label: '风控大师', icon: MatrixIcon },
    { to: '/projects', label: '我的项目', icon: ProjectsIcon },
    { to: '/history', label: '历史记录', icon: HistoryIcon },
  ],
];
```

新增 `GalleryIcon` 图标组件（和其他 icon 风格一致的 SVG）：

```typescript
function GalleryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <path d="m2 17 5-5 4 4 4-6 7 7" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  );
}
```

删除已不需要的导航相关代码：
- `isStudioTemplatesNavActive` 函数（如果只用于模板市场侧栏项）
- `PlatformIcon`、`MemoryIcon`、`LearningIcon`、`OpsIcon` 图标可以保留（代码不删）

### Step 2: 修改 Studio.tsx

找到 TABS 数组（约第 73 行），移除 gallery：

```typescript
// 改前
const TABS = [
  { id: 'create' as const, label: '创作' },
  { id: 'templates' as const, label: '模板市场' },
  { id: 'gallery' as const, label: '我的成片（快捷）' },
];

// 改后
const TABS = [
  { id: 'create' as const, label: '创作' },
  { id: 'templates' as const, label: '模板市场' },
];
```

同步修改 `activeTab` 的类型定义（移除 `'gallery'`），以及移除 `activeTab === 'gallery'` 的渲染分支。

### Step 3: 修改 App.tsx

添加旧路由重定向（在 Route 列表中加一行）：

```typescript
<Route path="/materials" element={<Navigate to="/asset-library" replace />} />
```

注意：`/gallery` 路由由 Claude Code 在另一个分支添加，**不要在这里加 /gallery 路由**。

## 不要动的文件

以下文件由 Claude Code 在 `feat/nav-restructure-claude` 分支负责，**严禁修改**：

- `h5-video-tool/src/pages/Gallery.tsx` — Claude 新建
- `h5-video-tool/src/hooks/useGallery.ts` — Claude 新建
- 任何 `h5-video-tool-api/` 下的文件 — 如果 Claude 需要加后端接口

## 验收标准

- [ ] `npm run build` 通过（0 error, 0 type error）
- [ ] 侧边栏只显示 10 项，分 3 组
- [ ] 点"一键成片"、"高级制片"、"生成视频"能正常跳转
- [ ] `/materials` 路径自动重定向到 `/asset-library`
- [ ] `/platform` 等旧路由直接访问不 404（路由保留，只是导航不显示）
- [ ] Studio 页面只有"创作"和"模板市场"两个 tab

## 完成后

```bash
git add -A
git commit -m "feat: 精简侧边栏导航 17→10 项"
git push origin feat/nav-restructure-cursor
```
