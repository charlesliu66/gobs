# 首帧/尾帧生图 API 绑定说明 — Nano Banana 或其它

本技能要求**每个分镜产出首帧图与尾帧图**（`shot_XX_first_frame.png` / `shot_XX_last_frame.png`）。若使用 **Nano Banana** 或其它文生图 API，按以下方式绑定后，可用脚本批量生成或由 Agent 在流程中调用。

**重要**：若你已有**本地角色参考图**（立绘、定妆图等），应**优先用该图**保证服化道与画风一致，而不是依赖文生图。请使用 `generate_frame_images.py` 的 `--reference-image` 参数（或 JSON 中的 `reference_image` + `use_reference_for_shots`），脚本会将该图复制/缩放为指定镜头的首帧与尾帧，仅对无参考的镜头（如 Logo）才调用文生图 API。详见技能内「本地参考图优先」规则。

---

## 1. 环境变量配置（绑定方式）

在运行本技能脚本或 Agent 的终端/环境中设置以下变量，即完成「绑定」：

### Compass Imagen（推荐，与 QAS h5-video-tool-api 共用）

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `COMPASS_API_KEY` | 是 | 与 h5-video-tool-api/.env 中的 COMPASS_API_KEY 一致 |
| `COMPASS_API_URL` | 否 | 默认 `https://compass.llm.shopee.io/compass-api/v1` |
| `FRAME_IMAGE_PROVIDER` | 否 | 设 `compass` 或留空，优先使用 Compass Imagen |

脚本会从 `h5-video-tool-api/.env` 或 skill 目录 `.env` 自动加载。

### 火山 Ark 生图

| 变量名 | 必填 | 说明 | 示例 |
|--------|------|------|------|
| `FRAME_IMAGE_API_KEY` | 是 | 生图 API 的 Key / Token | 火山 Ark UUID |
| `FRAME_IMAGE_API_URL` | 视厂商 | **火山 Ark 时填 `volcano`** | `volcano` |
| `FRAME_IMAGE_API_MODEL` | 否 | Endpoint ID | `ep-2024xxxx-xxxx` |

**火山 Ark 生图**：设 `FRAME_IMAGE_PROVIDER=volcano`，并在 [火山方舟控制台](https://console.volcengine.com/ark) 创建 Seedream 模型，将 Endpoint ID 设为 `FRAME_IMAGE_API_MODEL`。

### 绑定方式一：当前终端临时生效

**Windows (PowerShell)**  
```powershell
$env:FRAME_IMAGE_API_KEY = "你的Nano_Banana_API_Key"
$env:FRAME_IMAGE_API_URL  = "https://你的部署.run.banana.dev/start"
```

**Windows (CMD)**  
```cmd
set FRAME_IMAGE_API_KEY=你的Nano_Banana_API_Key
set FRAME_IMAGE_API_URL=https://你的部署.run.banana.dev/start
```

**macOS / Linux**  
```bash
export FRAME_IMAGE_API_KEY="你的Nano_Banana_API_Key"
export FRAME_IMAGE_API_URL="https://你的部署.run.banana.dev/start"
```

### 绑定方式二：项目根目录 .env 文件（推荐）

在项目根目录或本 skill 的 `scripts` 同级目录创建 `.env` 文件（勿提交到 Git）：

```env
FRAME_IMAGE_API_KEY=你的Nano_Banana_API_Key
FRAME_IMAGE_API_URL=https://你的部署.run.banana.dev/start
FRAME_IMAGE_API_MODEL=stable-diffusion-xl
```

脚本中通过 `python-dotenv` 加载（见下方脚本示例）。若环境不允许用 .env，则用方式一。

### 绑定方式三：Cursor / IDE 环境变量

在 Cursor 的 **Settings → 搜索 Environment** 或项目 **.vscode/settings.json** 中配置 env，使 Agent 或集成终端继承：

- 不推荐把 Key 写进 settings.json 并提交仓库，建议用 **方式一** 或 **方式二** 本地配置。

---

## 2. Nano Banana 获取 Key 与 URL 的步骤（示例）

1. 登录 [Nano Banana 控制台](https://app.banana.dev)（或你方提供的 Nano Banana 入口）。  
2. 创建或打开一个 **Image Generation** 类项目/模型部署。  
3. 在项目详情页获取：  
   - **API Key** → 填入 `FRAME_IMAGE_API_KEY`  
   - **API URL**（如 `https://xxx-xxx.run.banana.dev/start`）→ 填入 `FRAME_IMAGE_API_URL`  
4. 若文档中有 Model 或 Version 参数，将其填入 `FRAME_IMAGE_API_MODEL`。

具体参数名（如 `prompt`、`negative_prompt`、`width`、`height`）以 Nano Banana 官方文档为准；下方脚本中的请求体需按实际 API 规范修改。

---

## 3. 脚本调用方式（批量生成首帧/尾帧图）

本 skill 提供通用脚本 `scripts/generate_frame_images.py`，用于根据分镜表或 JSON 中的「首帧提示词」「尾帧提示词」批量调生图 API，并保存为 `shot_XX_first_frame.png` / `shot_XX_last_frame.png`。

- 脚本会读取环境变量 `FRAME_IMAGE_API_KEY`、`FRAME_IMAGE_API_URL`（及可选 `FRAME_IMAGE_API_MODEL`）。  
- 请求体格式需与 Nano Banana 实际 API 一致；脚本内为**占位示例**，你需按官方文档改成真实参数（如 `prompt`、`image_width`、`image_height` 等）。

使用前请先完成上述**环境变量绑定**，再运行：

```bash
cd game-director-pro/scripts
python generate_frame_images.py --input frames_batch.json --output-dir ../output/frames
```

---

## 4. 如何把「绑定」交给 Agent 使用

- **方式 A**：你在本机或 CI 环境已设置好 `FRAME_IMAGE_API_KEY`、`FRAME_IMAGE_API_URL`，Agent 在**同一环境**下执行 `generate_frame_images.py` 时即可自动使用，无需在对话中提供 Key。  
- **方式 B**：在对话中说明「已绑定 Nano Banana，环境变量在 .env 里」，Agent 会先加载 .env 再调脚本。  
- **方式 C**：若希望 Agent 直接调 API 而不通过脚本，可在 skill 中约定：当用户说「用 Nano Banana 生首帧尾帧」时，读取上述环境变量并按 Nano Banana 文档发起请求（需在 skill 内写明请求格式与保存路径）。

**安全**：不要在任何对话或代码仓库中粘贴真实 API Key；仅通过环境变量或 .env（且 .env 加入 .gitignore）配置。

---

## 5. Google API Key 接入（如 Gemini 文生图）

若使用 **Google API Key**（格式通常为 `AIzaSy...`，如 Gemini 等），可按以下方式接入，**切勿将 Key 提交到 Git**：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `GOOGLE_API_KEY` 或 `GEMINI_API_KEY` | 是 | 你从 Google Cloud / AI Studio 获取的 API Key（AIzaSy 开头） |
| `FRAME_IMAGE_API_URL` | 视实现而定 | 若用通用脚本且后端是 Gemini，可设为 Gemini 的 generateContent endpoint，或由脚本内写死 Gemini URL |

**推荐绑定方式**：在项目根或本 skill 目录下创建 **`.env`** 文件（已加入 .gitignore），写入：

```env
# Google / Gemini 首帧尾帧生图（二选一即可）
GEMINI_API_KEY=你的AIzaSy开头的Key
# 或
GOOGLE_API_KEY=你的AIzaSy开头的Key
```

若首帧/尾帧脚本支持「按 Key 自动选 Gemini」，则只需配置上述其一即可，无需再填 `FRAME_IMAGE_API_URL`。  
**安全**：`.env` 不要提交；可复制 `.env.example` 为 `.env` 后填入真实 Key。

---

## 6. 其它生图 API 的绑定

若使用 **即梦、Kling 文生图、Stability、OpenAI DALL·E** 等，同样可复用「环境变量 + 脚本」思路：

- 将 `FRAME_IMAGE_API_URL` 改为该服务的 endpoint。  
- 在 `generate_frame_images.py` 中按该 API 的请求/响应格式修改 `_call_image_api(prompt)` 的实现。  
- Key 的变量名可继续用 `FRAME_IMAGE_API_KEY`，或新增 `KLING_IMAGE_KEY` 等并在脚本中优先读取。

这样即完成「首帧/尾帧生图」与 Nano Banana（或其它 API）的绑定，Agent 在生成分镜后即可按表产出首帧图与尾帧图。
