# 多镜头视频：分镜图先行工作流 - 设计文档

**日期**: 2025-03-13  
**状态**: 待评审  
**前置**: 用户选用 Compass Imagen（与 Veo 共用 COMPASS_API_KEY）

---

## 一、目标与约束

### 1.1 用户期望的工作流

多镜头视频（含 2 个以上镜头）时，采用「分镜图先行」流程：

```
用户输入 prompt
    ↓
1. 生成分镜文案（沿用 promptPolish + 分镜格式）
    ↓
2. 为每个镜头生成分镜图（Compass Imagen）
    ↓
3. 用户确认分镜图
    ↓
4. 按确认的分镜图，逐个生成视频片段（Compass Veo，图生视频）
    ↓
5. 用 ffmpeg 将片段剪辑成成片
```

### 1.2 技术前提

- **分镜图生成**: Compass 代理的 Imagen（与 Veo 共用 `COMPASS_API_KEY`、`COMPASS_API_URL`）
- **视频生成**: 现有 Compass Veo 能力（图生视频）
- **剪辑**: ffmpeg（concat demuxer 或 filter_complex）

---

## 二、Compass 图像生成（已确认）

根据 Compass Capabilities 文档，支持两种图像生成方式，均使用 `COMPASS_API_KEY` + `base_url`：

### 2.1 方案 A：Imagen（推荐用于分镜图）

纯文生图，输出稳定，适合每个镜头一张图：

```python
from google import genai
from google.genai.types import GenerateImagesConfig, HttpOptions

client = genai.Client(
    vertexai=True,
    api_key='<COMPASS_API_KEY>',
    http_options=HttpOptions(
        api_version='v1',
        base_url='https://compass.llm.shopee.io/compass-api/v1',
    )
)

image = client.models.generate_images(
    model="imagen-4.0-generate-preview-06-06",
    prompt="镜头描述：雨夜竹林，浪人挥刀，逆光剪影...",
    config=GenerateImagesConfig(aspect_ratio="16:9"),  # 可选：16:9/9:16/1:1
)
# 获取 base64：image.generated_images[0].image.image_bytes 或 .save(path)
```

- **模型**：`imagen-4.0-generate-preview-06-06`
- **配置**：与 Veo 相同（vertexai=True、api_key、base_url）

### 2.2 方案 B：Gemini 2.5 Flash Image（备选）

通过 `generate_content` 的 `response_modalities=[Modality.IMAGE]` 生成图像，支持图文交织：

```python
response = client.models.generate_content(
    model="gemini-2.5-flash-image",
    contents="Generate an image of...",
    config=GenerateContentConfig(
        response_modalities=[Modality.TEXT, Modality.IMAGE],
        image_config=ImageConfig(aspect_ratio="16:9"),
    ),
)
# 从 response.candidates[0].content.parts 中提取 inline_data（图片）
```

- **适用场景**：若 Imagen 不可用，可降级使用 Gemini 图文模型

### 2.3 选择建议

- **分镜图生成**：优先使用 **Imagen**，输出为单图，解析简单
- **降级**：若 Imagen 模型不可用，则用 **Gemini 2.5 Flash Image**

---

## 三、系统设计

### 3.1 分镜解析

复用 `promptPolish` 输出的分镜格式，解析出镜头列表：

```
[00:00-00:03] 镜头1：悬念（刀刃特写，缓慢推进）。雨滴打在刀刃上...
[00:03-00:06] 镜头2：对峙（全景，固定低角）。雨夜竹林...
[00:06-00:10] 镜头3：交锋与收势...
```

**解析规则**：用正则 `\[(\d{2}:\d{2})-(\d{2}:\d{2})\]\s*镜头\d+[：:]\s*(.+?)。(.+)` 提取每个镜头的起止时间、名称、描述，组装为结构化数据供后续步骤使用。

### 3.2 分镜图生成

| 步骤 | 输入 | 输出 |
|------|------|------|
| 输入 | 镜头描述文本（含景别、运镜、光线、氛围） | — |
| 调用 | `POST` 或 Python `generate_images` | 每镜头 1 张图 |
| 输出 | — | `[{ shotIndex, imageBase64, prompt }]` |

- 每个镜头对应 1 张分镜图
- 可选：加统一风格前缀（如「Cinematic, 8K, 3D 渲染风格」）

### 3.3 用户确认

- **H5 前端**：展示分镜图列表，每张图旁显示镜头名称与时间码，提供「确认 / 修改 / 重绘」操作
- **API**：`POST /api/storyboard/confirm` 接收用户确认后的分镜图（含可重绘的索引与对应新图）

### 3.4 视频生成与剪辑

| 步骤 | 说明 |
|------|------|
| 逐镜头生成 | 对每个确认的分镜图调用 Veo 图生视频，传入该镜头的 prompt + 参考图 |
| 片段时长 | 按时间码分配（如镜头1: 0–3s，镜头2: 3–6s），Veo duration 按片段设置 |
| 剪辑 | ffmpeg `concat demuxer`：`file 'shot1.mp4'`、`file 'shot2.mp4'` … → 成片 |

---

## 四、API 设计

### 4.1 新增接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `POST /api/storyboard/images` | POST | 根据分镜文案生成分镜图，返回 base64 图片列表 |
| `POST /api/video/generate-multishot` | POST | 分镜图确认后，按镜头生成视频并剪辑，返回成片 URL |

### 4.2 请求/响应示例

**POST /api/storyboard/images**

```json
// Request
{
  "storyboardText": "[00:00-00:03] 镜头1：...\n[00:03-00:06] 镜头2：...",
  "aspectRatio": "16:9"
}

// Response
{
  "shots": [
    { "index": 0, "timeRange": "00:00-00:03", "prompt": "...", "imageDataUrl": "data:image/png;base64,..." },
    { "index": 1, "timeRange": "00:03-00:06", "prompt": "...", "imageDataUrl": "data:image/png;base64,..." }
  ]
}
```

**POST /api/video/generate-multishot**

```json
// Request
{
  "shots": [
    { "index": 0, "durationSeconds": 3, "prompt": "...", "imageBase64": "..." },
    { "index": 1, "durationSeconds": 3, "prompt": "...", "imageBase64": "..." }
  ],
  "aspectRatio": "16:9",
  "outputPath": "Ai Videos"  // 可选
}
```

---

## 五、实现范围

### 5.1 Phase 1：核心链路

1. 新增 `imagen_generate.py`（或集成到现有脚本），使用 Compass 调用 Imagen
2. 分镜解析逻辑（`parseStoryboard()`）
3. `POST /api/storyboard/images` 路由
4. ffmpeg 剪辑逻辑（Node.js 调用 `ffmpeg -f concat`）
5. `POST /api/video/generate-multishot` 路由

### 5.2 Phase 2：前端与交互

1. H5「多镜头模式」入口（根据镜头数自动切换）
2. 分镜图展示与确认 UI
3. 可选：单镜头重绘、顺序调整

### 5.3 Phase 3：video-pipeline 集成

1. 在 video-pipeline 中识别多镜头 prompt
2. 自动走「分镜图 → 确认 → 生成 → 剪辑」流程

---

## 六、前置验证清单

- [x] Compass 文档已确认：Imagen `imagen-4.0-generate-preview-06-06`，Gemini 图像 `gemini-2.5-flash-image`
- [ ] 用 `google-genai` + Compass base_url 本地测试 `generate_images` 是否可用
- [ ] 确认 ffmpeg 已安装且可命令行调用

---

## 七、风险与应对

| 风险 | 应对 |
|------|------|
| Compass 无 Imagen | 改用 Vertex Imagen 或 Gemini 图像接口 |
| 分镜图与成片风格差异 | 在 prompt 中加强风格约束，或支持多轮重绘 |
| ffmpeg 编码不一致 | 统一使用 `-c copy` 或统一编码参数 |
