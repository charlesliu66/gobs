# H5 视频工具 — 网页部署指南

将 H5 视频工具部署为可公网访问的网页，供他人使用。

> **手把手傻瓜式教程**：零基础可跟做，见 [h5-deploy-guide-detailed.md](./h5-deploy-guide-detailed.md)

---

## 一、部署架构

```
用户浏览器
    ↓
  Nginx（80/443）
    ├── /        → 前端静态文件（h5-video-tool/dist）
    └── /api     → 后端 API（h5-video-tool-api，端口 3001）
```

---

## 二、部署方式选择

| 方式 | 适用场景 | 难度 |
|------|----------|------|
| **云服务器 + Nginx** | 自有服务器、内网/公网 | ⭐⭐ |
| **Render / Railway** | 快速上线、无服务器 | ⭐ |
| **Docker** | 容器化、多环境 | ⭐⭐⭐ |

---

## 三、方式一：云服务器 + Nginx（推荐）

### 1. 本地构建

```powershell
# 在 QAS 项目根目录
cd h5-video-tool
npm install
npm run build

cd ../h5-video-tool-api
npm install
npm run build
```

### 2. 上传到服务器

将以下内容上传到服务器（如 `/home/user/qas-h5/`）：

- `h5-video-tool/dist/` → `frontend/`
- `h5-video-tool-api/dist/`、`package.json`、`node_modules`（或到服务器再 `npm install`）→ `api/`
- `h5-video-tool-api/.env`（从 `.env.example` 复制并填写）

### 3. 服务器上启动后端

```bash
cd /home/user/qas-h5/api
npm install --production   # 若未上传 node_modules
pm2 start dist/index.js --name h5-api
pm2 save && pm2 startup
```

### 4. 配置 Nginx

```bash
sudo nano /etc/nginx/sites-available/qas-h5
```

写入：

```nginx
server {
    listen 80;
    server_name 你的域名或IP;

    root /home/user/qas-h5/frontend;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }
}
```

启用并重载：

```bash
sudo ln -sf /etc/nginx/sites-available/qas-h5 /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5. 访问

浏览器打开 `http://你的域名或IP` 即可使用。

---

## 四、方式二：Render / Railway（无服务器）

### Render

1. **后端**：新建 Web Service，连接 Git 仓库，根目录选 `h5-video-tool-api`
   - Build: `npm install && npm run build`
   - Start: `node dist/index.js`
   - 在 Environment 中配置 `.env` 变量

2. **前端**：新建 Static Site，根目录选 `h5-video-tool`
   - Build: `npm install && npm run build`
   - Publish: `dist`
   - 环境变量：`VITE_API_BASE_URL=https://你的后端服务名.onrender.com`

### Railway

类似，分别部署前后端，前端构建时设置 `VITE_API_BASE_URL` 指向后端地址。

---

## 五、必填环境变量

### 后端（h5-video-tool-api/.env）

| 变量 | 说明 |
|------|------|
| `COMPASS_API_KEY` | Compass 密钥（一键 Prompt、文案与视频/生图共用） |
| `COMPASS_API_URL` | Compass 代理根地址（默认见 `.env.example`） |
| `GOOGLE_CLIENT_ID` | Google OAuth 客户端 ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 客户端密钥 |
| `PORT` | 端口，默认 3001 |

### 前端（h5-video-tool/.env，构建前）

| 变量 | 说明 |
|------|------|
| `VITE_GOOGLE_CLIENT_ID` | 与后端一致，用于 Drive 登录 |
| `VITE_API_BASE_URL` | 前后端同域留空；不同域填后端地址 |

---

## 六、Google OAuth 配置（重要）

部署后若 Drive 登录失败，需在 [Google Cloud Console](https://console.cloud.google.com/) 中：

1. 打开 **API 和服务 → 凭据**
2. 编辑 OAuth 2.0 客户端 ID
3. 在 **已授权的 JavaScript 来源** 中添加：
   - `http://你的域名`
   - `https://你的域名`（若用 HTTPS）
4. 在 **已授权的重定向 URI** 中添加：
   - `http://你的域名/`（或实际回调路径）

---

## 七、HTTPS（可选）

使用 Let's Encrypt 免费证书：

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d 你的域名.com
```

---

## 八、一键构建脚本（本地）

在项目根目录创建 `scripts/build-for-deploy.ps1`：

```powershell
# 构建前后端，输出到 deploy 目录
$ErrorActionPreference = "Stop"
Write-Host "Building frontend..."
Push-Location h5-video-tool
npm run build
Pop-Location

Write-Host "Building backend..."
Push-Location h5-video-tool-api
npm run build
Pop-Location

New-Item -ItemType Directory -Force -Path deploy
Copy-Item -Recurse h5-video-tool/dist deploy/frontend
Copy-Item -Recurse h5-video-tool-api/dist deploy/api
Copy-Item h5-video-tool-api/package.json deploy/api
Copy-Item h5-video-tool-api/.env.example deploy/api

Write-Host "Done. deploy/ contains frontend and api."
```

---

## 九、常见问题

| 问题 | 处理 |
|------|------|
| 502 Bad Gateway | 检查后端是否运行：`pm2 list` |
| 前端空白 | 检查 Nginx root 路径、`try_files` |
| Drive 登录失败 | 检查 Google OAuth 已授权来源/重定向 |
| 视频生成失败 | 检查 COMPASS_* 等环境变量 |
