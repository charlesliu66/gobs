# 导航精简 — Claude Code 任务包

> 分支：`feat/nav-restructure-claude`
> 基于：`main` @ commit `043e84d`
> 并行分支：`feat/nav-restructure-cursor`（由 Cursor 负责，不要动）

## 任务目标

新建「我的成片」聚合页面，统一展示所有来源的视频成片。

## 改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `h5-video-tool/src/pages/Gallery.tsx` | 新建 | 成片聚合浏览页 |
| `h5-video-tool/src/hooks/useGallery.ts` | 新建 | 成片数据获取 hook |
| `h5-video-tool/src/App.tsx` | 修改 | 添加 /gallery 路由（仅加一行） |

## 详细步骤

### Step 1: 创建 useGallery.ts

位置：`h5-video-tool/src/hooks/useGallery.ts`

```typescript
// 聚合所有来源的成片数据
export interface GalleryItem {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  source: 'studio' | 'quickfilm' | 'production';
  sourceLabel: string;
  createdAt: string;
  projectId?: string;
  taskId?: string;
  duration?: number;
}

export function useGallery(options?: {
  source?: 'all' | 'studio' | 'quickfilm' | 'production';
  limit?: number;
}) {
  // 从三个数据源获取成片：
  // 1. GET /api/history — 生成视频（studio）的成片
  // 2. GET /api/production/projects — 高级制片的成片（遍历项目的 shots，取有 videoUrl 的）
  // 3. GET /api/history?type=batch — 一键成片的批次成片
  //
  // 合并、按时间倒序排列、支持按来源筛选
  //
  // 返回 { items: GalleryItem[], loading: boolean, error: string | null, refresh: () => void }
}
```

参考现有的 `h5-video-tool/src/pages/History.tsx` 了解 `/api/history` 的返回格式。
参考 `h5-video-tool/src/pages/ProductionWizard.tsx` 了解 production 项目数据结构。

### Step 2: 创建 Gallery.tsx

位置：`h5-video-tool/src/pages/Gallery.tsx`

页面结构：

```
┌──────────────────────────────────────┐
│ 🎬 我的成片                          │
│                                      │
│ [全部] [单镜生成] [一键成片] [高级制片] │  ← 筛选栏
│                                      │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │
│ │ 🎥  │ │ 🎥  │ │ 🎥  │ │ 🎥  │    │  ← 视频网格
│ │title│ │title│ │title│ │title│    │
│ │date │ │date │ │date │ │date │    │
│ │[tag]│ │[tag]│ │[tag]│ │[tag]│    │
│ └─────┘ └─────┘ └─────┘ └─────┘    │
│                                      │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │
│ │ ... │ │ ... │ │ ... │ │ ... │    │
│ └─────┘ └─────┘ └─────┘ └─────┘    │
└──────────────────────────────────────┘
```

功能要求：
- 使用项目现有的 Tailwind CSS 主题变量（`var(--color-surface)` 等）
- 来源标签：单镜生成用蓝色、一键成片用绿色、高级制片用紫色
- 每个成片卡片支持：点击预览（video 弹窗）、下载按钮
- 空状态：显示引导文案 + 跳转到创作的按钮
- 响应式网格：4 列 → 3 列 → 2 列

风格参考：和现有页面保持一致，可以参考 `History.tsx` 的卡片风格。

### Step 3: 在 App.tsx 添加路由

找到 Route 列表，加一行：

```typescript
import { Gallery } from './pages/Gallery';

// 在 Route 列表中加：
<Route path="/gallery" element={<Gallery />} />
```

放在 `/editor` 路由后面即可。

## 不要动的文件

以下文件由 Cursor 在 `feat/nav-restructure-cursor` 分支负责，**严禁修改**：

- `h5-video-tool/src/components/Layout.tsx` — Cursor 改导航
- `h5-video-tool/src/pages/Studio.tsx` — Cursor 移除 gallery tab
- 除了加 import 和 Route 之外，不要改 `App.tsx` 的其他内容

## 验收标准

- [ ] `npm run build` 通过（0 error, 0 type error）
- [ ] 访问 `/gallery` 显示成片聚合页
- [ ] 能展示来自 studio 和 production 的成片
- [ ] 筛选功能正常（全部 / 按来源）
- [ ] 点击成片可以预览视频
- [ ] 空状态展示正确
- [ ] 响应式布局正常

## 完成后

```bash
git add -A
git commit -m "feat: 新增「我的成片」Gallery 聚合页"
git push origin feat/nav-restructure-claude
```
