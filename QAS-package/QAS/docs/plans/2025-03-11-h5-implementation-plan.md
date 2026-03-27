# H5 视频创作工具 - 完整实践路径

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 搭建 H5 视频创作工具（Prompt → Drive 素材检索 → 分镜生成 → 视频生成 → 下载/保存 → 可选发布），并发布给同事使用。

**Architecture:** 前后端分离。前端 React + Google OAuth + Drive API；后端 Node.js 提供 LLM 分镜、Seedance API 视频生成、成片下载、GeeLark 发布。Skills 打包进后端作为 LLM 上下文。

**Tech Stack:** React + Vite, Node.js + Express, Google Drive API, OpenAI/Claude API, Seedance 第三方 API (laozhang.ai 等), GeeLark API (Phase 2)

**参考设计:** `docs/plans/2025-03-11-h5-google-drive-design.md`

---

## 实践路径总览

**优先级调整（2025-03-11）**：先本地跑通全流程，再搭建 H5 前端分享给同事。

```
Phase 0: 本地全流程跑通（优先）
  → Prompt → 素材检索 → 分镜生成 → Seedance 生成 → 成片下载
  → 复用现有 video-pipeline + video-director，补全分镜 API 与 Seedance API 对接

Phase 1: H5 前端搭建（本地流程稳定后）
Phase 2: 成片保存与发布模块
Phase 3: 部署与同事使用
```

---

---

## Phase 0：环境与项目初始化

### 0.1 前置准备清单

| 项目 | 操作 | 说明 |
|------|------|------|
| Google Cloud 项目 | 创建项目，启用 Drive API | [console.cloud.google.com](https://console.cloud.google.com) |
| Google OAuth 凭据 | 创建 OAuth 2.0 客户端 ID（Web 应用） | 配置授权重定向 URI |
| LLM API Key | OpenAI 或 Claude API Key | 用于分镜生成 |
| Seedance API | 注册 laozhang.ai 或类似服务商 | 获取 API 端点与 Key |
| GeeLark（可选） | 注册并获取 API Key | Phase 2 发布模块用 |

### 0.2 项目结构

```
QAS/
├── h5-video-tool/           # 前端
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── h5-video-tool-api/       # 后端
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── skills/          # 复制的 video-director, storyboard, seedance-rules
│   │   └── config/
│   ├── package.json
│   └── .env.example
└── docs/plans/
```

### Task 0.1: 创建前端项目

**Files:** Create `h5-video-tool/`

**Step 1: 初始化 React + Vite 项目**

```bash
cd c:\Users\wei.liu\Desktop\cursor_try\QAS
npm create vite@latest h5-video-tool -- --template react-ts
cd h5-video-tool && npm install
```

**Step 2: 安装依赖**

```bash
npm install @react-oauth/google googleapis tailwindcss
npm install -D @types/node
```

**Step 3: 配置 Tailwind**

```bash
npx tailwindcss init -p
```

**Step 4: Commit**

```bash
git add h5-video-tool/
git commit -m "chore: init h5-video-tool frontend"
```

---

### Task 0.2: 创建后端项目

**Files:** Create `h5-video-tool-api/`

**Step 1: 初始化 Node 项目**

```bash
cd c:\Users\wei.liu\Desktop\cursor_try\QAS
mkdir h5-video-tool-api && cd h5-video-tool-api
npm init -y
```

**Step 2: 安装依赖**

```bash
npm install express cors dotenv openai googleapis
npm install axios  # 用于 Seedance API 调用
```

**Step 3: 创建基础结构**

```
h5-video-tool-api/
├── src/
│   ├── index.ts
│   ├── routes/
│   ├── services/
│   └── skills/
├── .env.example
└── package.json
```

**Step 4: 复制 Skills 到后端**

```bash
# 从 ~/.cursor/skills 复制
mkdir -p src/skills
cp -r ~/.cursor/skills/video-director src/skills/
cp -r ~/.cursor/skills/storyboard-studio src/skills/
```

Windows PowerShell:
```powershell
New-Item -ItemType Directory -Path "src\skills" -Force
Copy-Item -Path "$env:USERPROFILE\.cursor\skills\video-director" -Destination "src\skills\" -Recurse
Copy-Item -Path "$env:USERPROFILE\.cursor\skills\storyboard-studio" -Destination "src\skills\" -Recurse
```

**Step 5: 创建 .env.example**

```env
# LLM
OPENAI_API_KEY=sk-xxx
# 或 ANTHROPIC_API_KEY=sk-ant-xxx

# Seedance (laozhang.ai 等)
SEEDANCE_API_URL=https://api.laozhang.ai/v2/generate/text
SEEDANCE_API_KEY=xxx

# Google OAuth (后端代理 Drive 时用)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# GeeLark (Phase 2)
GEELARK_API_KEY=xxx

# Server
PORT=3001
```

**Step 6: Commit**

```bash
git add h5-video-tool-api/
git commit -m "chore: init h5-video-tool-api backend"
```

---

## Phase 1：核心流程 MVP

### 1.1 前端：Prompt 输入 + 关键词展示

**Files:** Create `h5-video-tool/src/pages/Home.tsx`, `h5-video-tool/src/utils/keywords.ts`

**Step 1: 关键词提取工具**

Create `h5-video-tool/src/utils/keywords.ts`:

```typescript
const STOP_WORDS = new Set(['的', '在', '和', '与', '持', '拿', '着', '了', '是', '有', '要', '秒', '分']);

export function extractKeywords(text: string): string[] {
  const nums = text.match(/\d+[秒分]?/g) || [];
  const words = text.replace(/\d+[秒分]?/g, '').split(/[\s，。、；：！？]+/).filter(Boolean);
  const filtered = [...nums, ...words.filter(w => w.length >= 2 && !STOP_WORDS.has(w))];
  return [...new Set(filtered)];
}
```

**Step 2: 首页表单**

Create `h5-video-tool/src/pages/Home.tsx` 含输入框、提取关键词展示、下一步按钮。

**Step 3: 路由与入口**

配置 React Router，`/` 指向 Home。

**Step 4: Commit**

```bash
git add h5-video-tool/src/
git commit -m "feat: prompt input and keyword extraction"
```

---

### 1.2 前端：Google Drive 连接与素材检索

**Files:** Create `h5-video-tool/src/components/DrivePicker.tsx`, `h5-video-tool/src/hooks/useGoogleDrive.ts`

**Step 1: 配置 Google OAuth**

在 `index.html` 或 `main.tsx` 中引入 GIS：

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

**Step 2: 封装 Drive API 调用**

- 使用 `@react-oauth/google` 的 `GoogleOAuthProvider` + `useGoogleLogin` 获取 token
- Scope: `https://www.googleapis.com/auth/drive.readonly`
- 调用 `files.list`，q 参数：`mimeType contains 'image/' or mimeType contains 'video/'` + `name contains '关键词'`

**Step 3: 素材列表 UI**

展示缩略图、文件名，支持多选、拖拽排序（确定 @图片1、@图片2 顺序）。

**Step 4: 处理 CORS**

若 Drive API 直接调用遇 CORS，添加后端代理路由 `/api/drive/search?q=xxx`，后端用用户传来的 token 请求 Drive。

**Step 5: Commit**

```bash
git add h5-video-tool/src/
git commit -m "feat: Google Drive connect and material search"
```

---

### 1.3 后端：分镜生成 API

**Files:** Create `h5-video-tool-api/src/routes/prompt.ts`, `h5-video-tool-api/src/services/storyboard.ts`

**Step 1: 加载 Skills**

```typescript
// services/storyboard.ts
import fs from 'fs';
import path from 'path';

const videoDirector = fs.readFileSync(path.join(__dirname, '../skills/video-director/SKILL.md'), 'utf-8');
const storyboard = fs.readFileSync(path.join(__dirname, '../skills/storyboard-studio/SKILL.md'), 'utf-8');
const seedanceRules = fs.readFileSync(path.join(__dirname, '../skills/video-director/reference/seedance-rules.md'), 'utf-8');

const SYSTEM_PROMPT = `你是视频分镜专家。严格遵循以下规范：

## Video Director
${videoDirector}

## Storyboard
${storyboard}

## Seedance 规则（必须执行）
${seedanceRules}

输出格式：分时间戳 [00:00-00:XX]，含 @图片N 引用，通过 Seedance 审核。`;
```

**Step 2: 调用 LLM**

使用 OpenAI 或 Claude API，将 `SYSTEM_PROMPT` + 用户 prompt + 素材映射作为消息，获取分镜文本。

**Step 3: Seedance 规则后处理**

实现 `applySeedanceRules(text: string)`，按 seedance-rules 做禁用词替换。

**Step 4: 路由**

`POST /api/prompt/generate`  
Body: `{ prompt, materials: [{ name, id }] }`  
Response: `{ storyboardText }`

**Step 5: Commit**

```bash
git add h5-video-tool-api/src/
git commit -m "feat: storyboard generation API with skills"
```

---

### 1.4 后端：Seedance 视频生成

**Files:** Create `h5-video-tool-api/src/services/seedance.ts`, `h5-video-tool-api/src/routes/video.ts`

**Step 1: 集成 Seedance API**

参考 laozhang.ai 或所选服务商文档：
- 提交任务：`POST /v2/generate/text` 或 `/image`
- 轮询状态：`GET /v2/tasks/{id}`
- 下载视频：获取最终 URL

**Step 2: Drive 素材下载**

用户已选素材（Drive file id），后端用用户 token 调用 `files.get(id, alt=media)` 下载，或让前端传 base64（小图可行）。

**Step 3: 上传素材到 Seedance**

按 Seedance API 要求上传图片，获取素材 ID，在 prompt 中引用。

**Step 4: 路由**

`POST /api/video/generate`  
Body: `{ storyboardText, materialIds: string[], driveToken }`  
Response: `{ taskId }` → 轮询 → `{ videoUrl }`

**Step 5: Commit**

```bash
git add h5-video-tool-api/src/
git commit -m "feat: Seedance video generation API"
```

---

### 1.5 前端：串联流程 + 成片下载

**Files:** Modify `h5-video-tool/src/pages/Home.tsx`, Create `h5-video-tool/src/pages/Result.tsx`

**Step 1: 流程串联**

1. 用户输入 prompt → 展示关键词  
2. 连接 Drive → 搜索素材 → 选择并排序  
3. 调用 `POST /api/prompt/generate` → 展示生成的分镜  
4. 用户确认 → 调用 `POST /api/video/generate` → 轮询状态  
5. 完成后跳转结果页

**Step 2: 成片下载**

- 后端返回 `videoUrl`（临时或持久链接）
- 前端：`<a href={videoUrl} download="video.mp4">下载到电脑</a>` 或 fetch + Blob + createObjectURL

**Step 3: 保存到 Drive（可选）**

后端路由 `POST /api/video/save-to-drive`，用用户 token 调用 Drive API `files.create` 上传视频到用户指定文件夹。

**Step 4: Commit**

```bash
git add h5-video-tool/src/
git commit -m "feat: full flow and video download"
```

---

## Phase 2：成片保存与发布模块

### 2.1 保存到 Drive

**Files:** Modify `h5-video-tool-api/src/routes/video.ts`

**Step 1: 后端上传到 Drive**

接收 `driveToken`、`videoBuffer`、`folderId`（可选），调用 Drive API 创建文件。

**Step 2: 前端按钮**

「保存到 Drive」→ 选择文件夹（Drive 文件夹选择器）→ 调用 API → 提示成功。

**Step 3: Commit**

```bash
git commit -m "feat: save video to user Google Drive"
```

---

### 2.2 发布模块（GeeLark）

**Files:** Create `h5-video-tool-api/src/services/geelark.ts`, `h5-video-tool-api/src/routes/publish.ts`

**Step 1: GeeLark API 封装**

- 文件上传
- 创建/查询自动化任务
- 参考 [open.geelark.com/api](https://open.geelark.com/api)

**Step 2: 用户绑定 GeeLark**

- 设置页：用户输入自己的 GeeLark API Key（加密存储，或后端统一配置）
- 或：平台统一配置一个 GeeLark 账号，同事共用（需管理配额）

**Step 3: 发布路由**

`POST /api/publish`  
Body: `{ videoUrl, platforms: ['tiktok','instagram',...], captions }`  
Response: `{ taskId, status }`

**Step 4: 前端发布 UI**

成片列表 → 勾选视频 → 勾选平台 → 填写文案 → 批量发布 → 状态展示。

**Step 5: Commit**

```bash
git commit -m "feat: batch publish to social media via GeeLark"
```

---

## Phase 3：部署与同事使用

### 3.1 部署选项

| 方式 | 适用 | 说明 |
|------|------|------|
| **内网部署** | 公司内网 | 后端跑在内网服务器，前端静态文件放 Nginx，同事通过内网 URL 访问 |
| **公网部署** | 远程办公 | 前端 Vercel/Netlify，后端 Railway/Render/自建 VPS |
| **本地 + 内网穿透** | 快速验证 | 本地跑，用 ngrok 等暴露临时 URL 给同事 |

### 3.2 推荐：内网部署（同事使用）

**Step 1: 构建前端**

```bash
cd h5-video-tool
npm run build
```

**Step 2: 后端静态托管**

Express 托管 `dist`：

```javascript
app.use(express.static(path.join(__dirname, '../h5-video-tool/dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../h5-video-tool/dist/index.html')));
```

**Step 3: 后端部署**

- 安装 Node.js 的服务器
- `npm run build`（若用 TS）或 `node src/index.js`
- 使用 pm2: `pm2 start src/index.js --name h5-video-api`
- 配置环境变量 `.env`

**Step 4: 配置 Nginx（可选）**

```
server {
  listen 80;
  server_name video-tool.your-company.local;
  location / {
    proxy_pass http://localhost:3001;
  }
}
```

**Step 5: 分享给同事**

- 内网 URL：`http://video-tool.your-company.local` 或 `http://192.168.x.x:3001`
- 使用说明：连接 Drive、输入 prompt、选素材、生成、下载/发布

### 3.3 使用说明文档

Create `h5-video-tool/README.md`：

```markdown
# 视频创作工具 - 使用说明

## 访问地址
http://[内网地址]:3001

## 使用步骤
1. 点击「连接 Google Drive」授权
2. 输入视频创意（如：血坦拿着武器奔跑的5秒视频）
3. 从 Drive 选择匹配的素材，调整顺序
4. 生成分镜 → 确认 → 生成视频
5. 下载到电脑或保存到 Drive
6. （可选）批量发布到社媒
```

---

## 检查清单（上线前）

- [ ] Google OAuth 已配置，重定向 URI 正确
- [ ] LLM API Key、Seedance API Key 已配置
- [ ] Skills 已复制到后端并正确加载
- [ ] 前端 API 基地址指向后端（生产环境）
- [ ] 成片下载、保存到 Drive 可用
- [ ] （Phase 2）GeeLark 已配置，发布流程可用
- [ ] 同事可访问 URL，有简要使用说明

---

## 执行选项

**Plan complete and saved to `docs/plans/2025-03-11-h5-implementation-plan.md`.**

**两种执行方式：**

1. **Subagent-Driven（本会话）** - 按 Task 逐个派发子 agent，每步审查
2. **Parallel Session（新会话）** - 在新会话中用 executing-plans 批量执行，设置检查点

**选哪种？**
