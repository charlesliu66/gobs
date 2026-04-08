# SeaTalk Event Callback（事件回调）配置步骤

## 1. 部署公开 HTTPS 地址

回调必须是 **公网可访问的 HTTPS**，例如：

```text
https://你的域名/api/seatalk/callback
```

本地 `localhost` **无法**通过 SeaTalk 的 URL 验证，请使用 **Vercel 生产域名**（或已备案的其它域名）部署本项目后再配置。

---

## 2. 在 SeaTalk Open Platform 里填写

1. 打开 [SeaTalk Open Platform](https://open.seatalk.io/) → 你的应用  
2. 左侧 **Event Callback**  
3. **Callback URL** 填：`https://你的域名/api/seatalk/callback`  
4. 点击 **Save**，会触发 **URL 验证**（见下）

---

## 3. 环境变量（Signing Secret）

1. 同一页会显示 **Signing Secret**（可重置）  
2. 在 **`web/.env.local`** 与 **Vercel 环境变量** 中添加：

   ```env
   SEATALK_SIGNING_SECRET=你的Signing_Secret
   ```

3. 保存后 **重新部署** 再点 SeaTalk 保存 URL（否则校验签名会失败）

---

## 4. 验证成功时会发生什么

SeaTalk 会 POST 一个 `event_type: "event_verification"` 的请求，body 里带：

```json
"event": { "seatalk_challenge": "随机字符串" }
```

本项目的 `POST /api/seatalk/callback` 会：

- 在 **5 秒内** 返回 HTTP **200**  
- Body 为：`{"seatalk_challenge":"与请求相同的值"}`  

（若配置了 `SEATALK_SIGNING_SECRET` 且请求带 `Signature` 头，会先校验签名。）

---

## 5. 验证通过后

- 控制台会显示 URL 已配置，下方可看到 **Events**  
- 之后 SeaTalk 会向同一 URL 推送各类事件（如机器人入群等）

**获取 `group_id`**：把机器人拉进目标群后，若收到 `bot_added_to_group_chat`，可在 **Vercel → Logs** 里搜 `seatalk-callback`，日志里会打印 `group_id`，复制到 `SEATALK_GROUP_ID`。

---

## 6. 常见问题

| 现象 | 处理 |
|------|------|
| **Verification failed** / **invalid/incorrect response** | 多为：① 配置了 `SEATALK_SIGNING_SECRET` 但签名与平台不一致，服务端曾返回 **401**；本项目已对 **`event_verification` 跳过签名校验**，只回显 `seatalk_challenge`。② 仍失败则检查：URL 是否 **HTTPS**、公网可达、**5 秒内** 返回 **200**、body 为 `{"seatalk_challenge":"..."}`。 |
| 验证失败 | 域名是否 HTTPS、能否从公网访问；环境变量是否已部署；5 秒内是否返回 200 |
| 401 invalid signature | **仅发生在非验证类事件**；核对 `SEATALK_SIGNING_SECRET` 与控制台是否一致；是否已 Redeploy |
| 本地调不通 | 回调必须部署在公网，不能用 localhost |

---

## 7. 相关代码

- `web/app/api/seatalk/callback/route.ts` — 回调处理（验证 + 签名 + 入群日志）
