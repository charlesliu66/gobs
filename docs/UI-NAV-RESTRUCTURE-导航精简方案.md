# GOBS 界面导航精简方案

> 日期：2026-04-14
> 目标：将侧边栏从 17 项精简到 10 项，去掉演示/规划/重复页面，理顺信息架构

---

## 一、当前结构（17 项）

```
第一组（10 项）
  首页              /                     ✅ 引导页
  平台框架          /platform              ❌ 演示，硬编码假数据
  记忆系统          /platform/memory       ❌ 演示，纯展示
  学习实验台        /platform/learning-lab ❌ 演示，纯展示
  运营中心          /platform/ops          ❌ 演示，纯展示
  一键成片          /quickfilm             ✅ 核心功能
  我的项目          /projects              ✅ 核心功能
  生成视频          /studio                ✅ 含 3 子 tab（创作 / 模板市场 / 我的成片）
  高级制片          /studio/production     ✅ 核心功能
  视频剪辑          /editor                ✅ 核心功能

第二组（4 项）
  素材库            /asset-library         ✅ 新版
  素材管理          /materials             ❌ 旧版，已被素材库覆盖
  模板市场          /studio?tab=templates  ❌ 只是 studio 子 tab，不需要独立侧栏位
  视频分发          /distribute            ✅ 核心功能

第三组（2 项）
  风控大师          /tiktok-matrix         ✅ 核心功能
  历史记录          /history               ✅ 核心功能
```

---

## 二、目标结构（10 项，3 组）

```
📐 创作
  ├── 一键成片        /quickfilm
  ├── 高级制片        /studio/production
  └── 生成视频        /studio

✂️ 后期 & 素材
  ├── 视频剪辑        /editor
  ├── 我的成片        /gallery              ← 新独立页面
  └── 素材库          /asset-library

📢 分发 & 工具
  ├── 视频分发        /distribute
  ├── 风控大师        /tiktok-matrix
  ├── 我的项目        /projects
  └── 历史记录        /history
```

---

## 三、逐项改动说明

### 3.1 删除：演示/规划模块（4 项）

| 删除项 | 理由 |
|--------|------|
| 平台框架 `/platform` | 全部硬编码假数据（channelMetrics、creativeMetrics 等），无真实后端 |
| 记忆系统 `/platform/memory` | 纯展示页，memoryLayersMeta 是静态定义 |
| 学习实验台 `/platform/learning-lab` | 策略反馈循环未接真实数据 |
| 运营中心 `/platform/ops` | GoalTree、预算数据均为假数据 |

**处理方式：**
- 代码文件保留，不删除（留待后续接入真实数据后恢复）
- 仅从 `Layout.tsx` 的 `NAV_GROUPS` 中移除
- `App.tsx` 中路由保留（避免书签 404），但不在导航中展示

### 3.2 删除：重复/冗余项（2 项）

| 删除项 | 理由 |
|--------|------|
| 素材管理 `/materials` | 功能已被新版素材库 `/asset-library` 完全覆盖 |
| 模板市场（侧栏项）`/studio?tab=templates` | 本质是 `/studio` 的子 tab，不需要占独立侧栏位 |

**处理方式：**
- 素材管理：从导航移除，路由保留（重定向到 `/asset-library`）
- 模板市场：从侧栏移除，在 `/studio` 页面内保留 tab 入口

### 3.3 新增："我的成片"独立页面

**背景：** 目前「我的成片」藏在 `/studio` 的第 3 个子 tab（`gallery`）里。但成片来源有三个：
1. 生成视频（单镜）
2. 一键成片（批量）
3. 高级制片（多镜）

把成片浏览放在"生成视频"的子 tab 里不合理——用户找片子还得先进创作页面。

**方案：**
- 新建 `/gallery` 路由和 `Gallery.tsx` 页面
- 聚合所有来源的成片（含高级制片的产出）
- `/studio` 页面移除 `gallery` 子 tab，只保留「创作」和「模板市场」两个 tab
- 侧栏显示为「我的成片」

### 3.4 保留但不动

| 项 | 说明 |
|----|------|
| 一键成片 `/quickfilm` | 傻瓜模式，保持独立 |
| 高级制片 `/studio/production` | 专业模式，保持独立 |
| 生成视频 `/studio` | 单镜创作，保持独立 |
| 视频剪辑 `/editor` | 保持 |
| 素材库 `/asset-library` | 保持 |
| 视频分发 `/distribute` | 保持 |
| 风控大师 `/tiktok-matrix` | 保持 |
| 我的项目 `/projects` | 保持 |
| 历史记录 `/history` | 保持 |

### 3.5 首页处理

- 暂时保留 `/` 首页引导页
- 后续可改造为 Dashboard（最近项目 + 快捷入口 + 成片统计）
- 不在侧栏显示（点 Logo 回首页即可）

---

## 四、文件改动清单

### 4.1 `h5-video-tool/src/components/Layout.tsx`

**改动：** 重写 `NAV_GROUPS` 数组

```typescript
// 改前（17 项，3 组）
const NAV_GROUPS: NavItemDef[][] = [
  [
    { to: '/', label: '首页', icon: HomeIcon },
    { to: '/platform', label: '平台框架', icon: PlatformIcon, highlight: true },
    { to: '/platform/memory', label: '记忆系统', icon: MemoryIcon },
    { to: '/platform/learning-lab', label: '学习实验台', icon: LearningIcon },
    { to: '/platform/ops', label: '运营中心', icon: OpsIcon },
    { to: '/quickfilm', label: '一键成片', icon: QuickFilmIcon },
    { to: '/projects', label: '我的项目', icon: ProjectsIcon },
    { to: '/studio', label: '生成视频', icon: StudioIcon, end: true },
    { to: '/studio/production', label: '高级制片', icon: ProductionIcon },
    { to: '/editor', label: '视频剪辑', icon: EditorIcon },
  ],
  [
    { to: '/asset-library', label: '素材库', icon: AssetLibraryIcon },
    { to: '/materials', label: '素材管理', icon: MaterialsIcon },
    { to: '/studio?tab=templates', label: '模板市场', icon: TemplateIcon },
    { to: '/distribute', label: '视频分发', icon: DistributeIcon },
  ],
  [
    { to: '/tiktok-matrix', label: '风控大师', icon: MatrixIcon },
    { to: '/history', label: '历史记录', icon: HistoryIcon },
  ],
];

// 改后（10 项，3 组）
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

**需要新增 `GalleryIcon` 图标组件**（复用 film/video 风格的 SVG）。

### 4.2 `h5-video-tool/src/App.tsx`

**改动：**
1. 新增 `/gallery` 路由
2. 旧路由加重定向

```typescript
// 新增
import { Gallery } from './pages/Gallery';

// 路由表中加：
<Route path="/gallery" element={<Gallery />} />

// 旧路由重定向（保持书签兼容）：
<Route path="/materials" element={<Navigate to="/asset-library" replace />} />
// 平台相关路由不删，只是导航不显示
```

### 4.3 新建 `h5-video-tool/src/pages/Gallery.tsx`

**职责：** 聚合所有成片的浏览页

**数据来源：**
1. 从 `/api/history` 获取生成视频的成片（现有）
2. 从 `/api/production/projects` 获取高级制片产出的视频
3. 从一键成片的批次记录中获取成片

**页面结构：**
- 顶部筛选栏：来源（全部 / 单镜生成 / 一键成片 / 高级制片）、时间范围
- 网格展示：视频缩略图 + 标题 + 创建时间 + 来源标签
- 操作：预览、下载、分发、删除

### 4.4 `h5-video-tool/src/pages/Studio.tsx`

**改动：** 移除 `gallery` 子 tab

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

相关的 `activeTab === 'gallery'` 渲染分支也一并移除。

---

## 五、不删除代码的文件

以下页面文件**保留但不在导航中显示**，路由仍可直接访问：

- `PlatformFramework.tsx`
- `PlatformMemory.tsx`
- `PlatformLearningLab.tsx`
- `PlatformOpsCenter.tsx`
- `TabMaterials.tsx`（或改为重定向）

---

## 六、执行顺序

```
Step 1: 修改 Layout.tsx — 重写 NAV_GROUPS（立即见效，风险最低）
Step 2: 修改 Studio.tsx — 移除 gallery 子 tab
Step 3: 新建 Gallery.tsx — 实现成片聚合页
Step 4: 修改 App.tsx — 添加 /gallery 路由 + /materials 重定向
Step 5: 前端 build + 部署验证
```

---

## 七、一键成片 vs 高级制片 不合并的理由

| 维度 | 一键成片 | 高级制片 |
|------|----------|----------|
| 用户画面 | "帮我搞定" | "我要精细控制" |
| 输入 | 上传素材 + 一句话描述 | 故事大纲 → 分镜表 → 逐镜调整 |
| 步骤数 | 2-3 步 | 5-7 步 |
| 产出 | 单个成片 | 多镜头项目 |
| 目标用户 | 运营/市场 | 创意/制片 |

合并会让简单用户看到复杂界面，复杂用户找不到高级功能。保持独立但放同一组（「创作」），清晰且互不干扰。
