# Prompt 模板系统设计文档

**日期**: 2025-03-18  
**状态**: 设计完成，待实现  
**触发方式**: 用户在下拉/选项中显式选择模板（viral-dance / cg-trailer 等）

---

## 一、目标与背景

### 1.1 需求

将 prompt 内化为不同模板，根据用户选择的「方向」产出不同风格的 prompt，并驱动不同的视频生成流水线。

| 模板 ID | 名称 | 典型产出 | Pipeline 特点 |
|---------|------|----------|---------------|
| `viral-dance` | Viral 舞蹈 | 10 秒，浪人跳近期流行 MV 舞蹈 | 单镜/少镜，Seedance 一次生成 |
| `cg-trailer` | CG 宣传片 | 60 秒，讲述浪人故事，多镜头 | 分镜 → 首尾帧 → 逐镜 VEO/Seedance → ffmpeg 剪辑 |

### 1.2 设计决策

- **触发方式**：用户显式选择模板（下拉/选项）
- **模板定义**：配置驱动（JSON），可扩展
- **Pipeline 路由**：按 `templateId` 选择单镜或多镜流水线

---

## 二、模板 Schema

### 2.1 模板配置结构

```json
{
  "id": "viral-dance",
  "name": "Viral 舞蹈",
  "description": "10秒，角色跳近期流行MV舞蹈，适合 TikTok/小红书",
  "duration": 10,
  "aspectRatio": "9:16",
  "pipelineMode": "single",
  "systemPromptSuffix": "角色跳近期流行MV中的热门舞蹈，前3秒抓人，卡点节奏感强，适合社媒传播。",
  "defaultSearchKeywords": ["dance", "viral", "trending"]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识，API 传入值 |
| `name` | string | 展示名称 |
| `description` | string | 简短说明 |
| `duration` | number | 默认时长（秒） |
| `aspectRatio` | string | `"9:16"` 或 `"16:9"` |
| `pipelineMode` | `"single"` \| `"multishot"` | 单镜 or 多镜流水线 |
| `systemPromptSuffix` | string | 注入到 LLM system prompt 的补充说明 |
| `defaultSearchKeywords` | string[] | 素材搜索时的默认关键词 |

### 2.2 初始模板配置

**viral-dance.json**

```json
{
  "id": "viral-dance",
  "name": "Viral 舞蹈",
  "description": "10秒，角色跳近期流行MV舞蹈，适合 TikTok/小红书",
  "duration": 10,
  "aspectRatio": "9:16",
  "pipelineMode": "single",
  "systemPromptSuffix": "角色跳近期流行MV中的热门舞蹈，前3秒抓人，卡点节奏感强，适合社媒传播。可提及「近期爆款舞蹈」「TikTok 热门动作」等作为参考，但不要写具体艺人名或曲名（版权规避）。",
  "defaultSearchKeywords": ["dance", "viral", "trending"]
}
```

**cg-trailer.json**

```json
{
  "id": "cg-trailer",
  "name": "CG 宣传片",
  "description": "60秒，多镜头讲述角色故事，电影级叙事",
  "duration": 60,
  "aspectRatio": "16:9",
  "pipelineMode": "multishot",
  "systemPromptSuffix": "按 game-director-pro 公式4（新角色 CG 史诗宣发型）生成分镜：0–40% 电影级铺垫、40–80% 实机爽点、80–90% 收招定格、90–100% CTA。每镜头需含首帧与尾帧描述，确保镜头间衔接。",
  "formulaRef": "formula-4",
  "defaultSearchKeywords": ["character", "cinematic", "trailer"]
}
```

---

## 三、系统架构

### 3.1 目录结构

```
h5-video-tool-api/
├── src/
│   ├── config/
│   │   └── prompt-templates/
│   │       ├── index.ts          # 加载并导出模板
│   │       ├── schema.ts         # 类型定义
│   │       ├── viral-dance.json
│   │       └── cg-trailer.json
│   ├── services/
│   │   ├── promptPolish.ts       # 改造：接受 templateId，注入 template 配置
│   │   └── templateEngine.ts     # 新增：根据 templateId 选择 pipeline
│   └── routes/
│       └── prompt.ts             # 改造：/polish 接受 templateId，新增 GET /templates
```

### 3.2 数据流

```
用户选择模板 (templateId) + 输入 idea ("宣传浪人")
    │
    ▼
GET /api/prompt/templates  →  返回可选模板列表（含 id, name, description）
    │
    ▼
POST /api/prompt/polish
  Body: { prompt: "宣传浪人", templateId: "viral-dance" }
    │
    ▼
TemplateEngine.load("viral-dance")
    → duration=10, aspectRatio=9:16, systemPromptSuffix=...
    │
    ▼
promptPolish(prompt, { templateConfig })
    → LLM 注入 template 专属 system prompt
    → 输出 polishedPrompt + searchKeywords
    │
    ▼
根据 template.pipelineMode 路由：
    - single  → 单次 /api/video/generate（或 video-pipeline）
    - multishot → /api/storyboard/images → 确认 → /api/video/generate-multishot
```

### 3.3 API 变更

| 接口 | 变更 |
|------|------|
| `GET /api/prompt/templates` | **新增**：返回模板列表 |
| `POST /api/prompt/polish` | **改造**：`body.templateId` 可选，有则注入模板配置 |

**GET /api/prompt/templates 响应示例**

```json
{
  "templates": [
    {
      "id": "viral-dance",
      "name": "Viral 舞蹈",
      "description": "10秒，角色跳近期流行MV舞蹈，适合 TikTok/小红书",
      "duration": 10,
      "aspectRatio": "9:16"
    },
    {
      "id": "cg-trailer",
      "name": "CG 宣传片",
      "description": "60秒，多镜头讲述角色故事，电影级叙事",
      "duration": 60,
      "aspectRatio": "16:9"
    }
  ]
}
```

**POST /api/prompt/polish 请求扩展**

```json
{
  "prompt": "宣传浪人",
  "templateId": "viral-dance",
  "style": "viral"
}
```

- `templateId` 优先于 `style`：若传入 `templateId`，则使用模板的 `systemPromptSuffix`，`style` 可省略或作为微调
- 若未传 `templateId`，保持现有 `style` 逻辑（viral / formal / story）

---

## 四、Pipeline 路由逻辑

### 4.1 single 模式（viral-dance）

- 调用 `promptPolish` 得到单段分镜 prompt
- 若 prompt 仅 1 个镜头或可合并为 1 段：直接调用 `POST /api/video/generate`
- 或交由 video-pipeline 的 `run.js` 执行（即梦/Seedance）

### 4.2 multishot 模式（cg-trailer）

- 调用 `promptPolish` 得到多镜头分镜 prompt
- 解析分镜 → 调用 `POST /api/storyboard/images` 生成首帧图（依赖 `2025-03-13-multi-shot-storyboard-design.md`）
- 用户确认分镜图
- 调用 `POST /api/video/generate-multishot` 逐镜生成 → ffmpeg 剪辑
- 注意：多镜 pipeline 依赖多镜头设计文档中的接口实现状态

---

## 五、实现范围与依赖

### 5.1 Phase 1：模板配置 + polish 改造（优先）

1. 新增 `config/prompt-templates/` 目录与 JSON 配置
2. 新增 `TemplateEngine` 或直接在 `promptPolish` 中读取模板
3. 改造 `POST /api/prompt/polish`：支持 `templateId`，注入模板的 `systemPromptSuffix`
4. 新增 `GET /api/prompt/templates`
5. 前端：模板下拉选择（可选，可先由 API 或 Cursor 调用验证）

**依赖**：无，可独立完成

### 5.2 Phase 2：Pipeline 路由（前端/工作流）

1. H5 或 video-pipeline 根据 `template.pipelineMode` 选择 single / multishot
2. single：沿用现有 `POST /api/video/generate` 或 `run.js`
3. multishot：对接多镜头设计文档中的 `POST /api/storyboard/images` 与 `POST /api/video/generate-multishot`

**依赖**：`2025-03-13-multi-shot-storyboard-design.md` 中 Phase 1 完成

### 5.3 Phase 3：cg-trailer 公式细化

1. 将 game-director-pro 公式 4 的完整描述词规范内化到 `cg-trailer` 的 `systemPromptSuffix` 或单独配置文件
2. 首尾帧描述词规范接入（参考 game-director-pro 首帧/尾帧细节规范）

---

## 六、与现有组件的衔接

| 组件 | 衔接方式 |
|------|----------|
| `promptPolish.ts` | 新增 `templateId` 参数，有则加载模板并注入 `systemPromptSuffix` |
| `STYLE_HINTS` | 保留；`templateId` 存在时，模板配置优先 |
| `video-pipeline` | `run.js` 可接受 `--template viral-dance`，内部调用 polish 时传入 |
| `game-director-pro` | `cg-trailer` 的 `systemPromptSuffix` 引用公式 4 结构 |
| 多镜头设计 | `multishot` 模式复用 `storyboard/images` 与 `generate-multishot` |

---

## 七、扩展性

- **新增模板**：在 `config/prompt-templates/` 下新增 JSON 文件，在 `index.ts` 中注册即可
- **模板变量**：后续可支持 `{{character}}`、`{{duration}}` 等占位符，由用户输入或默认值替换

---

## 八、验收标准

- [ ] `GET /api/prompt/templates` 返回 viral-dance、cg-trailer 两个模板
- [ ] `POST /api/prompt/polish` 传入 `templateId: "viral-dance"` 时，输出的 prompt 符合「10秒、舞蹈、9:16」特征
- [ ] `POST /api/prompt/polish` 传入 `templateId: "cg-trailer"` 时，输出的 prompt 符合「60秒、多镜、公式4」特征
- [ ] 未传 `templateId` 时，行为与改造前一致（兼容现有 style 参数）
