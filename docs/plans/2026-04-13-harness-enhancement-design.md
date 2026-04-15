# Harness Enhancement Design
**Date:** 2026-04-13
**Scope:** CLAUDE.md · Eval 验证流程 · Context 管理策略

---

## 1. CLAUDE.md（多工具兼容）

### 目标
一份单文件的智能体运行说明，兼容 Claude Code、Cursor、OpenClaw 等工具，让任何 AI 在首轮读取后即可正确工作，无需追问项目背景。

### 结构设计
```
CLAUDE.md
├── 项目概述          3 行：平台名、服务器、Git仓库
├── 技术栈            前端 / 后端 / 部署
├── 关键文件地图      告诉 AI 先读哪里，不要随机探索
├── 开发命令          build / dev / typecheck
├── 环境变量说明      .env 结构、必配项、绝不提交项
├── 4+1 工作流规则    必须过 5 个门禁，否则不能进入下一阶段
├── 禁区              不能改的文件 / 不能做的操作
├── Context 加载顺序  每轮任务开始时优先读取的文件列表
└── 跨会话 memory     .claude/memory/ 格式约定
```

### 验收标准
- AC-1: 新对话不需要追问"这个项目是什么"
- AC-2: AI 不会主动改动 .env 或 productionTypes.ts 等禁区文件
- AC-3: 所有 4+1 工作流规则在文件中可见且可执行
- AC-4: 环境变量区块清楚区分"必须配置"和"可选"

---

## 2. Eval 验证流程（半自动化）

### 目标
用脚本覆盖机械检查（零遗漏），AI Verifier 角色覆盖业务判断（零误判），两层输出合并为标准化 JSON 报告，供 Integrator 直接决策。

### 组件设计

#### `scripts/eval.sh`
```
输入: RUN_ID（对应 docs/workflow/runs/<run-id>/）
步骤:
  1. npm run build (后端 + 前端)
  2. TypeScript 零错误检查
  3. 关键 API 健康检查（curl GET /api/health）
  4. 可选: curl 对关键 endpoint 做冒烟测试
输出: docs/workflow/runs/<run-id>/eval-result.json
退出码: P0 失败 → exit 1；P1 警告 → exit 2；通过 → exit 0
```

#### `eval-result.json` 结构
```json
{
  "run_id": "2026-04-13-xxx",
  "timestamp": "ISO8601",
  "checks": {
    "backend_build": { "status": "pass|fail", "error": "" },
    "frontend_build": { "status": "pass|fail", "error": "" },
    "typescript": { "status": "pass|fail", "errors": [] },
    "api_health": { "status": "pass|fail", "code": 200 },
    "smoke_tests": [
      { "name": "POST /api/video/generate", "status": "pass|fail", "note": "" }
    ]
  },
  "verdict": "P0_FAIL | P1_WARN | PASS"
}
```

#### 强化 Verifier 提示词
在 `docs/workflow/prompts/verifier.md` 增加规则：
- 必须先读取 `eval-result.json`，将机械检查结果纳入报告
- 若 eval verdict 为 P0_FAIL，直接标记 P0 缺陷，不需要重复验证

### 验收标准
- AC-5: `eval.sh` 在 build 失败时 exit 1，CI 可感知
- AC-6: `eval-result.json` 结构固定，Verifier AI 可直接解析
- AC-7: Verifier 提示词包含"读 eval-result.json"强制步骤

---

## 3. Context 管理策略

### 目标
解决两个核心痛点：
1. **无关信息占据 context** → 在任务开始时定义"只读这些文件"
2. **长任务目标漂移** → 用 SESSION-ANCHOR.md 锚定目标，每轮开始强制检查

### 组件设计

#### SESSION-ANCHOR.md（每个 workflow run 生成）
路径: `docs/workflow/runs/<run-id>/SESSION-ANCHOR.md`
```markdown
## 本轮目标（一句话）
[来自 planner-spec 的 Goal 字段]

## 验收标准 ID
[AC-1, AC-2, AC-3 ...]

## 本轮禁区
[本次任务中不能碰的文件/目录]

## 只读这些文件（按需展开）
- docs/workflow/runs/<run-id>/planner-spec.md
- [涉及的源码文件]

## 当前进度
- [x] AC-1 已实现
- [ ] AC-2 待验证
```

#### 跨会话 Memory 结构（已有，补充规范）
路径: `.claude/memory/`
```
MEMORY.md           索引（≤200行）
project.md          项目背景常量（技术栈、仓库、服务器）
feedback.md         AI 行为矫正记录（教训 + 规则）
```

#### CLAUDE.md 中的 Context 加载顺序
每轮任务开始时，AI 按以下顺序加载，不主动展开其他文件：
```
1. CLAUDE.md（本文件）
2. docs/TASK-INDEX.md（当前任务优先级）
3. docs/workflow/runs/<run-id>/SESSION-ANCHOR.md（本轮锚点）
4. docs/workflow/runs/<run-id>/planner-spec.md（详细规格）
5. 只读 SESSION-ANCHOR 中列出的源码文件
```

### 验收标准
- AC-8: 每个 workflow run 包含 SESSION-ANCHOR.md
- AC-9: CLAUDE.md 中有明确的 Context 加载顺序章节
- AC-10: .claude/memory/ 有 project.md 和 feedback.md

---

## 实施顺序

| 步骤 | 产物 | 依赖 |
|------|------|------|
| 1 | `CLAUDE.md`（根目录） | 无 |
| 2 | `.claude/memory/project.md` + `feedback.md` | CLAUDE.md |
| 3 | `scripts/eval.sh` | 无 |
| 4 | `docs/workflow/runs/RUN_TEMPLATE/SESSION-ANCHOR.md` | 无 |
| 5 | 强化 `docs/workflow/prompts/verifier.md` | eval.sh |

---

## 超出范围

- CI/CD 集成（eval.sh 触发方式由部署决定）
- harness-evolver 自进化（后期优化）
- 前端 E2E 测试（Playwright 等，独立任务）
