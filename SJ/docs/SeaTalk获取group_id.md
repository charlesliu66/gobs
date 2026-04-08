# 为什么接好了 Get Group Info，还是拿不到「机器人所在群」的 ID？

> **若你只想收通知到本人单聊**：配置 `SEATALK_EMPLOYEE_CODE` 即可，**不需要** `SEATALK_GROUP_ID`，可跳过本文档里与「群」相关的内容。

## 核心限制（官方 API 设计）

`GET /messaging/v2/group_chat/info?group_id=xxx` **必须先传入 `group_id`**，返回的是**该群**的详情。

也就是说：**没有「不传 group_id 就列出机器人加入的所有群」这一层接口**（至少不在你当前用的 Get Group Info 文档里）。  
所以代码**无法**仅凭 App ID / Secret 自动算出 `SEATALK_GROUP_ID`，需要你从别处拿到一次 `group_id`，再写进环境变量。

---

## 你可以从哪里拿到 `group_id`？

### ⚠️ 群邀请链接里的不是 `group_id`

形如 `https://link.seatalk.io/group/open?invite_id=xxxx` 中的 **`invite_id` 是邀请令牌**，用于通过链接进群，**一般不能**当作 Open API 里的 **`group_id`** 填进 `SEATALK_GROUP_ID`。  
若把 `invite_id` 当 `group_id` 用，发消息或 Get Group Info 往往会失败。请用下面几种方式拿真正的 **`group_id`**。

任选其一即可：

### 1. SeaTalk 客户端 / 管理后台

- 打开目标**群** → 群资料 / 群设置里，部分版本会展示 **群 ID** 或开发者信息（以你司 SeaTalk 实际界面为准）。

### 2. 开放平台「事件回调」Webhook（推荐，和 Bot 强相关）

**完整步骤**见 `docs/SeaTalk事件回调配置.md`（Callback URL、Signing Secret、Vercel 部署）。

在 SeaTalk Open Platform 配置 **Event Callback URL**（例如 `https://你的域名/api/seatalk/callback`）后，当发生例如：

- `bot_added_to_group_chat`（机器人被拉进群）

等平台推送到你服务器的 **JSON 里通常会带 `group_id` / `group` 对象**。  
把其中 **`group_id` 复制下来**，填到环境变量 `SEATALK_GROUP_ID`。

这是**和 Bot 绑定最直接**的方式。

### 3. 若你们用「创建群」等接口

若曾调用 **Create Group Chat**，响应里一般会带 **`group_id`**，可直接使用。

---

## 填好后怎么自测？

1. 在 `web/.env.local`（及 Vercel）设置：

   ```env
   SEATALK_GROUP_ID=你拿到的群ID
   ```

2. 浏览器访问（把域名和 `group_id` 换成你的）：

   ```text
   https://你的域名/api/seatalk/group-info?group_id=你的群ID
   ```

   - 若返回 `code: 0` 且带 `group.group_name`，说明 **ID 正确且机器人有权访问该群**。
   - 若报错 `7001` 等，多为 **机器人未在该群内** 或 **无权限**。

3. 再访问 `/api/seatalk/status`，确认 `ready: true`。

---

## 小结

| 问题 | 说明 |
|------|------|
| Get Group Info 能自动发现群 ID 吗？ | **不能**，必须先有 `group_id`。 |
| 和「已接 group API」矛盾吗？ | 不矛盾：那是「**已知** group_id → 查详情」；不是「枚举所有群」。 |
| 最稳的拿法 | 事件回调里的 `bot_added_to_group_chat` 等 payload，或客户端/后台展示的群 ID。 |

把 `SEATALK_GROUP_ID` 填上并部署后，发消息到群才会成功。
