# 视频生成+分发统一技能架构设计

**日期**: 2025-03-11  
**状态**: 已实施 (2025-03-11)  
**目标**: 将 video-pipeline 与 geelark-publish 串联为统一技能，支撑未来 H5（生成、管理、分发）

---

## 一、需求摘要

| 项目 | 说明 |
|------|------|
| **MVP** | 本地脚本验证完整闭环；管理仅需列表 + 删除 |
| **远期 H5** | 生成视频、管理视频（含发布/任务状态）、分发视频 |
| **架构原则** | 先定义接口契约，便于未来任意后端形态接入 |

---

## 二、整体架构

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                  video-create-distribute（统一编排技能）                            │
│                  职责：理解用户意图、编排子技能、统一接口契约                         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼                              ▼                              ▼
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
│  generate       │           │  manage         │           │  distribute     │
│  (生成)         │           │  (管理)         │           │  (分发)         │
│                 │           │                 │           │                 │
│ 调用            │           │ MVP: 列表+删除   │           │ 调用            │
│ video-pipeline  │           │ 未来: 状态追踪  │           │ geelark-publish │
└────────┬────────┘           └────────┬────────┘           └────────┬────────┘
         │                              │                            │
         ▼                              ▼                            ▼
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
│ video-pipeline  │           │ 本地脚本 / API   │           │ geelark-publish │
│ run.js          │           │ (待定)           │           │ publish.js      │
└─────────────────┘           └─────────────────┘           └─────────────────┘
         │                              │                            │
         └──────────────────────────────┴────────────────────────────┘
                                        │
                                        ▼
                              ┌─────────────────┐
                              │ Ai Videos 目录   │
                              │ + latest.json   │
                              └─────────────────┘
```

---

## 三、技能分层

### 3.1 统一技能（video-create-distribute）

| 层级 | 名称 | 职责 |
|------|------|------|
| **L0** | video-create-distribute | 用户入口；解析「生成/管理/分发」意图；调用子技能；返回统一结果 |
| **L1** | video-pipeline | 生成子技能（保持不变，作为可调用单元） |
| **L1** | 管理逻辑 | MVP 为独立脚本 `list-videos.js`、`delete-video.js` |
| **L1** | geelark-publish | 分发子技能（保持不变，作为可调用单元） |

**统一技能不替代子技能**：用户仍可单独使用 `/video-pipeline`、`/geelark-publish`。统一技能提供「串联 + 管理」的入口。

### 3.2 能力映射

| 用户意图 | 调用链 | 输出 |
|----------|--------|------|
| 生成视频 | video-create-distribute → video-pipeline | 成片路径、latest.json |
| 管理视频（列表） | video-create-distribute → list-videos | 视频列表（路径、大小、时间） |
| 管理视频（删除） | video-create-distribute → delete-video | 成功/失败 |
| 分发视频 | video-create-distribute → geelark-publish | 任务 ID 列表 |
| 一键生成+分发 | video-create-distribute → video-pipeline → geelark-publish --latest | 成片路径 + 任务 ID |

---

## 四、接口契约（便于未来 H5/API 接入）

### 4.1 生成 Generate

| 项目 | 说明 |
|------|------|
| **输入** | `{ prompt, materials?, duration?, aspect?, outputDir? }` |
| **输出** | `{ outputPath, prompt, timestamp }`（与 latest.json 一致） |
| **实现** | 调用 `video-pipeline/run.js` |

### 4.2 管理 Manage（MVP）

| 操作 | 输入 | 输出 |
|------|------|------|
| **列表** | `{ baseDir? }` | `[{ path, name, size, mtime }]` |
| **删除** | `{ path }` | `{ success, error? }` |

**实现**：新增 `scripts/list-videos.js`、`scripts/delete-video.js`（可放在统一技能目录或 geelark-publish 下）。

### 4.3 管理 Manage（远期）

| 操作 | 输入 | 输出 |
|------|------|------|
| **列表（增强）** | `{ baseDir?, includeStatus? }` | 含 `publishStatus`、`taskIds`、`taskStatus` |
| **状态同步** | `{ path }` | 从 GeeLark API 拉取该视频关联任务的状态 |

**实现**：需持久化「视频路径 ↔ 任务 ID」映射；调用 geelark `task/query` 或 `historyRecords` 补全状态。

### 4.4 分发 Distribute

| 项目 | 说明 |
|------|------|
| **输入** | `{ videos, envIds, platforms?, caption?, hashtags?, useLatest? }` |
| **输出** | `{ taskIds, videoUrls }` |
| **实现** | 调用 `geelark-publish/scripts/publish.js` |

---

## 五、目录与技能结构

### 5.1 推荐目录布局

```
~/.cursor/skills/video-create-distribute/
├── SKILL.md                    # 统一技能说明与工作流
├── scripts/
│   ├── generate.js             # 封装 video-pipeline 调用（或直接 spawn）
│   ├── list-videos.js          # MVP 管理：列表
│   ├── delete-video.js         # MVP 管理：删除
│   ├── distribute.js           # 封装 geelark-publish 调用
│   └── run-all.js              # 可选：一键生成+分发
├── reference/
│   └── interface-contract.md   # 接口契约文档（供 H5 对接参考）
└── (无独立 reference，复用于技能文档)

# 子技能保持原位置
~/.cursor/skills/video-pipeline/     # SKILL.md
C:\...\video-pipeline/run.js        # 执行脚本

~/.cursor/skills/geelark-publish/    # 完整 skill
```

### 5.2 统一技能 SKILL 要点

- **触发**：用户说「生成视频」「发到 TikTok」「管理我的视频」「一键生成并分发」等
- **工作流**：
  1. 解析意图 → 2. 调用对应子技能/脚本 → 3. 汇总结果并展示
- **依赖**：内部依赖 video-pipeline、geelark-publish，不复制其逻辑

---

## 六、数据流

```
用户：「帮我做个10秒浪人视频发到三台手机的TikTok」

video-create-distribute
    │
    ├─→ generate: prompt="浪人...", duration=10, materials=...
    │       │
    │       └─→ video-pipeline run.js → Ai Videos/成片.mp4 + latest.json
    │
    └─→ distribute: useLatest=true, envIds=[...], platforms=tiktok
            │
            └─→ geelark-publish publish.js --latest --env-ids ... → taskIds
```

---

## 七、MVP 实施范围

| 项 | 内容 |
|----|------|
| 1 | 创建 `video-create-distribute` 技能目录与 SKILL.md |
| 2 | 实现 `list-videos.js`（递归扫描 Ai Videos，返回列表） |
| 3 | 实现 `delete-video.js`（按路径删除，带安全校验） |
| 4 | 实现 `generate.js`（spawn video-pipeline） |
| 5 | 实现 `distribute.js`（spawn geelark-publish） |
| 6 | 编写 `reference/interface-contract.md` |
| 7 | （可选）`run-all.js` 串联 generate → distribute |

**不在此阶段**：H5 前端、持久化任务映射、完整状态追踪。

---

## 八、未来 H5 对接示意

H5 可据此契约实现 API：

```
POST /api/generate     → 调用 generate 契约
GET  /api/videos       → 调用 list 契约
DELETE /api/videos/:id → 调用 delete 契约
POST /api/distribute   → 调用 distribute 契约
```

后端形态（Node/BFF、Serverless、等）可自由选择，只需满足上述契约。

---

## 九、待确认

1. 统一技能目录是否放在 `~/.cursor/skills/video-create-distribute`？
2. 管理脚本（list/delete）放在统一技能下，还是放在 geelark-publish 作为扩展？
3. MVP 是否包含 `run-all.js`（一键生成+分发）？
