# UI 导航精简方案 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 将侧边栏从 17 项精简到 10 项，删除演示模块和冗余入口，新建「我的成片」独立页面。

**Architecture:** 4 个文件改动 + 1 个新文件。核心优化点：`GalleryView.tsx`（348行）已存在，`Gallery.tsx` 只需薄包装，无需从头建。`Studio.tsx` 移除 gallery 子 tab 后只保留 create / templates 两个 tab。

**Tech Stack:** React + TypeScript + React Router v6，无后端改动。

---

## 关键文件现状（执行前必读）

| 文件 | 现状 |
|------|------|
| `h5-video-tool/src/components/Layout.tsx` | NAV_GROUPS 第 197 行，17 项 3 组；图标函数从第 68 行开始 |
| `h5-video-tool/src/pages/Studio.tsx` | TABS 第 72-76 行，含 gallery tab；`GalleryView` 在第 121-135 行渲染 |
| `h5-video-tool/src/App.tsx` | 路由从第 47 行，无 `/gallery` 路由，无 `/materials` 重定向 |
| `h5-video-tool/src/components/GalleryView.tsx` | 已完整实现（348行），有 local/output 两个子 tab，直接复用 |

---

## Task 1: Layout.tsx — 精简导航到 10 项

**Files:**
- Modify: `h5-video-tool/src/components/Layout.tsx`

**需要做的改动：**

**Step 1: 在现有图标函数之后（第 186 行之后，NAV_GROUPS 之前）新增 GalleryIcon**

在 `SettingsIcon` 函数（约 188 行）之后、`NAV_GROUPS` 常量（第 197 行）之前，插入：

```typescript
function GalleryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
```

**Step 2: 替换 NAV_GROUPS（第 197-219 行）**

将整个 `const NAV_GROUPS: NavItemDef[][] = [ ... ];` 替换为：

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

**Step 3: 验证 TypeScript 编译**

```bash
cd h5-video-tool && npx tsc --noEmit
```

预期：0 错误（原 `PlatformIcon`、`MemoryIcon`、`LearningIcon`、`MaterialsIcon`、`TemplateIcon` 函数未被引用，TypeScript 不会报错，但可以一并删除以保持干净）

**Step 4: Commit**

```bash
git add h5-video-tool/src/components/Layout.tsx
git commit -m "feat: nav — trim sidebar from 17 to 10 items, add GalleryIcon"
```

---

## Task 2: Studio.tsx — 移除 gallery 子 tab

**Files:**
- Modify: `h5-video-tool/src/pages/Studio.tsx`

**Step 1: 修改 tab 类型和初始化（第 26-40 行）**

将：
```typescript
const [activeTab, setActiveTab] = useState<'create' | 'templates' | 'gallery'>(
  tabFromUrl === 'templates' ? 'templates' : tabFromUrl === 'gallery' ? 'gallery' : 'create',
);
```
替换为：
```typescript
const [activeTab, setActiveTab] = useState<'create' | 'templates'>(
  tabFromUrl === 'templates' ? 'templates' : 'create',
);
```

**Step 2: 修改 useEffect（第 31-34 行）**

将：
```typescript
const t = tabFromUrl === 'templates' ? 'templates' : tabFromUrl === 'gallery' ? 'gallery' : 'create';
```
替换为：
```typescript
const t = tabFromUrl === 'templates' ? 'templates' : 'create';
```

**Step 3: 修改 switchTab 函数（第 36-40 行）**

将：
```typescript
const switchTab = (tab: 'create' | 'templates' | 'gallery') => {
```
替换为：
```typescript
const switchTab = (tab: 'create' | 'templates') => {
```

**Step 4: 修改 TABS 数组（第 72-76 行）**

将：
```typescript
const TABS = [
  { id: 'create' as const, label: '创作' },
  { id: 'templates' as const, label: '模板市场' },
  { id: 'gallery' as const, label: '我的成片（快捷）' },
];
```
替换为：
```typescript
const TABS = [
  { id: 'create' as const, label: '创作' },
  { id: 'templates' as const, label: '模板市场' },
];
```

**Step 5: 删除 gallery 渲染分支（第 121-135 行）**

删除整个 `{activeTab === 'gallery' ? ( ... ) : activeTab === 'templates' ? (` 结构中的 gallery 分支，改为：

```typescript
{activeTab === 'templates' ? (
  <div className="max-w-6xl px-6">
    <TemplateMarket onUseTemplate={handleUseTemplate} />
  </div>
) : (
  // 创作区
  ...
)}
```

**Step 6: 移除不再需要的 import**

移除：
```typescript
import { GalleryView } from '../components/GalleryView';
```
（GalleryView 不再在 Studio 中使用）

**Step 7: 验证 TypeScript 编译**

```bash
cd h5-video-tool && npx tsc --noEmit
```

预期：0 错误

**Step 8: Commit**

```bash
git add h5-video-tool/src/pages/Studio.tsx
git commit -m "feat: studio — remove gallery tab, GalleryView moved to /gallery"
```

---

## Task 3: 新建 Gallery.tsx 页面

**Files:**
- Create: `h5-video-tool/src/pages/Gallery.tsx`

**说明：** `GalleryView` 组件已完整实现（local 历史 + 服务端 output 视频），直接复用即可，不重新建。`Gallery.tsx` 只是加个页面头部和到「历史记录」的跳转提示。

**Step 1: 创建文件**

创建 `h5-video-tool/src/pages/Gallery.tsx`：

```typescript
import { useNavigate } from 'react-router-dom';
import { GalleryView } from '../components/GalleryView';

export function Gallery() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* 页面标题栏 */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <div className="max-w-6xl px-6 pt-5 pb-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[var(--color-text)]">我的成片</h1>
              <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                本地生成记录与服务端近期输出
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="mb-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              批量任务 & 云端历史 →
            </button>
          </div>
        </div>
      </div>

      {/* 成片内容 */}
      <div className="max-w-6xl px-6 pt-6">
        <GalleryView />
      </div>
    </div>
  );
}
```

**Step 2: 验证 TypeScript 编译**

```bash
cd h5-video-tool && npx tsc --noEmit
```

预期：0 错误

**Step 3: 不 commit（等 Task 4 一起提交）**

---

## Task 4: App.tsx — 添加路由和重定向

**Files:**
- Modify: `h5-video-tool/src/App.tsx`

**Step 1: 添加 Gallery import**

在现有 import 列表中（靠近其他 pages import），添加：
```typescript
import { Gallery } from './pages/Gallery';
```

**Step 2: 添加 /gallery 路由（在第 61 行 `/asset-library` 路由附近插入）**

```typescript
<Route path="/gallery" element={<Gallery />} />
```

**Step 3: 添加 /materials 重定向（在第 55 行 `/materials` 路由处替换）**

将：
```typescript
<Route path="/materials" element={<TabMaterials />} />
```
替换为：
```typescript
<Route path="/materials" element={<Navigate to="/asset-library" replace />} />
```

注意：`TabMaterials` 的 import 可以一并删除（确认没有其他地方引用后），或保留（不影响功能）。

**Step 4: 验证 TypeScript 编译**

```bash
cd h5-video-tool && npx tsc --noEmit
```

预期：0 错误

**Step 5: Commit（Task 3 + Task 4 一起）**

```bash
git add h5-video-tool/src/pages/Gallery.tsx h5-video-tool/src/App.tsx
git commit -m "feat: add /gallery page (wraps GalleryView) + redirect /materials → /asset-library"
```

---

## Task 5: 构建、验证、部署

**Step 1: 全量构建**

```bash
cd h5-video-tool && npm run build
```

预期：`✓ built in X.XXs`，无 TypeScript 错误（chunk size warning 是已有的，忽略）

**Step 2: 本地快检（如有 dev server）**

```bash
npm run dev
```

手动验证：
- [ ] 侧边栏显示 10 项，3 组
- [ ] 点「我的成片」→ 进入 `/gallery`，显示视频列表
- [ ] 点「生成视频」→ Studio 只有「创作」「模板市场」两个 tab
- [ ] 访问 `/materials` → 自动跳转到 `/asset-library`
- [ ] 访问 `/platform` → 仍然可以访问（路由保留，只是导航不显示）

**Step 3: Git push**

```bash
git pull --rebase origin main && git push origin main
```

**Step 4: 部署到服务器**

```bash
# 已在 npm run build 完成后，前端 dist/ 通过 SFTP 上传到服务器 /var/www/qas-h5/
# 后端无改动，不需要重启 qas-api
```

（具体部署用 paramiko SFTP 上传 dist/ 到 `/var/www/qas-h5/`，见项目历史操作记录）

---

## 可选优化（文档未覆盖但值得考虑）

### 清理孤立图标函数
Layout.tsx 中以下图标函数在 NAV_GROUPS 中已不再引用，可删除（不影响构建，只是死代码）：
- `PlatformIcon`（第 9-21 行）
- `MemoryIcon`（第 23-31 行）
- `LearningIcon`（第 42-51 行）
- `MaterialsIcon`（第 141-149 行）
- `TemplateIcon`（第 151-160 行）

如果删除，确认 TypeScript 编译仍通过。

### 首页不在导航显示
目前 NAV_GROUPS 已不含首页（新 NAV_GROUPS 从「一键成片」开始），用户点 Logo 返回首页（检查 Layout.tsx 是否有 Logo 链接到 `/`，若无可在后续加）。

---

## 执行顺序

```
Task 1（Layout NAV_GROUPS）→ Task 2（Studio 移除 gallery tab）→ Task 3+4（Gallery 页面 + 路由）→ Task 5（构建部署）
```

Task 1 和 Task 2 可独立并行；Task 3 必须先于 Task 4（页面文件先于 App.tsx import）。
