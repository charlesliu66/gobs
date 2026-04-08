# SeaTalk 任务通知说明

## 是否「打通」？

| 事件 | SeaTalk 是否推送 | 说明 |
|------|------------------|------|
| **新增任务**（提交成功） | ✅ | 批量评论 `/api/schedule`、养号/关注/批量登录等创建任务成功时推送 |
| **任务启动**（进入进行中） | ✅ | 由定时任务 `/api/cron/task-seatalk-sync` 轮询 GeeLark，发现状态变为「进行中(2)」时推送 |
| **任务终止**（用户取消） | ✅ | 调用 `/api/tasks/cancel` 成功时推送 |
| **任务完成** | ✅ | 轮询发现状态变为「已完成(3)」或「失败(4)」时推送 |
| **已取消(7)** | ⚠️ 仅本站取消 | 轮询**不**再推 7，避免与取消接口重复；若任务在 GeeLark 侧被其它方式取消，需依赖后续轮询若状态仍能从 API 读到再考虑扩展 |

## 环境变量（Open API：优先单聊 owner）

- `SEATALK_APP_ID` / `SEATALK_APP_SECRET`
- **`SEATALK_EMPLOYEE_CODE`（推荐）**：你的 employee_code，消息发到与机器人的 **单聊**
- 或 `SEATALK_GROUP_ID`：仅当**未配置** `SEATALK_EMPLOYEE_CODE` 时发到**群**（机器人需在群内）
- 可选：`SEATALK_WEBHOOK_URL`（若用 Webhook 则不走 Open API）

## 定时轮询（任务启动 / 完成 / 失败）

1. 部署后配置 **`CRON_SECRET`**（Vercel 环境变量），与 `vercel.json` 中的 Cron 配合。
2. **Vercel 无持久磁盘**：请配置 **Vercel KV** 或 **Upstash Redis**（二选一）：
   - Vercel KV：`KV_REST_API_URL` + `KV_REST_API_TOKEN`（绑定 Storage 后自动注入）
   - Upstash：`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`  
   否则每次冷启动会丢失「上次状态」，可能重复通知或漏通知。
3. **本地长期运行**（`npm start`）：可使用默认 `web/.data/seatalk-task-state.json`（已 gitignore）。
4. 本地可运行 `npm run setup:env` 生成 `CRON_SECRET` 与 `.env.local` 模板，详见 `docs/全部配置清单.md`。

## 手动触发同步（调试）

```http
GET /api/cron/task-seatalk-sync?secret=你的CRON_SECRET
```

或请求头：`Authorization: Bearer <CRON_SECRET>`

## Cron 频率

默认 `vercel.json` 为每 **2** 分钟一次，可按 Vercel 套餐与需求修改。
