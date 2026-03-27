# Veo 视频生成 Prompt 要点

基于 Google 官方文档与 DeepMind 提示词指南整理。

---

## 一、Prompt 结构（按优先级）

| 要素 | 说明 | 示例 |
|------|------|------|
| **主体 (Subject)** | 尽量具体，避免泛泛描述 | ❌ "一个男人" → ✅ "一位经验丰富的侦探"、"一只金色毛发的拉布拉多幼犬" |
| **动作 (Action)** | 明确动作、情绪、互动 | 走、跑、笑、对话、烹饪、凝视、眨眼、风吹动头发 |
| **场景 (Scene)** | 时间、地点、天气、氛围 | "雨夜霓虹灯下的赛博朋克街道"、"黄昏时分的海边" |
| **镜头 (Camera)** | 景别、角度、运镜 | 特写、中景、俯拍、跟拍、缓慢推进、航拍 |
| **光线 (Lighting)** | 光源、氛围 | 逆光剪影、柔和的晨光、电影感阴影、霓虹灯 |
| **风格 (Style)** | 视觉风格 | Cinematic 8K、日式动漫、黏土动画、35mm 胶片、复古 VHS |

---

## 二、实用技巧

1. **一次只讲一个场景**  
   5–8 秒内聚焦一个清晰动作或瞬间，避免堆叠太多事件。

2. **人物描述要具体**  
   - ❌ "棕色头发的女人"  
   - ✅ "二十多岁、卷曲棕色头发、脸上有雀斑的女人"

3. **对话用冒号，不用引号**  
   - ❌ `"他说：你好"`（容易生成画面上的文字）  
   - ✅ `A man says: Hello` 或 `男人说：你好`

4. **善用负面提示 (negativePrompt)**  
   用 API 的 `negativePrompt` 排除不想要的元素，例如：  
   `urban background, man-made structures, dark atmosphere`

5. **先用 Gemini 润色 Prompt**  
   用 Gemini 把简单想法扩展成更完整、结构化的 Veo prompt，再生成视频。

---

## 三、镜头与运镜术语

**景别：** 特写、中景、全景、俯拍、仰拍、鸟瞰、过肩镜头、POV  
**运镜：** 固定、横摇、推进/拉远、跟拍、环绕、航拍、手持、慢速变焦

**示例：**
```
A slow, dramatic zoom in on a mysterious compass lying on a dusty map.
The camera starts wide, then smoothly zooms in until the compass face fills the frame.
```

---

## 四、风格与氛围

**风格：** Cinematic、8K、35mm 胶片、日式动漫、黏土动画、赛博朋克  
**光线：** 黄金时刻、逆光、柔光、霓虹、烛光  
**氛围：** 悬疑、温馨、史诗感、复古、科幻

---

## 五、参考图使用

- 最多 3 张参考图，用于同一人物/角色/产品，有助于保持外观一致。
- 参考图应尽量多角度、清晰，避免模糊或遮挡过多。

---

## 六、常见问题与建议

| 问题 | 建议 |
|------|------|
| 画面太泛、太随机 | 增加主体、动作、场景的细节 |
| 人物外观不一致 | 用参考图 + 更具体的人物描述 |
| 动作不自然 | 明确动作顺序和节奏，避免一次写太多动作 |
| 风格不统一 | 在 prompt 开头就写明风格和光线 |
| 时长不够用 | 选 8 秒，并聚焦一个核心动作或变化 |

---

## 七、示例 Prompt 模板

```
[镜头] A medium shot of [主体描述], [动作].
[场景] The scene is [地点], [时间/天气], [氛围].
[风格] Cinematic 8K, [光线], [艺术风格].
[可选] [对话或音效描述].
```

**示例：**
```
A close-up of a ronin standing with sword sheathed, eyes deep, rainwater flowing down the blade.
The mysterious figure gradually fades into the mist. Cinematic 8K 3D rendering, dramatic backlighting.
Suitable for all ages, no copyright disputes, no sensitive elements.
```

---

## 参考链接

- [Veo on Vertex AI prompt guide](https://cloud.google.com/vertex-ai/generative-ai/docs/video/video-gen-prompt-guide)
- [Best practices for Veo](https://cloud.google.com/vertex-ai/generative-ai/docs/video/best-practice)
- [DeepMind Veo prompt guide](https://deepmind.google/models/veo/prompt-guide/)
