# Compass 视频生成接入说明（Veo / Python SDK）

**文档**: Compass Gemini API proxy - Video Generation  
**实现**: 后端通过 Python SDK（google-genai）调用，与文档完全一致

---

## 一、配置步骤

### 1. 后端（h5-video-tool-api）

**安装 Python 依赖**（必须）：

```powershell
pip install google-genai
```

在 `h5-video-tool-api/.env` 中设置：

```env
# Compass 视频生成
COMPASS_API_URL=https://compass.llm.shopee.io/compass-api/v1
COMPASS_API_KEY=你的Compass_API_Key
```

将 `你的Compass_API_Key` 替换为你在 Compass 平台创建的 API Key。

### 2. 前端（h5-video-tool）

在 `h5-video-tool/.env` 中设置：

```env
# 关闭 mock，使用真实 Compass 视频 API
VITE_USE_MOCK_VIDEO=false
```

### 3. 重启服务

```powershell
# 后端
cd h5-video-tool-api
npm run dev

# 前端
cd h5-video-tool
npm run dev
```

---

## 二、API 说明

Compass 使用 Vertex AI 风格 Veo 接口：

| 操作 | 方法 | 路径 |
|------|------|------|
| 创建任务 | POST | `publishers/google/models/{model}:predictLongRunning` |
| 轮询状态 | POST | `publishers/google/models/{model}:fetchPredictOperation` |
| 视频结果 | — | `operation.result.generated_videos[0].video.uri` |

**创建请求**（instances + parameters）：
- `instances[0].prompt`：视频描述（分镜文本）
- `parameters.aspectRatio`：`16:9` / `9:16` / `1:1`
- `parameters.durationSeconds`：时长（1–8 秒）
- `parameters.generateAudio`：是否生成音频（默认 false）

---

## 三、流程

1. 用户在 Studio 完成：Prompt → 分镜 → 点击「开始生成」
2. 前端调用 `POST /api/video/generate`
3. 后端调用 Compass Veo 创建任务，轮询 until 完成
4. 从返回 URI 下载视频，转为 base64 data URL 给前端展示

---

## 四、参考照片（H5）

当用户在 H5「视频生成」中选择 Drive 素材时：

1. **前端**：将 `driveToken`（Google OAuth access token）和 `materials`（含 id、name、mimeType）传给 `POST /api/video/generate`
2. **后端**：用 driveToken 调用 Drive API 下载首张图片，转为 base64 传入 Python 脚本
3. **Veo**：以「图生视频」方式生成，参考图的风格/主体会体现在视频中

使用条件：需先连接 Google Drive（Materials 页面验证文件夹），并在「匹配素材」中至少选择 1 张图片。

## 五、本地测试

```powershell
cd h5-video-tool-api
npx tsx scripts/generate-video.ts "骑士抗剑奔跑" 5
# 可选指定模型：
npx tsx scripts/generate-video.ts "骑士抗剑奔跑" 5 veo-3.0-generate-001
```

---

## 五、故障排查

- **COMPASS_API_KEY 未配置**：检查 `.env` 中 `COMPASS_API_KEY` 是否已填
- **401 / 403**：API Key 无效、过期或未开通 Veo 权限
- **网络超时**：Compass 需能访问，确认网络/代理
- **视频下载失败**：检查返回的 video.uri 是否可访问（可能需要授权 Header）
