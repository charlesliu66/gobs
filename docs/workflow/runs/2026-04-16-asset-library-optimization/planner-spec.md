# 素材库体验优化 — Planner Spec

> Run ID: `2026-04-16-asset-library-optimization`
> 日期: 2026-04-16
> 状态: Building

## 目标

将素材库从"能用"升级为"好用"：AI 打标成功率 >95%、找素材时间降 60%、支持收藏/最近使用/文件夹/Google Drive。

## Phase 划分

| Phase | 内容 | 预估 |
|-------|------|------|
| **0** | DB Schema 升级（新表+新列） | 0.5 天 |
| **1** | AI 打标简化 + 收藏 + 最近使用 | 2 天 |
| **2** | 虚拟文件夹 + 搜索增强 | 2 天 |
| **3** | 自定义文件夹 + 拖拽 + 预览优化 | 3 天 |
| **4** | Google Drive 集成 | 3 天 |

## AC (Acceptance Criteria)

### Phase 0
- [ ] `assets` 表新增 `ai_category TEXT` + `ai_description TEXT` 列
- [ ] 新建 `asset_folders` / `asset_favorites` / `asset_usage_log` 表
- [ ] 存量素材 `ai_category` 默认值为 `'未分类'`
- [ ] 后端启动无报错

### Phase 1
- [ ] AI 打标只返回 `category`(7 枚举) + `description`(≤50 字)
- [ ] 打标失败 → category 设为"未分类"，不阻塞上传
- [ ] POST/DELETE `/favorites/:assetId` — 收藏/取消收藏
- [ ] GET `/favorites` — 收藏列表
- [ ] POST `/usage` — 记录使用
- [ ] GET `/recent` — 最近使用列表
- [ ] 前端 Tab 切换：最近使用 | 收藏 | 全部素材
- [ ] 素材卡片显示星标按钮
- [ ] 分类筛选支持 `ai_category`

### Phase 2
- [ ] 搜索范围扩展到 `ai_description`
- [ ] 左侧栏虚拟文件夹（按 `ai_category` 分组 + 计数）
- [ ] 点击文件夹筛选对应分类
- [ ] 搜索框 debounce 300ms 即时搜索

### Phase 3
- [ ] 用户自定义文件夹 CRUD
- [ ] 拖拽素材到文件夹
- [ ] 悬停预览大图 / 视频自动播放前 3 秒
- [ ] 网格/列表视图切换

### Phase 4
- [ ] Google OAuth 2.0 授权流程
- [ ] Drive 文件夹浏览（缩略图直出）
- [ ] 按需下载到服务器
- [ ] 缓存状态标记
- [ ] URL 批量导入（备选方案）

## 技术约束

- 数据库: better-sqlite3（非 PostgreSQL），无 ENUM，用 CHECK 约束
- 禁止修改: dreaminaVideo.ts / klingVideo.ts / veoPython.ts / studioPipeline.ts / productionTypes.ts / productionAssets.ts
- 新环境变量必须先在 .env.example 声明
- Google Drive 域名：用户将购买独立域名，开发阶段用 localhost redirect URI

## 风险

| 风险 | 缓解 |
|------|------|
| SQLite ALTER TABLE 限制 | 只加列不改列，新表独立创建 |
| AI 打标仍有误分类 | 用户可手动修改 + 枚举扩展到 7 类 |
| Google OAuth 域名未就绪 | 开发用 localhost，部署时切换 |
