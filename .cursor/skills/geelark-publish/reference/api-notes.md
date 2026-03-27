# GeeLark API 集成说明

本 skill 的脚本需调用 GeeLark API 完成视频上传与发布。

## API 文档地址

- **中文**：https://open.geelark.cn/api
- **云手机请求说明**：https://open.geelark.cn/api/cloud-phone-request-instructions
- **英文**：https://open.geelark.com/api

---

## 接口调用说明

### 请求规范

- **方法**：所有接口均使用 **POST**
- **请求体**：JSON 格式，设置 `Content-Type: application/json`
- **频率限制**：200 次/分钟，24000 次/小时

### 验证方式（二选一）

#### 方式一：Token 验证

| 请求头 | 说明 |
|--------|------|
| traceId | Version 4 UUID |
| Authorization | Bearer &lt;token&gt; |

#### 方式二：Key 验证

| 请求头 | 说明 |
|--------|------|
| appId | 团队 AppId |
| traceId | Version 4 UUID |
| ts | 毫秒级时间戳 |
| nonce | traceId 的前 6 位 |
| sign | SHA256(appId + traceId + ts + nonce + ApiKey)，十六进制大写 |

**sign 示例**：拼接字符串 `appId + traceId + ts + nonce + ApiKey`，对拼接结果做 SHA256，输出十六进制大写。

### 响应格式

- 状态码 200，响应体为 JSON
- 字段：`traceId`、`code`、`msg`、`data`
- `code === 0` 表示成功，其它为失败

### 验证方式说明

- **Token 验证**：你的 API Key 若作为 Bearer token 使用，直接设置 `Authorization: Bearer <API_KEY>` 即可。脚本默认采用此方式。
- **Key 验证**：若 GeeLark 要求使用 appId + sign，则需设置环境变量 `GEELARK_APP_ID`（团队 AppId，在 GeeLark 开放平台「团队管理」或「应用管理」中获取）。脚本会在检测到 `GEELARK_APP_ID` 时自动使用 sign 验证。遇到 40003 签名校验失败时，可尝试 Key 验证。

### 全局错误码

| code | 说明 |
|------|------|
| 0 | 成功 |
| 40002 | traceId 不能为空 |
| 40003 | 签名校验失败 |
| 40004 | 请求参数校验失败 |
| 40005 | 请求的资源不存在 |
| 40007 | 请求过于频繁（1 分钟后解除） |
| 41001 | 余额不足 |
| ... | 详见官方文档 |

---

---

## task/add - 添加视频/图集/养号任务

### 接口说明

- 创建**发视频**任务：需先将素材上传，再调用本接口
- 创建**发图集**任务：同上
- 创建**养号**任务：可直接调用

### 请求 URL

```
https://openapi.geelark.cn/open/v1/task/add
```

### 请求方法

POST

### 请求参数（顶级）

| 参数名   | 必选 | 类型    | 说明                                  |
|----------|------|---------|---------------------------------------|
| planName | 否   | string  | 任务计划名称，不传则自动生成           |
| remark   | 否   | string  | 备注，最多 200 字                     |
| taskType | 是   | integer | 1=发布视频，2=懒人养号，3=发布图集   |
| list     | 是   | array   | 任务参数数组，一次最多 100 个         |

### 发布视频任务参数（taskType=1，list 中每项）

| 参数名           | 必选 | 类型    | 说明                                                |
|------------------|------|---------|-----------------------------------------------------|
| scheduleAt       | 是   | integer | 计划时间，秒级时间戳。小于当前时间则按当前时间计算   |
| envId            | 是   | string  | 云手机 id                                           |
| video            | 是   | string  | 视频 url，需先上传（见 upload-getUrl）              |
| videoDesc        | 否   | string  | 视频文案，最多 4000 字符                            |
| cover            | 否   | string  | 封面 url                                            |
| maxTryTimes      | 否   | integer | 最大重试次数，0-3，默认 3                           |
| timeoutMin       | 否   | integer | 超时分钟，30-80，默认 80                            |
| productId        | 否   | string  | 商品 id                                             |
| productTitle     | 否   | string  | 商品展示标题                                        |
| refVideoId       | 否   | string  | 同款视频 id                                         |
| markAI           | 否   | bool    | 是否打 AI 生成标签，默认 false                       |
| needShareLink    | 否   | bool    | 是否需要分享链接，默认 false                         |
| sameVideoVolume  | 否   | integer | 同款视频音量，0-100                                  |
| sourceVideoVolume| 否   | integer | 原视频音量，0-100                                    |

### 懒人养号任务参数（taskType=2，list 中每项）

| 参数名     | 必选 | 类型    | 说明 |
|------------|------|---------|------|
| scheduleAt | 是   | integer | 计划时间，秒级时间戳 |
| envId      | 是   | string  | 云手机 id |
| action     | 是   | string  | `search profile` 搜索个人主页 / `search video` 搜索短视频 / `browse video` 随机浏览视频 |
| keywords   | 否   | array[string] | 搜索关键词，搜索行为时必填，浏览行为时可选 |
| duration   | 是   | integer | 浏览时长，分钟数 |

### 发布图集任务参数（taskType=3，list 中每项）

| 参数名       | 必选 | 类型    | 说明 |
|--------------|------|---------|------|
| scheduleAt   | 是   | integer | 计划时间，秒级时间戳 |
| envId        | 是   | string  | 云手机 id |
| images       | 是   | array[string] | 图片 url 数组 |
| videoDesc    | 否   | string  | 视频文案，最多 4000 字符 |
| videoId      | 否   | string  | 同款视频 ID |
| videoTitle   | 否   | string  | 图集标题，最多 90 字符 |
| maxTryTimes  | 否   | integer | 最大重试 0-3，默认 3 |
| timeoutMin   | 否   | integer | 超时 30-80 分钟，默认 80 |
| sameVideoVolume | 否 | integer | 同款视频音量 0-100 |
| markAI       | 否   | bool    | 是否打 AI 标签，默认 false |
| needShareLink| 否   | bool    | 是否需要分享链接，默认 false |

### 响应

```json
{
  "traceId": "...",
  "code": 0,
  "msg": "success",
  "data": {
    "taskIds": ["123456ABCEDF"]
  }
}
```

### 接口错误码

| 错误码 | 说明                         |
|--------|------------------------------|
| 41000  | 任务积分不足                 |
| 41001  | 余额不足                     |
| 43004  | 云手机已过期                 |
| 43018  | 包月云手机没有绑定包月设备   |
| 48004  | 任务所需 app 不满足条件      |

---

## 任务管理 API（openapi.geelark.cn/open/v1/task）

以下接口均使用 POST，需 `traceId` + `Authorization: Bearer <token>`。

### 任务状态 status

| 值 | 说明 |
|----|------|
| 1 | 等待执行 |
| 2 | 执行中 |
| 3 | 任务完成 |
| 4 | 任务失败 |
| 7 | 任务取消 |

### 任务类型 taskType

| 值 | 说明 |
|----|------|
| 1 | TikTok 发布视频 |
| 2 | TikTok AI 养号 |
| 3 | TikTok 发布图集 |
| 4 | TikTok 登录账号 |
| 6 | TikTok 编辑资料 |
| 42 | 自定义任务（Facebook、YouTube 等） |

### 1. 查询任务

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/task/query` |
| 参数 | ids(是, array[string], 最多 100 个任务 id) |
| 响应 | data.total, data.items[]（Task 数组，含 shareLink） |

### 2. 批量查询任务（7 天内）

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/task/historyRecords` |
| 参数 | size(否, 每页条数, 最大 100), lastId(否), ids(否, 最多 100 个) |
| 响应 | data.total, data.items[] |

### 3. 取消任务

仅在**等待执行(1)**、**执行中(2)** 时可取消。

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/task/cancel` |
| 参数 | ids(是, array[string], 最多 100 个) |
| 响应 | data.totalAmount, successAmount, failAmount, failDetails[] |

**单个任务错误码**：48001 任务状态不允许取消

### 4. 重试任务

仅在**任务失败(4)**、**任务取消(7)** 时可重试。一个任务最多重试 5 次。

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/task/restart` |
| 参数 | ids(是, array[string]) |
| 响应 | 同取消任务 |

**单个任务错误码**：40005 环境已删除, 48000 重试次数已达上限, 48001 状态不允许, 48002 任务不存在, 48003 任务资源已过期

### 5. 查询任务详情

支持日志分页：首次不传 searchAfter；若 logContinue 为 true，将响应的 searchAfter 作为下次请求参数。

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/task/detail` |
| 参数 | id(是), searchAfter(否, 日志分页) |
| 响应 | id, planName, taskType, serialName, envId, scheduleAt, status, failCode, failDesc, cost, resultImages[], logs[], searchAfter, logContinue |

### Task 对象字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 任务 id |
| planName | string | 任务计划名称 |
| taskType | integer | 任务类型 |
| serialName | string | 云手机名 |
| envId | string | 云手机 id |
| scheduleAt | integer | 计划时间（秒级时间戳） |
| status | integer | 任务状态 |
| failCode | integer | 失败代码 |
| failDesc | string | 失败原因 |
| cost | integer | 执行耗时（秒） |
| shareLink | string | 分享链接（仅 query 返回） |

### 任务失败代码（部分）

| 代码 | 说明 |
|------|------|
| 20002 | 机器正在执行其他任务 |
| 20003 | 执行超时 |
| 20005/20006 | 任务已取消 |
| 20100/20108 | 无网络连接 |
| 20129 | 设备离线 |
| 20130 | 账号密码错误 |
| 20136/20137 | 账号被封 |
| 20200-20266 | 视频上传/发布相关失败 |
| 20300-20340 | 注册/验证相关失败 |
| 29997 | 余额不足 |
| 29998 | 云手机已删除 |
| 29999 | 未知错误 |

完整失败代码列表见 GeeLark 官方文档。

---

## TikTok API（openapi.geelark.cn）

以下接口均使用 POST，请求体 JSON，需 `traceId` + `Authorization: Bearer <token>`。响应格式统一：`{ code, msg, data: { taskId } }`。

### 1. TikTok 登录账号

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/tiktokLogin` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是-云手机id), account(是,最多64字), password(是,最多64字) |

### 2. TikTok 编辑资料

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/tiktokEdit` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是), avatar(否-头像url,1:1), nickName(否,最多30字), bio(否,最多160字), site(否-http/https链接) |

### 3. TikTok 随机点赞

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/tiktokRandomStar` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是), likeProbability(否,0-100,默认30) |

### 4. TikTok 随机点赞-亚洲

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/tiktokRandomStarAsia` |
| 参数 | 同上 tiktokRandomStar |

### 5. TikTok AI 随机评论

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/tiktokRandomComment` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是), useAi(是: 1=AI仅pro, 2=自传), comment(是,最多500字,useAi=2时必传), links(否), commentProbability(否,0-100,默认30) |

### 6. TikTok AI 随机评论-亚洲

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/tiktokRandomCommentAsia` |
| 参数 | 同上 tiktokRandomComment |

### 7. TikTok 发送私信

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/tiktokMessage` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是), usernames(是,[]string), content(是,最多6000字) |

### 8. TikTok 发送私信-亚洲

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/tiktokMessageAsia` |
| 参数 | 同上 tiktokMessage |

---

## Facebook API（openapi.geelark.cn）

以下接口均使用 POST，请求体 JSON，需 `traceId` + `Authorization: Bearer <token>`。响应格式统一：`{ code, msg, data: { taskId } }`。

### 1. Facebook 自动登录

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/faceBookLogin` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是-云手机id), email(是), password(是) |

### 2. Facebook 发布内容（多视频）

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/faceBookPublish` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是-云手机id), title(是,最多200字), video(是,[]string,最多10个视频URL) |

### 3. Facebook 发布 Reels 视频

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/faceBookPubReels` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是-云手机id), description(是,最多500字), video(是,单个视频URL) |

### 4. Facebook 自动评论

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/faceBookAutoComment` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是), postAddress(是), comment(是,[]string,最多10个), keyword(是,[]string,最多10个) |

### 5. Facebook 养号

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/faceBookActiveAccount` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是), browsePostsNum(是,1-100), keyword(是,[]string,最多10个) |

> 注：请求示例中有 postAddress，参数表未列，可按需传入。

### 6. Facebook 发送私信

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/faceBookMessage` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是), usernames(是,[]string), content(是,最多20000字) |

---

## YouTube API（openapi.geelark.cn）

以下接口均使用 POST，请求体 JSON，需 `traceId` + `Authorization: Bearer <token>`。响应格式统一：`{ code, msg, data: { taskId } }`。

### 1. YouTube 发布 Short

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/youtubePubShort` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是-云手机id), title(是,最多100字), video(是-视频URL), sameStyleUrl(否-同款URL,最多500字), sameStyleVoice(是,0-100,不传同款时传0), originalVoice(是,0-100,不传同款时传0) |

### 2. YouTube 发布 Video

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/youtubePubVideo` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是), title(是,最多100字), description(是,最多5000字), video(是-视频URL) |

### 3. YouTube 养号

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/youTubeActiveAccount` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是), browseVideoNum(是,1-100), keyword(是,[]string,最多10个,每个最多150字) |

> 注：请求示例中有 postAddress，参数表未列，可按需传入。

---

## Instagram API（openapi.geelark.cn）

以下接口均使用 POST，请求体 JSON，需 `traceId` + `Authorization: Bearer <token>`。响应格式统一：`{ code, msg, data: { taskId } }`。

### 1. Instagram 发布 Reels 视频

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/instagramPubReels` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是-云手机id), description(是,最多2200字), video(是,[]string,最多10个视频URL), sameStyleUrl(否), sameStyleVoice(否,0-100), originalVoice(否,0-100), aiTag(否,默认false) |

### 2. Instagram 发布 Reels 图集

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/instagramPubReelsImages` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是), description(是,最多2200字), image(是,[]string,最多10个图片URL), sameStyleUrl(否), aiTag(否,默认false), publishPost(否,默认false) |

### 3. Instagram 自动登录

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/instagramLogin` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是), account(是,最多64字), password(是,最多64字) |

### 4. Instagram AI 养号

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/instagramWarmup` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是), browseVideo(否,1-100), keyword(否) |

### 5. Instagram 发送私信

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/instagramMessage` |
| 参数 | name(否), remark(否), scheduleAt(是), id(是), usernames(是,[]string), content(是,最多1000字) |

---

## 云手机管理 API（openapi.geelark.cn/open/v1/phone）

以下接口均使用 POST，需 `traceId` + `Authorization: Bearer <token>`。

### 1. 获取云手机列表 ⭐（发布时选 envId 必备）

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/phone/list` |
| 参数 | page(否), pageSize(否,最大100), ids(否), serialName(否), remark(否), groupName(否), tags(否), chargeMode(否), openStatus(否), proxyIds(否), serialNos(否) |
| 响应 | data.total, data.page, data.pageSize, data.items[] |

**Phone 对象**：id, serialName, serialNo, group, remark, status, tags, equipmentInfo, proxy, chargeMode, monthlyExpire, rpaStatus

**status**：0 已启动，1 启动中，2 已关机

### 2. 新建云手机 V2

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/phone/addNew` |
| 参数 | mobileType(是,Android 9-15), chargeMode(否), region(否,cn/sgp), data(是,EnvRowApi[],最多100) |
| EnvRowApi | profileName(是), proxyInformation(否), proxyNumber(否), dynamicProxy(否), mobileRegion(否), surfaceBrandName(否), surfaceModelName(否) 等 |

先调 brand/list 获取机型。

### 3. 查询云手机状态

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/phone/status` |
| 参数 | ids(是, array[string], 最多100) |
| 响应 | successDetails[{id, serialName, status}], failDetails[]，status: 0 已启动 1 启动中 2 已关闭 3 已过期 |

### 4. 启动云手机

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/phone/start` |
| 参数 | ids(是), width(否), center(否), energySavingMode(否) |
| 响应 | successDetails[{id, url, chargingMethod}] |

### 5. 关闭云手机

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/phone/stop` |
| 参数 | ids(是) |

### 6. 删除云手机

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/phone/delete` |
| 参数 | ids(是, 最多100) |

### 7. 修改云手机信息

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/phone/detail/update` |
| 参数 | id(是), name(否), remark(否), groupID(否), tagIDs(否), proxyConfig(否), proxyId(否), chargeMode(否), phoneNumber(否) |

### 8. 获取云手机 GPS / 设置云手机 GPS

| 项目 | 值 |
|------|-----|
| 获取 | `POST /open/v1/phone/gps/get`，ids(是) |
| 设置 | `POST /open/v1/phone/gps/set`，list[{id, latitude, longitude}](是) |

### 9. 云手机品牌列表（新建前获取机型）

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/phone/brand/list` |
| 参数 | androidVer(是, 10-15) |
| 响应 | data[{surfaceBrandName, surfaceModelName}] |

### 10. 其他接口（简要）

| 接口 | URL | 用途 |
|------|-----|------|
| 一键新机V2 | `/open/v2/phone/newOne` | 随机设备信息 |
| 截图 | `/open/v1/phone/screenShot` | 截图云手机画面 |
| 截图结果 | `/open/v1/phone/screenShot/result` | 查询截图任务 |
| 设置ROOT | `/open/v1/root/setStatus` | 开/关 ROOT |
| 获取设备ID | `/open/v1/phone/serialNum/get` | 获取 serialNum |
| 发送短信 | `/open/v1/phone/sendSms` | 模拟收短信 |
| 转让 | `/open/v1/phone/transfer` | 转让给其他账号 |
| 设置联网方式 | `/open/v1/phone/net/set` | Wi-Fi/移动网络 |
| 应用隐藏辅助 | `/open/v1/phone/hideAccessibility` | 隐藏辅助服务 |
| 移动分组 | `/open/v1/phone/moveGroup` | envIds + groupId |
| 批量导入联系人 | `/open/v1/phone/importContacts` | 导入联系人 |
| 导入结果 | `/open/v1/phone/importContactsResult` | 查导入任务状态 |

### 常见错误码

| 错误码 | 说明 |
|--------|------|
| 42001 | 云手机不存在 |
| 42002 | 云手机不在运行状态 |
| 43004 | 云手机已过期 |
| 43005 | 云手机正在执行任务 |
| 43006 | 云手机正在被远程连接 |
| 43009 | 云手机已启动，无法删除 |
| 44001 | 无法批量创建，请升级 pro |
| 44002 | 创建数达到套餐最大值 |

---

## 上传临时文件（upload/getUrl）— 本地视频上传必备

**两步流程**：1）获取 uploadUrl；2）PUT 上传文件到 uploadUrl，得到 resourceUrl 供发布使用。

### Step 1：获取上传地址

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/upload/getUrl` |
| 方法 | POST |
| 参数 | fileType(是, string)：mp4/avi/mkv/mov/wmv/flv/webm/mpeg/mpg/3gp，或 jpg/png/gif/bmp/tiff/webp/svg/heif/heic，或 apk/xapk/xml/mp3 |
| 响应 | uploadUrl(30 分钟有效), resourceUrl(资源访问 URL，约 30 天有效) |

### Step 2：PUT 上传到 uploadUrl

| 项目 | 值 |
|------|-----|
| 方法 | **PUT**（非 POST） |
| Body | 文件二进制流 |
| 注意 | 不要传多余 Header，否则可能失败 |
| 示例 | `curl -X PUT --upload-file ./video.mp4 "uploadUrl"` |

### 使用 resourceUrl

上传成功后，用 `resourceUrl` 作为 `task/add` 的 video、cover、images，或 `multiPlatformVideoDistribution` 的 video 数组元素。

---

## 多渠道分发视频（multiPlatformVideoDistribution）

一次分发到 **TikTok + Instagram Reels + YouTube Shorts**。

| 项目 | 值 |
|------|-----|
| URL | `https://openapi.geelark.cn/open/v1/rpa/task/multiPlatformVideoDistribution` |
| 方法 | POST |
| 参数 | name(否), remark(否), scheduleAt(是), id(是-云手机id), title(是,最多100字), video(是,[]string,最多10个视频URL) |
| 响应 | data.taskId |

**建议**：用户选择多平台时，优先使用本接口，比分别调 TikTok/INS/YT 更简单。

---

## 素材中心（可选）

| 接口 | URL | 用途 |
|------|-----|------|
| 添加素材 | `/open/v1/material/create` | 用 resourceUrl 入库，可选 tagsId、fileName |
| 查询素材 | `/open/v1/material/search` | 按 fileName、tagsId、ids、fileType 筛选 |

错误码 60003：非 GeeLark 上传链接；60004：格式不支持。

---

## 上传流程（汇总）

发视频/图集前需先上传素材。流程：`upload/getUrl` → PUT 上传 → 获得 resourceUrl → 调用 task/add 或 multiPlatformVideoDistribution。
