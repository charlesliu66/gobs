# Quality at Scale 相关 Skills 清单与优化建议

**日期**: 2025-03-11  
**基于**: Superpowers 工作流 + Quality at Scale 设计文档

---

## 一、Skills 位置与功能

### 1. 核心流水线 Skills（直接支撑 QAS Loop）

| Skill | 路径 | 功能 |
|-------|------|------|
| **video-create-distribute** | `~/.cursor/skills/video-create-distribute` | 统一入口：生成 + 管理 + 分发。串联 video-pipeline 与 geelark-publish，含 list/delete |
| **video-pipeline** | `~/.cursor/skills/video-pipeline` | 全自动视频生成。Prompt + 素材 → Seedance 即梦 → 成片。执行脚本：`C:\...\video-pipeline\run.js` |
| **geelark-publish** | `~/.cursor/skills/geelark-publish` | 视频 → GeeLark API → 批量发布到 TikTok/INS/YouTube/Facebook。含 publish.js、query-tasks.js |
| **video-director** | `~/.cursor/skills/video-director` | 简单创意 → 分镜脚本 → Seedance 规则审核 → 可落地 prompt。被 video-pipeline 调用 |

### 2. 分镜与创意 Skills（支撑 Prompt 生成）

| Skill | 路径 | 功能 |
|-------|------|------|
| **storyboard-studio** | `~/.cursor/skills/storyboard-studio` | 分镜规范：镜头类型、构图、光线、运镜等。被 video-director 调用 |
| **storyboarder** | `~/.cursor/skills/storyboarder` | 7 面板用户旅程故事板，偏产品/UX。与视频分镜不同场景 |

### 3. 流程与工程 Skills（Superpowers 体系）

| Skill | 路径 | 功能 |
|-------|------|------|
| **brainstorming** | `~/.cursor/skills/brainstorming` | 设计前头脑风暴，理清需求与方案 |
| **writing-plans** | `~/.cursor/skills/writing-plans` | 将任务拆解为 2–5 分钟可执行项 |
| **subagent-driven-development** | `~/.cursor/skills/subagent-driven-development` | 子 Agent 执行 + 双重审查（规格 + 代码质量） |
| **test-driven-development** | `~/.cursor/skills/test-driven-development` | TDD 流程 |
| **systematic-debugging** | `~/.cursor/skills/systematic-debugging` | 系统化调试 |
| **verification-before-completion** | `~/.cursor/skills/verification-before-completion` | 完成前验证 |
| **using-superpowers** | `~/.cursor/skills/using-superpowers` | 技能调用入口与优先级 |

---

## 二、数据流与依赖关系

```
用户：「做个10秒浪人视频发到TikTok」

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

## 三、潜在优化点（按优先级）

### 高优先级

| 优化点 | 说明 |
|--------|------|
| **1. 发布结果验证** | 当前仅提交任务，未自动验证「任务完成」或获取 shareLink。建议：distribute 完成后自动 query 任务状态，失败时提示原因（如账号未登录） |
| **2. 账号登录前置检查** | 发布前可调用 GeeLark 接口检查云手机内 TikTok 是否已登录，未登录则提前提示，避免 6 个任务全部失败 |
| **3. 配置路径统一** | video-create-distribute、geelark-publish、video-pipeline 各自读取配置，路径分散。建议：统一从 `QAS/config/` 读取，或通过单一 env 指定 |

### 中优先级

| 优化点 | 说明 |
|--------|------|
| **4. 管理能力增强** | 当前 list/delete 为 MVP。远期：持久化「视频 ↔ 任务 ID」映射，列表展示发布状态、任务状态 |
| **5. 文案自动生成** | geelark-publish 支持从 prompt 生成文案，但 --latest 时 prompt 来自 latest.json。可增强：按平台公式自动生成 caption，减少用户输入 |
| **6. 错误码文档化** | 42006、40003 等 GeeLark 错误码散落在对话中。建议：在 api-notes 或 reference 中整理「错误码 → 原因 → 处理」速查表 |

### 低优先级

| 优化点 | 说明 |
|--------|------|
| **7. 世界观文档检索** | QAS 设计预留「检索世界观文档约束脚本」。当前未实现，可后续加入 RAG 或关键词检索 |
| **8. 多平台发布策略** | multiPlatformVideoDistribution 需 TikTok+INS+YT 均安装。可增加「按云手机已安装 App 动态选择平台」 |
| **9. Skill 间契约** | video-director、video-pipeline、geelark-publish 的输入输出多为隐式。可补充 interface-contract 类文档，便于 H5 对接与重构 |

---

## 四、与 Superpowers 的衔接

| 阶段 | 推荐 Skill |
|------|------------|
| 新功能/大改动 | brainstorming → writing-plans → subagent-driven-development |
| Bug 修复 | systematic-debugging |
| 完成前 | verification-before-completion |
| 分支收尾 | finishing-a-development-branch |

**建议**：对上述高优先级优化，可先用 brainstorming 产出方案，再用 writing-plans 拆任务，由 subagent 执行。
