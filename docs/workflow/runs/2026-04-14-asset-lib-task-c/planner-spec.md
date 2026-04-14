# TASK-C Planner Spec

## 代码库现状调查

### 路由方式
- React Router v6（BrowserRouter + Routes + Route）
- 路由注册在 `h5-video-tool/src/App.tsx`
- 已有 `/asset-library` 路由 → `<AssetLibrary />` 组件

### 现有页面结构
- 页面组件放在 `h5-video-tool/src/pages/`
- 当前 `AssetLibrary.tsx` 是**旧的**本地素材库（对接 `/api/assets`）
- 新的 TASK-C 需要对接 `/api/asset-library/` 后端（TASK-A 实现）

### API 调用方式
- 所有 API 调用通过 `src/api/client.ts` 提供的 `apiGet / apiPost / apiPut / apiDelete` 工具函数
- `BASE_URL = import.meta.env.VITE_API_BASE_URL || ''`（支持代理）
- 带 JWT Bearer token（`gobs_token`）

### 状态管理
- 本地 useState + useCallback + useEffect（无 Redux/Zustand）
- 部分页面用 Context（ThemeContext、CreateFlowContext 等）
- TASK-C 继续用本地 state 即可

### 导航
- 侧边栏 `src/components/Layout.tsx` 中的 `NAV_GROUPS`
- 素材库 `/asset-library` 已在 NAV_GROUPS[1] 中，label 为「素材库」
- Studio 路由是 `/studio`（已存在）

---

## 计划：TASK-C 实现

### 新文件目录结构

```
h5-video-tool/src/
├── api/
│   └── assetLibraryApi.ts          # 对接 /api/asset-library/* 的封装
└── pages/
    └── AssetLibraryPage/
        ├── index.tsx               # AssetLibraryPage 主页（Tab 切换）
        ├── AssetImportPanel.tsx    # 导入面板（上传+进度轮询）
        ├── AssetReviewQueue.tsx    # 待审核队列（批量确认/拒绝/修改）
        └── AssetSearchPanel.tsx    # 搜索+6维筛选+卡片网格
```

### 路由策略
- 已有 `/asset-library` 路由 → 当前指向旧 `AssetLibrary`
- **修改** `App.tsx`：将 `/asset-library` 改为指向新 `AssetLibraryPage/index.tsx`
- 旧的 `AssetLibrary.tsx` 保留（暂不删除，避免破坏其他引用）

### 新路由路径
| 路径 | 页面 |
|------|------|
| `/asset-library` | AssetLibraryPage（Tab 总览） |
| `/studio?assetId=xxx` | Studio（AC-C3 跳转目标） |

### API 封装位置
`h5-video-tool/src/api/assetLibraryApi.ts`

### 4 个组件的实现要点

| 组件 | Tab | 关键功能 |
|------|-----|----------|
| AssetLibraryPage | - | Tab 导航：总览/导入/待确认/检索；顶部显示总数+待确认数 |
| AssetImportPanel | 导入 | 多文件选择 → POST /import → 轮询 GET /import/:jobId |
| AssetReviewQueue | 待确认 | GET /assets?status=pending → 全选+批量确认/拒绝 → POST /assets/batch-tags |
| AssetSearchPanel | 检索 | 搜索框 + 6 个筛选器 → GET /search → 结果网格 + "用于生成"跳转 |

### 6 维筛选器
按后端 FILTER_KEYS 顺序：ratio / type / orientation / duration_range / quality / purpose

### "用于生成"跳转
`navigate('/studio?assetId=' + asset.id)`
