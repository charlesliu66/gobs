# Compass 图像生成接入说明（Imagen / Gemini Flash Image）

**来源**: Compass Capabilities 文档  
**与视频生成共用**: `COMPASS_API_KEY`、`COMPASS_API_URL`

---

## 一、两种图像生成方式

### 1.1 Imagen（推荐：纯文生图）

适合分镜图：每镜头一张图，输出稳定，无图文混排。

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
    prompt="A dog reading a newspaper",
    config=GenerateImagesConfig(),
)
image.generated_images[0].image.save("output-image.png")
```

- **模型**: `imagen-4.0-generate-preview-06-06`
- **返回**: `image.generated_images[0].image`（含 `image_bytes`、`save()` 方法）

### 1.2 Gemini 2.5 Flash Image（备选：图文交织）

通过 `generate_content` + `response_modalities` 生成图像，可输出文本+图像混合。

```python
from google import genai
from google.genai.types import GenerateContentConfig, Modality, HttpOptions, ImageConfig

client = genai.Client(
    api_key='<COMPASS_API_KEY>',
    http_options=HttpOptions(
        api_version="v1",
        base_url='https://compass.llm.shopee.io/compass-api/v1'
    )
)

response = client.models.generate_content(
    model="gemini-2.5-flash-image",
    contents="Generate an image of the Eiffel tower with fireworks in the background.",
    config=GenerateContentConfig(
        response_modalities=[Modality.TEXT, Modality.IMAGE],
        image_config=ImageConfig(aspect_ratio="2:3"),
    ),
)
for part in response.candidates[0].content.parts:
    if part.inline_data:
        # 提取图片 part.inline_data.data
        image.save("example-image.png")
```

- **模型**: `gemini-2.5-flash-image`
- **注意**: 可能输出纯文本或图文混合，需从 `parts` 中提取 `inline_data`

### 1.3 Imagen 图像编辑（可选）

支持 mask 编辑、无 mask 编辑等，可用于分镜图微调。

```python
image = client.models.edit_image(
    model="imagen-3.0-capability-001",
    prompt="A plate of cookies",
    reference_images=[raw_ref, mask_ref],
    config=EditImageConfig(edit_mode="EDIT_MODE_INPAINT_INSERTION"),
)
```

---

## 二、分镜图生成推荐

| 场景           | 推荐方式    | 理由                     |
|----------------|-------------|--------------------------|
| 分镜图（每镜头 1 张） | Imagen      | 纯文生图，输出稳定       |
| Imagen 不可用  | Gemini 2.5 Flash Image | 备选，需解析 parts     |

---

## 三、依赖

```powershell
pip install google-genai
```

与 Veo 相同，无需额外依赖。
