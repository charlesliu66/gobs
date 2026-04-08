# 提交记录与主要改动说明

本文档按时间**从新到旧**记录重要提交，便于对照线上与本地、排查问题。

---

## 本次主要改动（汇总）

- **批量评论 / 规则库**：规则库 CRUD、上传 `.md`/`.py`、管理规则库（重命名、编辑文本、删除附件/整库）、`commander.py` 全局规则合并、输出语言强约束。
- **AI 生成**：Gemini / OpenAI、`/api/comment-rules/generate`、`/api/ai-config-status`、Sparkles 与 commander 可选合并。
- **体验**：主题绿标题、批量粘贴解析/生成进度条、删除二次确认（`AlertDialog`）、Vercel 部署与 Git 提交对照用 **`/api/build-info`**。
- **SeaTalk / 配置**：事件回调、状态接口、SeaTalk 与 AI 相关文档与 `web/.env.local.example`、`docs/全部配置清单.md` 更新。

---

## 逐条提交说明

### `71c9050` — chore: add api build-info for Vercel git sha

- 新增 **`GET /api/build-info`**：返回 Vercel 构建注入的 `VERCEL_GIT_COMMIT_SHA`、`VERCEL_GIT_COMMIT_REF` 等（本地开发多为 `null`）。
- **用途**：对比线上部署是否等于某次 Git 提交，排查「云端与本地不一致」。

---

### `4c7f915` — feat(web): 评论规则库、AI 生成、SeaTalk 与配置文档

**API**

- `web/app/api/comment-rules/route.ts`：规则库列表、新建、PATCH、删除。
- `web/app/api/comment-rules/generate/route.ts`：按规则库 + 提示词生成单条评论；合并 `commander.py` 与 `flattenRulesForGeneration`。
- `web/app/api/ai-config-status/route.ts`：检测 AI 密钥是否就绪。
- `web/app/api/generate-comment/route.ts`：Sparkles 备选评论；可选附带全局 commander。
- `web/app/api/seatalk/callback/route.ts`、`web/app/api/seatalk/status/route.ts`：SeaTalk 回调与状态。

**库与逻辑**

- `web/lib/comment-rule-store.ts`：规则持久化（KV/本地文件）、`.py`/`.md` 并入提示词。
- `web/lib/llm-generate-comment.ts`：Gemini/OpenAI 生成、system 与 output locale。
- `web/lib/load-commander-rules.ts`：磁盘 `commander.py` 加载与合并。
- `web/lib/output-language-prompt.ts`：输出语言硬性说明。

**前端**

- `web/components/control-panel.tsx`：规则库 UI、批量粘贴、进度、确认对话框等（大量改动）。
- `web/components/section-heading.tsx`：区块标题组件。
- `web/components/task-table.tsx`：删除行确认等。
- 多页 `SectionHeading` / 主题绿：`apps`、`batch-login`、`devices`、`settings`、`tasks`。

**配置与文档**

- `web/.env.local.example`：Gemini、OpenAI、`COMMENT_COMMANDER_PY_PATH` 等。
- `docs/全部配置清单.md`、`docs/评论自动生成-实现说明.md` 等；根目录 `commander.py.example`。
- `web/next.config.mjs`：`.env` 加载与合并。
- `requirements.txt`、`web/package.json`、`web/scripts/setup-env-seatalk.mjs` 等小幅更新。

---

### `3464a7d` — feat: SeaTalk 通知与 Open API（群消息、群信息、任务状态轮询 Cron）

- SeaTalk 任务通知、轮询 Cron、相关 API 与 `seatalk-notify` 等（本提交之前的基线功能）。

---

### `6852d3d` — feat: 主界面左下角主题切换，底部栏与侧栏对齐，移除侧栏设置入口

- 主题切换与布局调整。

---

### `ebf2b33` — Refactor GEELARK_BEARER_TOKEN handling: Moved token retrieval to a constant in the gealark library for better modularity and updated API route to use the new constant.

- GeeLark Token 获取重构。

---

### `216b83c` / `cea577f` — fix: 时区 Select 组件结构，修复 Vercel 构建错误

- 时区选择器与 Vercel 构建修复。

---

### `fee3375` — first commit

- 项目初始提交。

---

## 维护说明

以后若有重要功能发布，可在本文件顶部 **「本次主要改动」** 追加一节，并在 **「逐条提交说明」** 里为新的 `git commit` 增加一条（保持从新到旧）。
