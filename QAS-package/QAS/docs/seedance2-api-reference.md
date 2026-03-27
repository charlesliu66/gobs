# Seedance 2.0 API 参考文档

**适用对象**: H5 视频生成 API 实现、video-pipeline 对接  
**更新日期**: 2025-03-12

---

## 一、服务商与接入方式

| 服务商 | 文档 / 控制台 | 说明 |
|--------|---------------|------|
| **火山引擎（官方）** | [方舟大模型服务平台](https://www.volcengine.com/docs/82379/1520757) | 字节官方，需开通视频生成模型 Endpoint |
| **Evolink / Seedance2API** | [seedance2api.app](https://seedance2api.app/zh/docs/video-generation) | 第三方统一封装，接口格式清晰 |
| **laozhang.ai** | 注册获取 API Key | 项目 .env.example 曾引用 `api.laozhang.ai/v2/generate/text`，具体文档需向服务商索取 |

---

## 二、Evolink / Seedance2API 接口（推荐参考）

### 2.1 创建视频生成任务

```
POST https://api.evolink.ai/v1/videos/generations
```

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### 2.2 请求参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `model` | string | 是 | — | 固定 `seedance-2.0` |
| `prompt` | string | 是 | — | 视频描述（最多 2000 tokens），可用 `@Image1` 等引用素材 |
| `image_urls` | array | 否 | — | 参考图片 URL，最多 9 张，每张 ≤30MB |
| `video_urls` | array | 否 | — | 参考视频 URL，最多 3 个，每段 ≤50MB、2–15 秒 |
| `audio_urls` | array | 否 | — | 参考音频 URL，最多 3 个 |
| `duration` | integer | 否 | `5` | 时长（秒），4–15 任意整数 |
| `quality` | string | 否 | `720p` | 分辨率：`480p`、`720p`、`1080p` |
| `aspect_ratio` | string | 否 | `16:9` | 比例：`16:9`、`9:16`、`1:1`、`4:3`、`3:4`、`21:9`、`adaptive` |
| `generate_audio` | boolean | 否 | `true` | 是否生成同步音频 |
| `callback_url` | string | 否 | — | 任务完成 Webhook URL |

### 2.3 生成模式

| 输入组合 | 模式 |
|----------|------|
| 仅 `prompt` | 文生视频 |
| `prompt` + 1 张图 | 图生视频 |
| `prompt` + 2 张图 | 首尾帧生成 |
| `prompt` + 多图/视频/音频 | 多模态，用 `@Image1`、`@Video1` 等引用 |

### 2.4 响应示例

```json
{
  "id": "task-unified-1761313744-vux2jw0k",
  "object": "video.generation.task",
  "created": 1761313744,
  "model": "seedance-2.0",
  "status": "pending",
  "progress": 0,
  "type": "video",
  "task_info": {
    "can_cancel": true,
    "estimated_time": 165,
    "video_duration": 8
  },
  "usage": {
    "credits_reserved": 12
  }
}
```

`status` 流转：`pending` → `processing` → `completed` 或 `failed`。

### 2.5 查询任务与获取结果

需调用 **查询视频生成任务 API** 轮询 `id`，直至 `status === "completed"`，从响应中取视频 URL。

文档：<https://seedance2api.app/docs/async-tasks>

---

## 三、火山引擎官方 API

- **创建任务**: [创建视频生成任务 API](https://www.volcengine.com/docs/82379/1520757)
- **查询任务**: [查询视频生成任务 API](https://www.volcengine.com/docs/82379/1521309)
- **Base URL 与鉴权**: [Base URL及鉴权](https://www.volcengine.com/docs/82379/1298459)

需在火山方舟控制台开通对应视频模型 Endpoint，并使用其专用 Base URL 与鉴权方式。

---

## 四、与本项目对接要点

### 4.1 与 video-director 输出对齐

video-director 输出的参数建议：

- `duration`：从 prompt 的【时长】或用户意图解析
- `aspect_ratio`：`16:9`（横屏）或 `9:16`（TikTok 竖屏）

H5 后端 `POST /api/video/generate` 应将分镜 prompt 与上述参数一并传给 Seedance API。

### 4.2 素材引用

- **即梦网页 / Seedance 规则**：用 `@图片1`、`@图片2` 引用上传顺序
- **Evolink API**：用 `image_urls` 数组，顺序对应 `@Image1`、`@Image2`；prompt 中可用 `@Image1` 等
- **laozhang.ai**：需按其文档确认图片引用与上传方式

### 4.3 环境变量示例（.env）

```env
# Evolink / Seedance2API
SEEDANCE_API_URL=https://api.evolink.ai/v1/videos/generations
SEEDANCE_API_KEY=your_api_key

# 或火山引擎
# VOLCENGINE_ARK_BASE_URL=...
# VOLCENGINE_ARK_API_KEY=...

# 或 laozhang.ai（若仍使用）
# SEEDANCE_API_URL=https://api.laozhang.ai/v2/generate/text
# SEEDANCE_API_KEY=...
```

---

## 五、相关文档链接

| 文档 | URL |
|------|-----|
| Evolink 视频生成 API | https://seedance2api.app/zh/docs/video-generation |
| Evolink 异步任务与轮询 | https://seedance2api.app/docs/async-tasks |
| Evolink 多模态 @ 引用 | https://seedance2api.app/docs/multimodal-reference |
| Evolink SDK（Python/Node.js） | https://seedance2api.app/docs/sdks |
| 火山引擎 创建任务 | https://www.volcengine.com/docs/82379/1520757 |
| 火山引擎 查询任务 | https://www.volcengine.com/docs/82379/1521309 |
