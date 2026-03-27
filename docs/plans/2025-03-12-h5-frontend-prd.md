# H5 视频创作工具 — 前端 PRD（产品需求文档）

**日期**: 2025-03-12  
**策略**: 壳子优先（Shell-First）— 先搭结构，后端调稳后逐个接回 API  
**状态**: 待评审

---

## 一、产品定位与目标用户

### 1.1 产品定位

面向同事的 **H5 视频创作工具**，打通 QAS 流水线的前端入口：

```
Prompt 输入 → 素材检索 → 分镜生成 → 视频生成 → 下载/保存 → 可选发布
```

### 1.2 目标用户

- **主要**：内部同事，用于快速生成短视频内容
- **场景**：输入创意、选择 Drive 素材、一键生成分镜与视频、下载或发布到社媒

### 1.3 核心价值

- **一站式**：无需切换多个工具，从创意到成片在一个页面完成
- **可控**：每个环节可人工确认（分镜、成片）再进入下一步
- **可扩展**：后期可接发布到 TikTok/INS 等

---

## 二、壳子优先策略（Shell-First）

### 2.1 原则

| 原则 | 说明 |
|------|------|
| **先结构后数据** | 先搭页面结构、路由、步骤流程，用 Mock 数据填充 |
| **接口契约先行** | 定义好 API 请求/响应结构，前后端对齐，后端未就绪时用 Mock |
| **逐个接回** | 后端 API 稳定一个，接回一个，不阻塞整体开发 |

### 2.2 开发顺序

1. **Phase A：壳子** — 页面、路由、步骤、Mock 数据、Loading/Error 占位
2. **Phase B：接回 Drive** — 已有 `/api/drive/*`，确保与现有逻辑兼容
3. **Phase C：接回分镜** — `POST /api/prompt/generate`
4. **Phase D：接回视频** — `POST /api/video/generate` + 轮询
5. **Phase E：接回发布** — `POST /api/publish`（Phase 2）

---

## 三、信息架构与页面结构

### 3.1 页面与路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | Home（主流程） | 多步骤表单，Step 1–5 垂直排列 |
| `/result/:taskId?` | Result | 成片预览、下载、可选发布（Phase 2） |

**当前**：单页 Home，无路由。**建议**：引入 `react-router-dom`，`/` 为 Home，`/result` 为结果页。

### 3.2 主流程步骤（Step 1–5）

| Step | 名称 | 输入 | 输出 | 依赖 API | 当前状态 |
|------|------|------|------|----------|----------|
| **1** | 设置素材库 | Drive 文件夹链接 | 验证通过、folderId | `POST /api/drive/verify-folder` | ✅ 已实现 |
| **2** | 输入创意 | Prompt 文本 | 关键词列表 | 无（本地 keywords.ts） | ✅ 已实现 |
| **3** | 选择素材 | 关键词、folderId | 已选素材（含顺序） | `POST /api/drive/search` | ✅ 已实现 |
| **4** | 生成分镜 | prompt + materials | 分镜文本 | `POST /api/prompt/generate` | ⚠️ 壳子待建 |
| **5** | 生成视频 | 分镜 + materials | taskId → 成片 URL | `POST /api/video/generate` | ⚠️ 壳子待建 |

### 3.3 步骤间状态与跳转

```
Step 1 通过 → 显示 Step 2、3
Step 2、3 完成 → 显示 Step 4（生成分镜）
Step 4 完成（用户确认分镜）→ 显示 Step 5（生成视频）
Step 5 完成 → 跳转 /result?videoUrl=xxx 或 /result/:taskId
```

---

## 四、各步骤 UI 规格（壳子）

### 4.1 Step 1：设置素材库 ✅ 已有

- 输入：Drive 文件夹链接
- 按钮：连接 Google Drive、验证权限
- 状态：idle / verifying / verified / denied
- **保持不变**，仅需确保与后端 `/api/drive/verify-folder` 兼容

### 4.2 Step 2：输入创意 ✅ 已有

- 输入：多行文本（placeholder：例如「血坦拿着武器奔跑的5秒视频」）
- 按钮：提取关键词
- 展示：关键词标签列表
- **保持不变**

### 4.3 Step 3：选择素材 ✅ 已有

- 组件：`DriveMaterialPicker`
- 输入：keywords、folderId、accessToken
- 输出：selectedOrder（`DriveFile[]`），顺序映射 @图片1、@图片2
- **保持不变**

### 4.4 Step 4：生成分镜（壳子待建）

**UI 结构：**

- 标题：「4. 生成分镜」
- 按钮：「生成分镜」（调用 `POST /api/prompt/generate`）
- 内容区：
  - **Loading**：骨架屏或 Spinner，文案「正在生成分镜…」
  - **成功**：可编辑文本框展示 `storyboardText`，底部「确认并使用」
  - **失败**：错误信息 + 重试按钮
  - **Mock 态**（API 未就绪）：展示示例分镜文本，按钮点击后直接进入「成功」态

**交互：**

- 点击「确认并使用」→ 分镜内容写入全局状态，进入 Step 5

### 4.5 Step 5：生成视频（壳子待建）

**UI 结构：**

- 标题：「5. 生成视频」
- 按钮：「开始生成」（调用 `POST /api/video/generate`）
- 内容区：
  - **Loading**：进度条或「正在生成视频，预计 X 分钟…」
  - **轮询中**：显示 taskId、进度百分比（若 API 支持）
  - **成功**：视频预览（`<video>`）+ 「下载」「保存到 Drive」（Phase 2）
  - **失败**：错误信息 + 重试
  - **Mock 态**：模拟 3–5 秒后显示占位视频 + 假下载链接

**交互：**

- 生成成功后 → 跳转 `/result?videoUrl=xxx` 或留在当前页展示预览 + 下载

---

## 五、API 契约（前后端对齐）

### 5.1 分镜生成

**请求**：`POST /api/prompt/generate`

```json
{
  "prompt": "血坦拿着武器奔跑的5秒视频",
  "materials": [
    { "id": "driveFileId1", "name": "血坦.png" },
    { "id": "driveFileId2", "name": "武器.png" }
  ],
  "duration": 5,
  "aspectRatio": "16:9"
}
```

**响应**：

```json
{
  "storyboardText": "【原创数字艺术作品】\n【时长】5秒\n[00:00-00:02] 镜头1：...\n..."
}
```

**Mock 响应**（壳子阶段）：

```json
{
  "storyboardText": "[Mock] 5秒视频分镜\n[00:00-00:02] 角色持武器站立\n[00:02-00:05] 向前奔跑，镜头跟拍"
}
```

### 5.2 视频生成

**请求**：`POST /api/video/generate`

```json
{
  "storyboardText": "【原创数字艺术作品】...",
  "materials": [
    { "id": "driveFileId1", "name": "血坦.png" }
  ],
  "driveToken": "ya29.xxx",
  "duration": 5,
  "aspectRatio": "16:9"
}
```

**响应**（任务创建）：

```json
{
  "taskId": "task-xxx",
  "status": "pending",
  "estimatedTime": 120
}
```

**轮询**：`GET /api/video/status/:taskId` 或 同一接口长轮询

**完成响应**：

```json
{
  "taskId": "task-xxx",
  "status": "completed",
  "videoUrl": "https://xxx/storage/video.mp4"
}
```

**Mock**：3 秒后返回假 `taskId` 与假 `videoUrl`（如 blob 或占位图）

### 5.3 发布（Phase 2）

**请求**：`POST /api/publish`

```json
{
  "videoUrl": "https://xxx/video.mp4",
  "platforms": ["tiktok", "instagram"],
  "caption": "文案",
  "hashtags": ["#tag1", "#tag2"]
}
```

**响应**：

```json
{
  "taskIds": ["geelark-task-1", "geelark-task-2"],
  "status": "submitted"
}
```

---

## 六、状态管理

### 6.1 方案选择

| 方案 | 适用 | 建议 |
|------|------|------|
| **useState 提升** | 步骤少、状态简单 | 当前 Step 1–3 已够用 |
| **Context** | 跨多级组件共享（如 prompt、materials、storyboard） | 建议引入 |
| **Zustand/Redux** | 复杂异步、持久化 | 暂不需要 |

**推荐**：`React Context` 存 `prompt`、`keywords`、`selectedOrder`、`storyboardText`、`videoUrl`，便于 Step 4、5 与 Result 页共享。

### 6.2 流程状态枚举

```typescript
type FlowStep = 'folder' | 'prompt' | 'materials' | 'storyboard' | 'video' | 'result';
type StoryboardStatus = 'idle' | 'loading' | 'success' | 'error';
type VideoStatus = 'idle' | 'submitting' | 'polling' | 'completed' | 'error';
```

---

## 七、组件结构建议

```
h5-video-tool/src/
├── App.tsx                    # 路由 + Provider
├── main.tsx
├── index.css
├── context/
│   └── CreateFlowContext.tsx  # prompt, materials, storyboard, videoUrl
├── pages/
│   ├── Home.tsx               # 主流程（Step 1–5）
│   └── Result.tsx             # 成片预览、下载、发布
├── components/
│   ├── DriveMaterialPicker.tsx  # 已有
│   ├── StepFolder.tsx            # Step 1 抽离（可选）
│   ├── StepPrompt.tsx            # Step 2 抽离（可选）
│   ├── StepMaterials.tsx         # Step 3 抽离（可选）
│   ├── StepStoryboard.tsx        # Step 4 新建
│   ├── StepVideo.tsx             # Step 5 新建
│   ├── LoadingSpinner.tsx       # 通用
│   └── ErrorMessage.tsx         # 通用
├── hooks/
│   ├── useGoogleDrive.ts        # 已有
│   ├── useStoryboard.ts         # 调用 /api/prompt/generate，Mock 支持
│   └── useVideoGenerate.ts      # 调用 /api/video/generate，轮询，Mock 支持
├── api/
│   ├── client.ts                # axios/fetch 封装，baseURL 配置
│   ├── prompt.ts                # prompt API
│   ├── video.ts                 # video API
│   └── mock/                    # Mock 数据（开发阶段）
│       ├── prompt.ts
│       └── video.ts
└── utils/
    ├── keywords.ts              # 已有
    └── driveUrl.ts              # 已有
```

---

## 八、Mock 与 API 切换机制

### 8.1 环境变量

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_USE_MOCK_PROMPT=true    # 分镜 API 未就绪时 true
VITE_USE_MOCK_VIDEO=true     # 视频 API 未就绪时 true
```

### 8.2 调用逻辑

```typescript
// hooks/useStoryboard.ts
const useStoryboard = () => {
  const useMock = import.meta.env.VITE_USE_MOCK_PROMPT === 'true';
  const generate = async (prompt, materials) => {
    if (useMock) return mockGenerateStoryboard(prompt, materials);
    return api.post('/api/prompt/generate', { prompt, materials });
  };
  return { generate, ... };
};
```

### 8.3 切换顺序

1. 壳子完成 → `VITE_USE_MOCK_PROMPT=true`, `VITE_USE_MOCK_VIDEO=true`
2. 分镜 API 就绪 → `VITE_USE_MOCK_PROMPT=false`
3. 视频 API 就绪 → `VITE_USE_MOCK_VIDEO=false`

---

## 九、UI/UX 规范（简要）

### 9.1 视觉

- **框架**：Tailwind CSS（已配置）
- **主色**：蓝色系（与现有 button 一致）
- **布局**：max-w-2xl 居中，卡片式 section
- **响应式**：优先移动端，桌面端舒适阅读

### 9.2 反馈

- **Loading**：步骤内 Spinner 或 Skeleton，禁用按钮防重复提交
- **Error**：红字 + 重试按钮，不阻断其他步骤
- **成功**：✓ 或绿色提示，明确下一步操作

### 9.3 无障碍

- 按钮有明确 `aria-label`
- 表单有 `label` 关联
- 颜色对比度符合 WCAG AA（可选后期优化）

---

## 十、实施优先级

### Phase A：壳子（当前 focus）

| 任务 | 内容 | 预估 |
|------|------|------|
| A1 | 引入 react-router-dom，`/` Home、`/result` Result | 15 min |
| A2 | 创建 CreateFlowContext（prompt、materials、storyboard、videoUrl） | 20 min |
| A3 | 创建 StepStoryboard 组件 + useStoryboard（Mock） | 45 min |
| A4 | 创建 StepVideo 组件 + useVideoGenerate（Mock） | 45 min |
| A5 | 整合 Step 4、5 到 Home，串联流程 | 30 min |
| A6 | 创建 Result 页面（视频预览、下载占位） | 30 min |
| A7 | api/client.ts + mock 数据 | 20 min |

### Phase B：接回 Drive

- 验证现有 Drive 逻辑与后端兼容，无大改动

### Phase C：接回分镜

- `VITE_USE_MOCK_PROMPT=false`，实现真实 `POST /api/prompt/generate`

### Phase D：接回视频

- `VITE_USE_MOCK_VIDEO=false`，实现 `POST /api/video/generate` + 轮询

### Phase E：发布（Phase 2）

- Result 页增加发布区域，接 `POST /api/publish`

---

## 十一、验收标准

### 壳子阶段（Phase A）

- [ ] 可完成 Step 1–5 的完整流程（Mock 数据）
- [ ] Step 4 点击「生成分镜」→ 展示 Mock 分镜 → 确认后进入 Step 5
- [ ] Step 5 点击「开始生成」→ 模拟 Loading → 展示占位预览 → 可「下载」（假）
- [ ] 可跳转 `/result` 并展示占位视频
- [ ] 通过 `VITE_USE_MOCK_*` 可切换 Mock / 真实 API

### API 接回后

- [ ] 分镜为后端真实输出
- [ ] 视频为 Seedance 真实成片
- [ ] 下载链接有效
- [ ] 错误态正确展示（网络错误、API 错误）

---

## 十二、风险与依赖

| 风险 | 缓解 |
|------|------|
| 后端 API 迟迟未就绪 | Mock 完善后可独立演示、联调 |
| Drive Token 过期 | 提示重新连接，或静默刷新（若用 refresh token） |
| 视频生成时间长 | 明确预估时间、支持后台轮询、可关闭浏览器后通过 taskId 查询（若后端支持） |

| 依赖 | 说明 |
|------|------|
| 后端 `/api/drive/*` | 已实现 |
| 后端 `POST /api/prompt/generate` | 待实现 |
| 后端 `POST /api/video/generate` | 待实现 |
| Seedance 2.0 API | 参考 `docs/seedance2-api-reference.md` |

---

## 十三、相关文档

| 文档 | 说明 |
|------|------|
| `docs/plans/2025-03-11-h5-implementation-plan.md` | H5 完整实践路径 |
| `docs/plans/2025-03-11-h5-google-drive-design.md` | Drive 方案设计 |
| `docs/QAS-pipeline-status.md` | Pipeline 进展与卡点 |
| `docs/seedance2-api-reference.md` | Seedance 2.0 API 参考 |

---

**文档结束**
