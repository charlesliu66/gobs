# H5 视频工具 - Google Drive 连接配置

**实现日期**: 2025-03-12  
**状态**: Task 1.2 已完成

## 快速启动

### 1. 配置 Google OAuth

1. 打开 [Google Cloud Console](https://console.cloud.google.com)
2. 创建项目或选择已有项目
3. 启用 **Google Drive API**
4. 创建 **OAuth 2.0 客户端 ID**（Web 应用）
5. 配置授权重定向 URI：
   - 本地开发：`http://localhost:5173`
   - 生产环境：按实际部署域名添加

### 2. 配置环境变量

**前端** `h5-video-tool/.env`：

```env
VITE_GOOGLE_CLIENT_ID=你的客户端ID.apps.googleusercontent.com
```

**后端** `h5-video-tool-api/.env`（已有 `.env.example`）：

- `COMPASS_API_KEY`：一键 Prompt / 文案等 LLM 与视频生成共用（Compass Gemini 代理），见 `h5-video-tool-api/.env.example`
- `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` 可选，Drive 搜索使用用户 token，后端仅做代理

### 3. 启动服务

```powershell
# 终端 1：后端
cd h5-video-tool-api; npm run dev

# 终端 2：前端
cd h5-video-tool; npm run dev
```

前端默认 `http://localhost:5173`，API 请求通过 Vite 代理到 `http://localhost:3001`。

## 功能说明

- **连接 Drive**：点击「连接 Google Drive」→ 弹窗授权（`drive.readonly`）
- **搜索素材**：提取关键词后，点击「搜索素材」→ 后端代理调用 Drive API 按文件名搜索图片/视频
- **选择与顺序**：点击卡片勾选，选择顺序即 @图片1、@图片2… 映射顺序

## 限定文件夹（可选）

后端 `POST /api/drive/search` 支持 `folderId` 参数，可在指定文件夹内搜索。前端暂未暴露该选项，可按需在 UI 增加输入框（例如你分享的 `1uheTxSsNG0Ym-_o5dj8RKAPVMVpkOoBr`）。
