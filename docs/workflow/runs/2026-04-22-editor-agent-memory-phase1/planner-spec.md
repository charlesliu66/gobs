# Planner Spec - editor agent memory phase1

> Run: `2026-04-22-editor-agent-memory-phase1`
> Gate 1 产物，覆盖记忆系统 P0 的首批实现。

---

## 背景

当前剪辑 Agent 的历史仅停留在 `EditorWorkbench` 页面内存态，刷新页面、切换项目或跨端访问都会丢失上下文；同时系统还没有把用户的沟通方式沉淀成跨项目复用的画像。这样会带来两个直接问题：

1. Agent 无法延续同一项目里的创意方向、禁用项和剪辑偏好
2. 平台无法从真实交互中识别用户偏好的沟通方式并持续优化

本轮不追求“一次做完整记忆系统”，而是先把最关键的三块打通：
- 统一的记忆类型与归一化规则
- 项目级历史和结构化记忆随工程保存/打开
- 用户级沟通画像在真实 Agent 交互后持续更新

---

## MEM-01：定义记忆契约与默认归一化

### 目标
建立前后端一致的基础结构，保证旧项目缺失字段时仍可安全打开，新项目可以附带记忆块持久化。

### 方案
- 新增后端 `editorAgentMemory` 类型文件，定义：
  - 原始事件 `AgentMessageEvent`
  - 项目级记忆 `EditorProjectMemory`
  - 用户级沟通画像 `EditorUserCommunicationProfile`
  - 摘要快照 `EditorMemorySummarySnapshot`
- 为上述结构提供默认值、置信度夹紧、旧数据归一化
- 前端新增对应的轻量类型，用于保存/打开项目和渲染最近对话

### AC
| # | 场景 | 预期 |
|---|---|---|
| AC-1 | 后端收到空或旧版 memory | 自动归一化为合法结构 |
| AC-2 | confidence / evidence 元数据缺失或越界 | 自动回填默认值并夹紧 |
| AC-3 | summary 快照缺失 | 可自动生成基础摘要 |

### 风险
- 前后端类型漂移：通过后端 schema 测试和前端类型引用收口

---

## MEM-02：项目级历史与结构化记忆持久化

### 目标
让同一个剪辑项目在保存/打开后保留最近对话、结构化偏好和摘要。

### 方案
- `editorProjects` 的 JSON 文档新增可选 `memory`
- `useTimelineState` 保存/打开工程时同时处理 `memory`
- `EditorWorkbench` 从项目记忆恢复最近对话，并把新的 Agent 结果写回项目记忆状态
- 只保留最近一小段原始事件，摘要与结构化偏好长期保存

### AC
| # | 场景 | 预期 |
|---|---|---|
| AC-1 | 打开已有项目 | 最近对话可恢复 |
| AC-2 | Agent 新产生聊天或剪辑结果 | 项目 memory 被更新并参与自动保存 |
| AC-3 | 原始事件超出窗口 | 自动截断到限定长度，旧内容沉淀在 summary / structured memory |

### 风险
- 空项目原本不会自动保存：本轮把 memory 也视为可保存内容，避免“只聊天不落盘”

---

## MEM-03：用户级沟通画像

### 目标
把跨项目稳定的协作偏好单独存为用户级 profile，并在每次 Agent 交互后增量更新。

### 方案
- 新增 `editorUserProfileService`
- 依据显式表达和重复行为更新：
  - `responseStyle`
  - `collaborationMode`
  - `controlPreference`
  - `pacePreference`
  - `platformLanguageStyle`
  - `negativePreferences`
- 最近矛盾表达会降低旧偏好的 confidence，避免画像僵化
- 当前先在后端持久化，为下一批 prompt 注入和 UI 可视化做准备

### AC
| # | 场景 | 预期 |
|---|---|---|
| AC-1 | 用户明确说“直接给我结果/先别动/不要解释太长” | 能提取到对应沟通信号 |
| AC-2 | 同类偏好重复出现 | confidence 与 evidenceCount 提升 |
| AC-3 | 新表达与旧画像冲突 | 旧画像 confidence 降低，画像可被新偏好覆盖 |

### 风险
- 早期规则过于激进：先只识别高置信的显式表达，避免误记

---

## 测试矩阵

| 类别 | 用例 | 覆盖 |
|---|---|---|
| 正向 | 空 memory 归一化 | MEM-01 |
| 正向 | 项目保存/打开携带 memory | MEM-02 |
| 正向 | 同项目最近对话恢复 | MEM-02 |
| 正向 | 显式沟通偏好提取 | MEM-03 |
| 异常 | confidence 越界 / 字段缺失 | MEM-01 |
| 异常 | 新偏好与旧画像冲突 | MEM-03 |
| 回归 | 旧项目无 memory 字段时照常可打开 | MEM-01 / MEM-02 |

---

## Gate 1 自检

- [x] 目标、范围和非目标明确
- [x] 未触碰禁止修改文件
- [x] 首批三项任务均有 AC / 风险 / 测试矩阵
- [x] 改动集中在编辑器项目存储和 Agent 辅助层，影响面可控
