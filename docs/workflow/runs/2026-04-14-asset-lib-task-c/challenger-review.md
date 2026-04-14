# Challenger Review — TASK-C

## 检查项

### 1. 路由冲突？
- `/asset-library` 已在 App.tsx 第 60 行注册
- 新实现将替换该路由的 element，从旧 `<AssetLibrary>` 改为新 `<AssetLibraryPage>`
- **无冲突**：旧文件保留，仅更改 import 和 element

### 2. 导航菜单入口？
- `Layout.tsx` 中 `NAV_GROUPS[1]` 已有 `{ to: '/asset-library', label: '素材库', icon: AssetLibraryIcon }`
- **无需修改**：导航入口已存在，label 和路径完全匹配

### 3. "用于生成"跳转路由是否存在？
- `App.tsx` 第 51 行：`<Route path="/studio" element={<Studio />} />`
- Studio 路由存在，query param `assetId` 可通过 `useSearchParams()` 在 Studio 接收（TASK-D 负责）
- **跳转路径有效**：`/studio?assetId=xxx` 可以正常导航

### 4. TypeScript 潜在问题
- 新 API 文件使用 `apiGet/apiPost` 来自 `../api/client`，路径需对应组件位置
  - 从 `pages/AssetLibraryPage/*.tsx` 调用 `../../api/assetLibraryApi`
  - 从 `api/assetLibraryApi.ts` 调用 `./client`
  - **路径无问题**

### 5. multer 接口调用方式
- 后端 `/api/asset-library/import` 使用 multipart/form-data（multer）
- 前端需用 `FormData` 而非 JSON body，不能用 `apiPost`
- **需特殊处理**：`importAssets` 函数需直接用 `fetch` + FormData，带 Bearer token

### 6. YAGNI 检查
- 不引入新 UI 库（使用现有 var CSS 变量 + Tailwind 类）
- 4 个组件各自聚焦单一职责
- AssetLibraryPage 用简单 Tab state 切换

## 结论

**PASS** — 无 must-fix，可进入 Builder 阶段。

唯一注意：`importAssets` 函数需用原生 fetch + FormData（不走 apiPost）。
