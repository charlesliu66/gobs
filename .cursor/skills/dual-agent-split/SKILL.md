---
name: dual-agent-split
description: 双 Agent 并行开发编排。当有方案文档（md）需要拆分给 Cursor 和 Claude Code 并行开发时使用。输入一份方案文档，输出两份任务包（cursor-task.md + claude-task.md），自动建好 Git 分支，开发完成后辅助 merge。触发词：拆分任务、并行开发、双 agent、cursor 和 claude 分工。
---

# 双 Agent 并行开发编排

## 工作流

### Phase 1：拆分（Gemini 3 执行）

收到方案文档后：

1. **分析文件依赖** — 列出所有要改的文件，标注哪些有交叉风险
2. **按文件归属拆分** — 核心原则：**一个文件只让一边改**
3. **生成任务包** — 输出到 `docs/splits/` 目录：
   - `{方案名}-cursor-task.md` — Cursor 的完整执行指令
   - `{方案名}-claude-task.md` — Claude Code 的完整执行指令
4. **建分支** — 在远程仓库创建两个 feature 分支

任务包格式见 `references/task-template.md`。

### Phase 2：并行开发（用户执行）

用户分别在两个终端操作：

```bash
# 终端 1：Cursor
# 打开 Cursor IDE，切到指定分支，粘贴 cursor-task.md 内容

# 终端 2：Claude Code TUI
cd ~/项目目录
git checkout feat/xxx-claude
# 粘贴 claude-task.md 内容给 Claude
```

### Phase 3：合并（Gemini 3 执行）

两边都完成后，用户通知 Gemini 3：

1. 拉取两个分支最新代码
2. 先 merge 改动较少的分支到 main
3. 再 merge 另一个分支，处理冲突
4. 运行 build 验证
5. 推送 main

## 拆分原则

### 文件分配优先级

1. **新文件** → 随便分，零冲突风险
2. **只改一两行的公共文件**（如 App.tsx 加路由）→ 分给任意一方，另一方在任务包里注明"不要动这个文件"
3. **大改的文件** → 独占，绝不两边同时改
4. **类型定义文件** → 如果两边都要用新类型，先提一个 PR 合到 main，再拉分支

### 典型拆分模式

| 模式 | Cursor | Claude Code |
|------|--------|-------------|
| 前端 + 后端 | 前端页面/组件 | 后端 API/服务 |
| 改旧 + 建新 | 重构现有代码 | 新建页面/模块 |
| UI + 逻辑 | 样式/布局调整 | hooks/状态/数据层 |
| 独立功能 A + B | 功能 A 全栈 | 功能 B 全栈 |

### 禁止事项

- ❌ 两边同时大改同一个文件
- ❌ 任务包里出现模糊指令（"可能需要改 xxx"）
- ❌ 遗漏"不要动"清单
