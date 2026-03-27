# Volcengine Seedance 1.5 Pro API Reference — Game Director Video Skill

> Provider: **火山引擎 Ark（字节跳动）**
> API Key env var: `SEEDANCE_API_KEY`
> Docs: https://www.volcengine.com/docs/82379/1399008

---

## Endpoints

| Action        | Method | URL |
|---------------|--------|-----|
| Submit task   | POST   | `https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks` |
| Query status  | GET    | `https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{task_id}` |

## Authentication

```
Authorization: Bearer <API_KEY>
```

---

## Submit Request Body

```json
{
  "model": "doubao-seedance-1-5-pro-251215",
  "content": [
    {
      "type": "text",
      "text": "无人机穿越峡谷，极速飞行，震撼视角  --duration 5 --camerafixed false --watermark false"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://your-asset-server.com/screenshot.png"
      }
    }
  ]
}
```

### Parameters

| Field | Required | Description |
|-------|----------|-------------|
| `model` | ✅ | 固定值：`doubao-seedance-1-5-pro-251215` |
| `content[].type = "text"` | ✅ | 包含 prompt 和内联参数标志 |
| `content[].type = "image_url"` | 图生视频时必须 | 源图片 URL（图生视频模式） |

### Inline Flags（写在 prompt 末尾）

| Flag | 示例 | 说明 |
|------|------|------|
| `--duration <秒>` | `--duration 5` | 视频时长，支持 5 / 10 |
| `--camerafixed <bool>` | `--camerafixed false` | 固定摄像机位置（false = 允许运动） |
| `--watermark <bool>` | `--watermark false` | 是否添加水印 |

---

## Submit Response (202)

```json
{
  "id": "task_abc123456",
  "status": "queued",
  "model": "doubao-seedance-1-5-pro-251215",
  "created_at": 1710000000
}
```

---

## Poll Response (GET)

| `status` 值 | 含义 |
|------------|------|
| `queued`   | 排队中 |
| `running`  | 生成中 |
| `succeeded`| 完成 ✅ |
| `failed`   | 失败 ❌ |

```json
{
  "id": "task_abc123456",
  "status": "succeeded",
  "content": [
    {
      "type": "video_url",
      "video_url": {
        "url": "https://cdn.volcengine.com/output/video.mp4"
      }
    }
  ]
}
```

视频 URL 在 `content[]` 数组中，找 `type == "video_url"` 的条目。

---

## 模型信息

| 项目 | 值 |
|------|-----|
| **模型名称** | `doubao-seedance-1-5-pro-251215` |
| **最大时长** | 10 秒 |
| **支持模式** | 文生视频（T2V）/ 图生视频（I2V） |
| **推荐语言** | 中文 / 英文均支持 |
| **宽高比** | 通过 prompt 描述或模型默认处理 |

---

## cURL 完整示例

**图生视频：**
```bash
curl -X POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 1dd1ee9f-3b7e-4800-8541-d9ff6db58e08" \
  -d '{
    "model": "doubao-seedance-1-5-pro-251215",
    "content": [
      {
        "type": "text",
        "text": "Epic game trailer shot, hero reveals sword, cinematic lighting  --duration 5 --camerafixed false --watermark false"
      },
      {
        "type": "image_url",
        "image_url": { "url": "https://your-server.com/game-screenshot.png" }
      }
    ]
  }'
```

**文生视频：**
```bash
curl -X POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 1dd1ee9f-3b7e-4800-8541-d9ff6db58e08" \
  -d '{
    "model": "doubao-seedance-1-5-pro-251215",
    "content": [
      {
        "type": "text",
        "text": "Epic game trailer, medieval battlefield, hero charges through fire, cinematic, 4K  --duration 5 --camerafixed false --watermark false"
      }
    ]
  }'
```

---

## 即梦 / Seedance 安全提示词约定

所有通过本 API 提交的 `content[].text` 提示词须符合技能安全红线：

- 禁止真人、血腥恐怖、色情低俗、具体版权 IP。
- 中文提示词须包含：`【原创数字艺术作品】` + 画面描述 + `，适合全年龄段观看，无版权争议，无敏感元素`。
- 英文提示词须包含：`Original digital artwork,` + 描述 + `, family-friendly, no copyright issues, no sensitive content.`

详见技能内 `references/rules_and_formulas.md` 替换词表。

---

## Error Codes

| HTTP | 含义 | 处理 |
|------|------|------|
| 400  | 参数错误 | 检查 content 格式 |
| 401  | API Key 无效 | 检查 `SEEDANCE_API_KEY` |
| 429  | 请求过频 | 等待后重试 |
| 500  | 服务端错误 | 30s 后重试 |
