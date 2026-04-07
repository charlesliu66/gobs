# H5 视频工具 - 云服务器部署说明

## 一、包内结构

```
h5-deploy-*.zip
├── h5-video-tool-api/     # 后端 API（Node.js + Express）
│   ├── src/
│   ├── dist/              # 已编译输出
│   ├── scripts/
│   ├── package.json
│   ├── .env.example       # 配置模板，部署时复制为 .env 并填写
│   └── ...
├── h5-video-tool/         # 前端（React + Vite）
│   ├── src/
│   ├── dist/              # 已构建静态文件
│   ├── package.json
│   ├── .env.example
│   └── ...
└── DEPLOY.md              # 本说明
```

## 二、部署步骤

### 1. 解压上传

```bash
unzip h5-deploy-*.zip
cd h5-deploy-*
```

### 2. 后端部署（h5-video-tool-api）

```bash
cd h5-video-tool-api

# 复制配置模板并填写
cp .env.example .env
# 编辑 .env，填入 COMPASS_API_KEY、GOOGLE_CLIENT_ID 等

# 安装依赖
npm install --production

# 若 dist 未包含或需重新编译
npm run build

# 启动（生产环境建议用 pm2）
npm start
# 或：node dist/index.js
```

后端默认监听 3001 端口。

### 3. 前端部署（两种方式）

方式 A：使用已构建的 dist（推荐）

```bash
cd h5-video-tool

# 若 dist 未包含，需先构建
npm install
npm run build

# 用 Nginx 或任意静态服务器托管 dist 目录
# 示例：用 serve 快速预览
npx serve dist -p 5173
```

方式 B：用 Nginx 反向代理前后端

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态
    location / {
        root /path/to/h5-video-tool/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. 前端环境变量（生产）

在 `h5-video-tool` 目录创建 `.env`，参考 `.env.example`：

```env
# 必填：Google OAuth Client ID（连接 Drive 用）
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# 可选：Drive 素材文件夹 ID
VITE_DRIVE_FOLDER_ID=

# 生产环境关闭 Mock
VITE_USE_MOCK_PROMPT=false
VITE_USE_MOCK_VIDEO=false

# 若前后端同域，可留空；否则填 API 地址，如 https://api.your-domain.com
VITE_API_BASE_URL=
```

修改后需重新 `npm run build` 才会生效。

## 三、后端 .env 必填项

| 变量 | 说明 |
|------|------|
| COMPASS_API_KEY | Compass 密钥（一键 Prompt / 视频等，与 h5-video-tool-api 一致） |
| GOOGLE_CLIENT_ID | Google OAuth 客户端 ID |
| GOOGLE_CLIENT_SECRET | Google OAuth 客户端密钥 |
| PORT | 服务端口，默认 3001 |

可选：SEEDANCE_*、GEELARK_*、COMPASS_* 等，见 `.env.example`。

## 四、PM2 生产运行（推荐）

```bash
# 安装 pm2
npm install -g pm2

# 启动后端
cd h5-video-tool-api
pm2 start dist/index.js --name h5-api

# 保存配置
pm2 save
pm2 startup
```

## 五、功能清单

- **Prompt 输入**：关键词提取、模板选择
- **Drive 素材**：Google Drive 连接、素材检索与选择
- **分镜/脚本**：Prompt 润色、分镜解析
- **视频生成**：Compass/Remix 等接口
- **GeeLark 分发**：云手机、任务管理、批量发布

## 六、云服务器与素材存储（Ubuntu 示例）

1. **不要用密码登录**：在云平台修改默认密码，改用 **SSH 公钥** 登录；勿将口令写入仓库或文档。
2. **挂载数据盘（可选）**：控制台挂载云硬盘后，例如挂载到 `/data`，并设置属主：
   ```bash
   sudo mkdir -p /data/qas
   sudo chown -R ubuntu:ubuntu /data/qas
   ```
3. **后端 `.env` 增加**（与 `PORT`、`COMPASS_API_KEY` 等一并配置）：
   ```env
   API_DATA_DIR=/data/qas
   ```
   则上传与生成文件会落在：
   - `/data/qas/uploads/`（剪辑上传、即梦缓存等）
   - `/data/qas/output/`（生成视频、可灵缓存等，除非另设 `VIDEO_OUTPUT_DIR`）
4. **进程管理**：与上文一致，使用 `pm2 start dist/index.js --name h5-api`，工作目录为 `h5-video-tool-api`。
5. **防火墙 / 安全组**：放行 **80/443**（Nginx）及 **3001**（若未走反向代理则按需开放；推荐仅本机访问 3001，由 Nginx 对外暴露 80/443）。
6. **前端 `VITE_API_BASE_URL`**：若前后端同机且 Nginx 反代 `/api`，可留空；若 API 单独域名，填 `https://api.你的域名`。

## 七、常见问题

1. **CORS 报错**：确保后端 `cors()` 已启用，或 Nginx 正确代理 `/api`
2. **Google OAuth 失败**：在 Google Cloud Console 添加生产域名到「已授权的 JavaScript 来源」
3. **端口占用**：修改 `h5-video-tool-api/.env` 中的 `PORT`
