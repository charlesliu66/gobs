# Quality at Scale 项目 — Skills 与工作流对齐说明

**更新日期**: 2025-03-12  
**目的**: 整理 QAS 项目下的 skills 及你的工作流，确保 AI 与用户对齐

---

## 一、QAS 核心流水线（工作流总览）

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Quality at Scale 核心流水线                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

  [1] Prompt 输入（例：「10秒浪人打怪物发到 TikTok」）
        │
        ▼
  [2] 内容检索 + 脚本生成
        │ 基于 prompt 检索素材（图片）→ 生成结构化视频脚本（分镜、时间码、Seedance 格式）
        │
        ▼
  [3] 视频制作（Seedance / 即梦）
        │ 脚本 + 素材 → 自动生成视频 → Ai Videos/
        │
        ▼
  [4] 分发（Distribute）
        │ 成片 → GeeLark 云手机 API → 批量发布到 INS / TikTok / YouTube / Facebook
```

---

## 二、Skills 清单（按层级）

### 2.1 核心流水线 Skills（直接支撑 QAS Loop）

| Skill | 路径 | 功能 | 触发场景 |
|-------|------|------|----------|
| **video-create-distribute** | `~/.cursor/skills/video-create-distribute` | 统一入口：生成 + 管理 + 分发。串联 video-pipeline 与 geelark-publish | 「生成视频」「发到 TikTok」「管理我的视频」「一键生成并分发」 |
| **video-pipeline** | `~/.cursor/skills/video-pipeline` | 全自动视频生成。Prompt + 素材 → Seedance → 成片 | 单独生成视频、被 video-create-distribute 调用 |
| **geelark-publish** | `~/.cursor/skills/geelark-publish` | 视频 → GeeLark API → 批量发布到 TikTok/INS/YouTube/Facebook | 单独分发、被 video-create-distribute 调用 |
| **video-director** | `~/.cursor/skills/video-director` | 简单创意 → 分镜脚本 → Seedance 规则审核 → 可落地 prompt | 被 video-pipeline 调用；用户想「从创意生成 prompt」时也可单独用 |

### 2.2 分镜与创意 Skills（支撑 Prompt 生成）

| Skill | 路径 | 功能 | 触发场景 |
|-------|------|------|----------|
| **storyboard-studio** | `~/.cursor/skills/storyboard-studio` | 分镜规范：镜头类型、构图、光线、运镜等 | 被 video-director 调用；写 AI 图像/视频 prompt 时 |
| **storyboarder** | `~/.cursor/skills/storyboarder` | 7 面板用户旅程故事板，偏产品/UX | 产品概念、用户旅程分镜，与视频分镜不同 |

### 2.3 流程与工程 Skills（Superpowers 体系）

| Skill | 功能 | 何时使用 |
|-------|------|----------|
| **brainstorming** | 设计前头脑风暴 | 新功能、大改动前 |
| **writing-plans** | 任务拆解为 2–5 分钟可执行项 | 有 spec 或需求后 |
| **subagent-driven-development** | 子 Agent 执行 + 双重审查 | 执行实施计划 |
| **test-driven-development** | TDD 流程 | 实现功能/修复前 |
| **systematic-debugging** | 系统化调试 | 遇到 bug、测试失败 |
| **verification-before-completion** | 完成前验证 | 完成前、提交/PR 前 |
| **using-superpowers** | 技能调用入口与优先级 | 每次对话开始时 |
| **finishing-a-development-branch** | 分支收尾、合并选项 | 实现完成、测试通过后 |

---

## 三、数据流与 Skill 调用链

```
用户：「做个10秒浪人视频发到 TikTok」

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

---

## 四、你的工作流（按任务类型）

| 任务类型 | 推荐 Skills 顺序 | 说明 |
|----------|------------------|------|
| **一键生成+分发视频** | video-create-distribute | 直接说「做个 X 秒 Y 视频发到 TikTok」即可 |
| **仅生成视频** | video-create-distribute 或 video-pipeline | 「帮我生成一个 10 秒浪人视频」 |
| **仅分发已有视频** | video-create-distribute 或 geelark-publish | 「把最新视频发到三台手机的 TikTok」 |
| **管理视频（列表/删除）** | video-create-distribute | 「列出我的视频」「删除某某视频」 |
| **从创意生成 prompt** | video-director | 需要「创意 → Seedance 可落地的 prompt」时 |
| **新功能/大改动** | brainstorming → writing-plans → subagent-driven-development | 先设计、再拆任务、再执行 |
| **Bug 修复** | systematic-debugging | 遇到 bug 时 |
| **完成/提交前** | verification-before-completion | 确保改动正确再提交 |
| **分支收尾** | finishing-a-development-branch | 决定如何合并/PR |

---

## 五、用户指令与 Skill 映射速查

| 你可能会说 | 对应 Skill | 说明 |
|------------|------------|------|
| 「做个 10 秒浪人视频发到 TikTok」 | video-create-distribute | 一键生成+分发 |
| 「帮我生成一个 X 秒 Y 视频」 | video-create-distribute / video-pipeline | 仅生成 |
| 「发到三台手机的 TikTok」 | video-create-distribute / geelark-publish | 仅分发 |
| 「列出我的视频」「删除某视频」 | video-create-distribute | 管理 |
| 「10 秒浪人打怪物 的 prompt 怎么写」 | video-director | 创意 → prompt |
| 「帮我设计一个视频分镜」 | storyboard-studio | 分镜规范 |
| 「我要加一个 XX 功能」 | brainstorming → writing-plans | 先设计再实施 |
| 「这里有个 bug」 | systematic-debugging | 系统化排查 |
| 「代码写完，帮我验证」 | verification-before-completion | 跑验证、确认通过 |

---

## 六、QAS 项目内相关资源

| 资源 | 路径 | 说明 |
|------|------|------|
| 设计文档 | `docs/plans/2025-03-10-quality-at-scale-design.md` | 核心 Loop、阶段拆解、决策点 |
| Skills 清单 | `docs/plans/2025-03-11-quality-at-scale-skills-inventory.md` | 优化建议、高/中/低优先级 |
| 统一技能设计 | `docs/plans/2025-03-11-video-create-distribute-skill-design.md` | video-create-distribute 架构 |
| 配置 | `config/geelark.json` | GeeLark 配置（appId、devices、aiVideosPath 等） |
| H5 实现计划 | `docs/plans/2025-03-11-h5-implementation-plan.md` | Phase 0/1/2 实践路径 |
| H5 后端 skills | `h5-video-tool-api/src/skills/` | video-director、storyboard-studio（供 H5 API 调用） |

---

## 七、对齐确认清单

- [ ] **统一入口**：日常「生成+分发」优先用 `video-create-distribute`，避免手动串 video-pipeline + geelark-publish
- [ ] **新功能/改动**：先用 `brainstorming` 理清需求，再用 `writing-plans` 拆任务
- [ ] **Bug**：用 `systematic-debugging` 系统化排查
- [ ] **完成前**：用 `verification-before-completion` 验证
- [ ] **配置**：GeeLark、aiVideosPath 等统一从 `QAS/config/` 读取（当前各 skill 可能分散，后续可优化）

---

## 八、待优化项（参考 skills-inventory）

| 优先级 | 优化点 |
|--------|--------|
| 高 | 发布结果验证（任务完成后自动 query 状态）；账号登录前置检查 |
| 中 | 管理增强（持久化视频↔任务ID映射）；文案自动生成；错误码文档化 |
| 低 | 世界观文档检索；按云手机已安装 App 动态选平台；Skill 间契约文档 |

---

*本文档为 QAS 项目 Skills 与工作流的对齐基准，后续有变更可在此更新。*
