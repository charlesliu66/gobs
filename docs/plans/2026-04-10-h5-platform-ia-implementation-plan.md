# H5 平台架构重构实施计划（高级制片主模型）

**日期**：2026-04-10  
**输入设计**：`docs/plans/2026-04-10-h5-platform-information-architecture-design.md`  
**目标**：将高级制片设为主项目，一键成片归入主项目流程，并统一历史入口心智。

---

## 0. 约束与原则

- 不破坏现有线上可用路径；先加兼容层，再切换默认路径。
- 一次只改一个大模块，保证每步可验证、可回退。
- 所有迁移逻辑必须幂等（重复执行不会破坏数据）。

---

## 1. 数据与接口改造（后端优先）

### Task 1.1 定义统一运行模型

**文件建议**
- `h5-video-tool-api/src/services/productionPersist.ts`（或同类 persistence 服务）
- `h5-video-tool-api/src/routes/productionPersist.ts`
- `h5-video-tool-api/src/services/quickFilmService.ts`

**改造点**
- 新增/扩展 `ProjectRun` 结构：
  - `id`, `projectId`, `source`, `stepState`, `snapshot`, `createdAt`, `updatedAt`
- 新增 `source=quickfilm` 运行记录写入接口。

**验收**
- 可在同一 `projectId` 下写入并读取 `production` 与 `quickfilm` 两类 run。

### Task 1.2 QuickFilm 状态分层保存

**改造点**
- Step1 保存 draft（已有逻辑复用）。
- Step2/3 新增 session 快照接口：
  - `POST /api/quickfilm/session/save`
  - `GET /api/quickfilm/session/load?projectId=...`
- 关键节点写 checkpoint：
  - story ready / storyboard ready / queued / done。

**验收**
- 任意阶段刷新后，`load` 能返回最近可恢复状态。

### Task 1.3 历史索引统一输出

**改造点**
- 在 history 后端聚合 `Outputs` 时增加 `source` 与 `projectId` 映射。
- 保证 `/history` 可看到 quickfilm + production 产物。

**验收**
- 单一历史接口可覆盖全部生成路径。

---

## 2. 前端信息架构改造

### Task 2.1 Studio 页面语义调整

**文件建议**
- `h5-video-tool/src/pages/Studio.tsx`

**改造点**
- 将“历史内容”文案改为“我的成片（快捷）”。
- 保留近场列表（最近产物）。
- 增加“查看全部历史”跳转到 `/history`。

**验收**
- 用户在 Studio 不再误以为这是完整历史中心。

### Task 2.2 QuickFilm 绑定主项目

**文件建议**
- `h5-video-tool/src/pages/QuickFilm.tsx`
- `h5-video-tool/src/api/production.ts`
- `h5-video-tool/src/api/quickfilm.ts`（若存在）

**改造点**
- 打开 QuickFilm 时必须持有或创建 `projectId`。
- 所有保存与生成动作写入该 `projectId` 的 `ProjectRuns`。
- Step2/3 操作后自动 session 保存（防丢进度）。

**验收**
- QuickFilm 不再游离，数据在项目中心可追踪。

### Task 2.3 项目中心展示统一运行轨迹

**文件建议**
- `h5-video-tool/src/pages/ProjectList.tsx`
- （如有）项目详情页组件

**改造点**
- 在项目项中展示 run 来源标签（高级制片/一键成片）。
- 支持继续上次 quickfilm run 的入口。

**验收**
- 用户在一个项目内可看到并进入两种流程成果。

---

## 3. 迁移与兼容

### Task 3.1 旧草稿迁移器

**改造点**
- 首次进入 QuickFilm 时检测旧草稿结构。
- 自动映射为：
  - 若无项目：创建默认 project
  - 写入 `source=quickfilm` 的 draft run

**验收**
- 旧用户进入后不丢原有输入内容。

### Task 3.2 读路径双栈

**改造点**
- 读取优先新结构，缺失时回落旧结构。
- 增加一次性迁移标记（避免重复迁移）。

**验收**
- 新旧数据均可正常打开，且逐步收敛到新结构。

---

## 4. 验证计划

### 后端验证

- 单测/集成（如已有）覆盖：
  - save/load session
  - checkpoint 状态流转
  - history 聚合来源字段

### 前端验证

- 手测脚本：
  1. 新建项目 -> 进入 QuickFilm Step1 保存 -> 刷新恢复
  2. 生成到 Step2 -> 刷新恢复
  3. 确认到 Step3 -> 刷新恢复
  4. 产出后在 `/history` 可查到该视频
  5. Studio 快捷列表与 `/history` 跳转一致

### 回归重点

- 高级制片旧流程不回退
- 历史页面筛选/播放/合并不受影响

---

## 5. 发布顺序（建议）

1. **后端先发**：接口与兼容层上线（前端未切换前不影响用户）。
2. **前端灰度开关**：先对开发/演示环境打开新路径。
3. **全量切换**：确认稳定后默认启用，保留短期回退开关。

---

## 6. 风险与应对

- **风险：旧草稿结构多样导致迁移失败**  
  对策：迁移失败写日志并回落旧读取，不阻塞使用。

- **风险：Step2/3 自动保存频繁触发请求**  
  对策：增加 1-2 秒防抖和“内容变更才保存”策略。

- **风险：历史聚合性能下降**  
  对策：分页 + 来源索引字段 + 最近时间倒序缓存。

---

## 7. 执行拆分（可直接开工）

- 阶段 A（后端模型与接口）：1-2 天  
- 阶段 B（QuickFilm 前端接入）：1-2 天  
- 阶段 C（Studio/History 语义统一）：0.5-1 天  
- 阶段 D（迁移与回归）：1 天

总计：约 4-6 天（单人）。

