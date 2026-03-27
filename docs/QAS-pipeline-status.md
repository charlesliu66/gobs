# Quality at Scale 项目 — Pipeline 梳理与进展

**更新日期**: 2025-03-12  
**目的**: 梳理 QAS 核心流水线、各阶段进展、当前卡点

---

## 一、Pipeline 总览

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Quality at Scale 核心流水线                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

  [1] Prompt 输入
        │  例：「10秒浪人打怪物发到 TikTok」
        ▼
  [2] 内容检索 + 脚本生成
        │  基于 prompt 检索素材（图片）→ 生成结构化视频脚本（分镜、时间码、Seedance 格式）
        │
        ▼
  [3] 视频制作（Seedance / 即梦）
        │  脚本 + 素材 → 自动生成视频 → Ai Videos/
        │
        ▼
  [4] 分发（Distribute）
        │  成片 → GeeLark 云手机 API → 批量发布到 INS / TikTok / YouTube / Facebook
        ▼
      完成
```

---

## 二、各阶段拆解与进展

### 阶段 1：Prompt → 检索 → 结构化脚本

| 环节 | 输入 | 输出 | 状态 | 实现位置 |
|------|------|------|------|----------|
| **1.1 检索** | Prompt、关键词 | 相关本地/Drive 素材列表 | ✅ 部分完成 | H5: `DriveMaterialPicker`、`useGoogleDrive`；后端: `POST /api/drive/search`、`verify-folder` |
| **1.2 脚本生成** | Prompt + 素材映射 | 结构化视频脚本（分镜、@图片N） | ⚠️ 未完成 | 缺 `POST /api/prompt/generate`；video-director skill 已存在，但未接入 H5 API |

**已实现**：
- 前端：Prompt 输入、关键词提取（`keywords.ts`）、Drive 连接、素材搜索、选择与排序
- 后端：Drive 搜索代理、文件夹验证

**未实现**：
- 分镜生成 API（调用 video-director + storyboard-studio + seedance-rules）
- 世界观文档检索（设计预留，未落地）

---

### 阶段 2：视频制作（Seedance）

| 环节 | 输入 | 输出 | 状态 | 实现位置 |
|------|------|------|------|----------|
| **2.1 提交任务** | 结构化 prompt + 素材路径 | taskId | ✅ 在 video-pipeline | `cursor_try/video-pipeline/run.js` |
| **2.2 成片落地** | taskId 轮询 | 成片到 Ai Videos/ | ✅ | run.js 已输出 latest.json |
| **2.3 H5 调用** | 分镜 + 素材 | 成片 URL | ⚠️ 未完成 | 缺 `POST /api/video/generate`、Seedance 服务对接 |

**已实现**：
- video-pipeline（本地脚本）：`run.js` 支持 prompt + 素材 → Seedance → 成片，并写入 `latest.json`
- 输出格式：`{ outputPath, prompt, timestamp }`

**未实现**：
- H5 后端 Seedance API 封装（提交任务、轮询、下载）
- 前端「生成视频」→「成片预览/下载」流程

---

### 阶段 3：分发（Distribute）

| 环节 | 输入 | 输出 | 状态 | 实现位置 |
|------|------|------|------|----------|
| **3.1 平台选择** | 成片 + 配置 | 目标平台列表 | ✅ 已定 | INS、TikTok、YouTube、Facebook |
| **3.2 发布** | 成片路径/URL + 文案 | 任务 ID | ✅ 在 Skills | geelark-publish `publish.js` |
| **3.3 H5 发布** | 成片 + 文案 | 任务 ID | ⚠️ 未完成 | 缺 `POST /api/publish`、GeeLark 服务封装 |

**已实现**：
- geelark-publish skill：`publish.js`、`query-tasks.js`、`cancel-task.js`
- 配置：`config/geelark.json`（appId、devices、aiVideosPath、latestJsonPath）
- 云手机管理、TikTok 登录脚本（`geelark-tiktok-login.js`、`gmail-fetch-tiktok-code.js`）

**未实现**：
- H5 后端 GeeLark 封装与发布 API
- 发布后自动 query 任务状态、失败原因提示

---

## 三、Skills 调用链（当前设计）

```
video-create-distribute (统一入口)
    │
    ├─→ video-pipeline (生成)
    │       ├─→ video-director (prompt 生成)
    │       │       └─→ storyboard-studio (分镜规范)
    │       └─→ run.js (Seedance 自动化)
    │
    └─→ geelark-publish (分发)
            └─→ publish.js (GeeLark API)
```

**说明**：video-create-distribute 在 Cursor 对话中串联各子技能；H5 需要单独实现对应 API 路由。

---

## 四、两条实践路径对比

| 路径 | 范围 | 进度 | 说明 |
|------|------|------|------|
| **本地 / Cursor 对话** | 通过 Skills 全流程 | ✅ 可闭环 | 用户说「做个 X 秒 Y 视频发到 TikTok」→ video-create-distribute 调用 video-pipeline + geelark-publish |
| **H5 网页工具** | 给同事用 | ⚠️ Phase 0 未完成 | 缺：分镜 API、视频生成 API、发布 API；当前只有 Prompt + Drive 检索 |

---

## 五、当前卡点汇总

### 高优先级（影响主流程）

| 卡点 | 影响 | 建议 |
|------|------|------|
| **H5 缺分镜生成 API** | Phase 0 无法从 Prompt → 分镜 | 新增 `POST /api/prompt/generate`，调用 video-director + storyboard-studio + seedance-rules |
| **H5 缺视频生成 API** | 无法从分镜 → 成片 | 新增 `POST /api/video/generate`，封装 Seedance（laozhang.ai 等）提交与轮询 |
| **H5 缺发布 API** | 无法从成片 → 社媒 | 新增 `POST /api/publish`，封装 GeeLark 上传 + 自动化任务 |
| **GeeLark 上传 ETIMEDOUT** | 内网/防火墙环境无法上传 | 文档有方案：putFile 加 timeout；或手动上传后改用 URL |
| **发布结果无验证** | 任务提交后不知成功/失败 | 分发后自动 query 任务状态，失败时提示（如账号未登录） |

### 中优先级（体验与稳定性）

| 卡点 | 影响 | 建议 |
|------|------|------|
| **账号登录前置检查** | 云手机未登录时 6 个任务全失败 | 发布前检查 TikTok 等是否已登录 |
| **配置路径分散** | 各 skill 读取配置方式不统一 | 统一从 `QAS/config/` 读取 |
| **GeeLark 40003 签名** | 部分账号仅支持 Key 验证 | 增加 appId + sign 方式 |

### 低优先级（扩展能力）

| 卡点 | 影响 | 建议 |
|------|------|------|
| **世界观文档检索** | 无法约束脚本在设定框架内 | 后期加入 RAG 或关键词检索 |
| **list-videos / delete-video** | 管理能力弱 | 设计中有，可放在 video-create-distribute 或 geelark-publish |

---

## 六、H5 实现缺口（对照 Phase 0 计划）

按 `docs/plans/2025-03-11-h5-implementation-plan.md`：

| Task | 计划内容 | 当前状态 |
|------|----------|----------|
| 0.1 | 前端项目初始化 | ✅ 已完成 |
| 0.2 | 后端项目 + Skills 复制 | ⚠️ 后端有 drive 路由，Skills 未复制到 `h5-video-tool-api/src/skills/` |
| 1.1 | Prompt 输入 + 关键词 | ✅ 已完成 |
| 1.2 | Drive 连接与素材检索 | ✅ 已完成 |
| 1.3 | **分镜生成 API** | ❌ 未实现 |
| 1.4 | **Seedance 视频生成** | ❌ 未实现 |
| 1.5 | 流程串联 + 成片下载 | ❌ 依赖 1.3、1.4 |
| 2.x | 保存到 Drive、发布 | ❌ Phase 2，未开始 |

---

## 七、推荐下一步（按优先级）

1. **补全 Phase 0 后端**：
   - 复制 video-director、storyboard-studio 到 `h5-video-tool-api/src/skills/`
   - 新增 `POST /api/prompt/generate`
   - 新增 `POST /api/video/generate`（对接 Seedance）

2. **串联 H5 前端**：
   - 分镜展示 → 用户确认 → 调用视频生成 → 轮询 → 成片下载

3. **（可选）发布模块**：
   - 新增 `POST /api/publish`，封装 GeeLark
   - 发布后自动 query 任务状态

4. **本地/Cursor 路径优化**：
   - 发布结果验证
   - 账号登录前置检查
   - 配置路径统一

---

## 八、video-director 优化（2025-03-12）

基于 Seedance 2.0 规范与 TT OM Video Agent，已完成对 `/video-director` 的增强：

| 优化项 | 说明 |
|--------|------|
| **seedance-rules.md** | 整合 Seedance 2.0 规范：绝对禁区、版权/IP 限制、魔法词、高危词替换表、高通过率模板 |
| **分镜必含要素** | 每个镜头须含：主体、环境、光线、运镜、色调/氛围；避免模糊描述 |
| **安全声明** | 开头加【原创数字艺术作品】等，结尾加「适合全年龄段观看」等，提升通过率 |
| **TT OM 结构** | 用户说「发到 TikTok」时自动采用 9:16 竖屏 + Hook→Suspense→Twist→CTA 结构 |
| **500 字限制** | 提示词控制在 500 字以内 |
| **参考来源** | Seedance2.0_Prompt_Rules.txt、TT OM Video Agent |

---

## 九、相关文档

| 文档 | 说明 |
|------|------|
| `docs/plans/2025-03-10-quality-at-scale-design.md` | 核心 Loop、阶段拆解、决策点 |
| `docs/plans/2025-03-10-video-pipeline-geelark-optimization.md` | video-pipeline 与 geelark 优化方案 |
| `docs/plans/2025-03-11-video-create-distribute-skill-design.md` | 统一技能架构 |
| `docs/plans/2025-03-11-quality-at-scale-skills-inventory.md` | Skills 清单与优化建议 |
| `docs/plans/2025-03-11-h5-implementation-plan.md` | H5 完整实践路径 |
| `docs/QAS-skills-and-workflow.md` | Skills 与工作流对齐 |
