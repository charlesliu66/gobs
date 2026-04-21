# SESSION-ANCHOR · v0.65 即梦全平台调度器 + 取消排队

**Run ID**: `2026-04-20-dreamina-scheduler-cancel`
**Target Version**: `v0.65`
**Gate**: 1（Planner）→ 准备进入 Gate 2（Builder）
**Start From**: v0.64.2（commit `0006d7a`，已三端一统部署）

---

## 本轮目标（一句话）

把即梦任务的提交、排队、取消三件事统一搬到后端做平台级 FIFO 调度，前端从"猜测状态"变成"展示真实队列位 + ETA + 可取消"。

---

## 必读上下文（顺序读）

1. **`CLAUDE.md`**（项目根）——技术栈、三端一统流程、禁区
2. **`.claude/memory/feedback.md`**——历次教训规则
3. **本目录 `planner-spec.md`**——**完整规格、代码 diff 指引、验收标准**
4. **`PRODUCT.md`**（v0.64.2 条目往上回看 v0.64 / v0.64.1 / v0.64.2）——理解为什么走到今天
5. **上一轮 transcript** 路径：`C:\Users\wei.liu\.cursor\projects\c-Users-wei-liu-Desktop-cursor-try-QAS/agent-transcripts/f53cad3a-7317-4816-9577-b3dfd86e93e9/f53cad3a-7317-4816-9577-b3dfd86e93e9.jsonl`

---

## 本轮涉及的核心源码（修改清单）

**后端**（`h5-video-tool-api/src/`）：
- `services/batchJobsQueue.ts`（现存，**大改**：cancelJob 升级、pollSingleJob race-safe、MAX_CONCURRENT 从环境变量读）
- `services/dreaminaScheduler.ts`（**新增**：全平台 FIFO 调度器核心）
- `services/queueSnapshot.ts`（**新增**：计算 globalQueuePos/etaSec + SSE 广播）
- `services/productionWriteback.ts`（如果不存在则从 batchJobsQueue.ts 抽出 writeBackToProject / writeBackFailedToProject，新增 writeBackCancelledToProject）
- `routes/batchJobs.ts`（**扩展**：新增 `POST /enqueue`，`DELETE /:id` 返回 CancelResult，`DELETE /project/:projectId` 支持 shotIndexes 过滤，SSE stream 追加 queue-snapshot 事件类型）

**前端**（`h5-video-tool/src/`）：
- `pages/ProductionWizard.tsx`（**大改**：删 dreaminaQueueRef + waitForAnyJobCompletion + 1310 重试，`generateVideoForShotIdx` 简化为一次 enqueue 调用）
- `api/batchJobs.ts`（扩展 BatchJobDto 增加字段；新增 `enqueueProductionShot`）
- `hooks/useGlobalJobs.ts`（订阅 queue-snapshot 事件类型）
- `studio/steps/StepStoryboardShotStrip.tsx`（五态徽标 + 已取消态 + 悬浮 X 按钮）
- `studio/steps/StepStoryboardWorkspace.tsx`（顶部全平台状态条 + 批量取消按钮透传）
- `studio/steps/StepStoryboardGenerateActions.tsx`（"取消排队 / 放弃生成"按钮 + confirm dialog）
- `studio/productionTypes.ts`（ProductionShot.lastVideoError 加 `cancelled?: boolean`）

**禁止修改**（CLAUDE.md 禁区）：
- `services/dreaminaVideo.ts`（除非严格必要——本轮**不需要动**，现有 pollDreaminaTask 够用）
- `services/veoPython.ts` / `studioPipeline.ts` / `klingVideo.ts` / `types/productionTypes.ts`
- `.env` 真实密钥

---

## 本轮预计产出

| 产物 | 位置 |
|---|---|
| planner-spec.md | 本目录（已由上一轮对话产出，本轮只需 Builder 实施） |
| builder-report.md | 本目录（Builder 完成后写） |
| verifier-report.md + eval-result.json | 本目录（Verifier 六类验证后写） |
| release-decision.md | 本目录（GO/NO-GO） |
| 代码变更 | 上述修改清单 |
| `PRODUCT.md` v0.65 条目 | 项目根 |
| 部署脚本 `_deploy_v065.py` | 项目根（参考 `_deploy_v064_2.py` 结构） |

---

## 环境与部署约束

- 服务器：`43.134.186.196` / `ubuntu` / 密码在 `h5-video-tool-api/.env` 的 `SERVER_PASSWORD`
- 服务器目录：`/home/ubuntu/qas-h5/{api,frontend}/`
- pm2 进程名：`qas-api`
- 部署工具：**paramiko Python 脚本**，不用 sshpass/plink
- 部署五步：tsc check → PRODUCT.md 更新 → git push → npm run build → SFTP 上传 + pm2 restart

---

## 已知约束（不要浪费时间探索）

1. **Dreamina CLI 没有 cancel / abort / kill 命令**——已 `dreamina -h` 确认。取消晚期任务只能本地标 cancelled 丢弃结果，积分会被扣掉。
2. **即梦账号全平台共享**，并发默认 1（`DREAMINA_MAX_CONCURRENT` 环境变量可调）。所有用户争抢同一槽位。
3. **SSE 按 username 过滤**（`routes/batchJobs.ts` L176）——这是隐私要求，不能改。但可以新增不含敏感字段的 `queue-snapshot` 广播事件，跨用户推送。
4. **v0.64.2 已修完 recovery effect 的坑**——别退回到"pending shot 强行标 shotBusyMap='video'"的老做法。
5. **前端本地 dreaminaQueueRef + waitForAnyJobCompletion 在多用户场景是失效的**（跨用户 SSE 看不到），这也是本轮必删的主要原因。

---

## 交接给 Builder 的一句话

> 读完本目录的 `planner-spec.md`，按 Gate 2 产出 `builder-report.md`。实施顺序：**后端调度器 → 后端取消升级 → 前端 enqueue 迁移 → 前端徽标五态 → 前端取消 UI → 队列广播 + 状态条 → PRODUCT.md → 三端一统部署**。每完成一步在 todo 里打勾，不要跳步。
