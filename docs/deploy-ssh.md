# QAS H5 SSH 服务器部署指南

> 状态：历史参考。当前正式发布请优先使用
> `docs/guides/2026-04-23-single-owner-staging-prod-release-runbook.md`。
> 线上服务器已拆分为 `/home/ubuntu/qas-h5/staging/*` 与
> `/home/ubuntu/qas-h5/prod/*`，PM2 进程分别为 `qas-api-staging`
> 和 `qas-api-prod`；不要再按本文早期示例直接部署到
> `/home/ubuntu/qas-h5/api` 或重启旧 `qas-api`。

将 QAS H5 部署到已通过 SSH 连接的远程服务器。

## 一、架构说明

QAS H5 由两部分组成：
- **h5-video-tool**：前端（Vite + React），构建后为静态文件
- **h5-video-tool-api**：后端 API（Express，默认端口 3001）

部署方式：前端静态文件 + Nginx 反向代理 `/api` 到后端。

---

## 二、服务器前置要求

- Node.js 18+（建议用 nvm 或直接安装）
- 可选：Nginx（用于反向代理，也可用 Node 的 serve + PM2 组合）
- 可选：PM2（用于持久化运行 API）

---

## 三、部署步骤

### 1. 在本地打包并上传

**方式 A：用 SCP 上传**

```powershell
# 在 QAS 项目根目录执行

# 1. 本地构建
cd h5-video-tool
npm run build
cd ..

cd h5-video-tool-api
npm run build
cd ..

# 2. 上传到服务器（替换 user@host 为你的 SSH 信息）
scp -r h5-video-tool/dist user@host:/home/user/qas-h5/frontend
scp -r h5-video-tool-api/dist user@host:/home/user/qas-h5/api
scp -r h5-video-tool-api/node_modules user@host:/home/user/qas-h5/  # 或到服务器再 npm install
scp h5-video-tool-api/.env.example user@host:/home/user/qas-h5/.env.example
```

**方式 B：用 rsync（更高效）**

```powershell
# 先本地构建
cd c:\Users\wei.liu\Desktop\cursor_try\QAS
cd h5-video-tool && npm run build && cd ..
cd h5-video-tool-api && npm run build && cd ..

# 上传（Windows 下若没有 rsync 可装 Git Bash 或 WSL）
rsync -avz --exclude node_modules h5-video-tool/dist/ user@host:/home/user/qas-h5/frontend/
rsync -avz h5-video-tool-api/ user@host:/home/user/qas-h5/api/ --exclude node_modules
```

**方式 C：在服务器上 git clone（若项目在 Git 仓库）**

```bash
# SSH 登录后
git clone <你的仓库地址> qas-h5
cd qas-h5
```

---

### 2. SSH 登录服务器后操作

```bash
# 创建工作目录
mkdir -p /home/你的用户名/qas-h5
cd /home/你的用户名/qas-h5

# 若用方式 A/B 上传，目录结构应类似：
# qas-h5/
# ├── frontend/     # h5-video-tool/dist 内容
# ├── api/          # h5-video-tool-api（含 dist、package.json）
# └── .env          # 从 .env.example 复制后填写
```

### 3. 安装依赖并配置

```bash
cd /home/你的用户名/qas-h5/api
npm install --production

# 复制环境变量
cp .env.example .env
nano .env   # 或 vim，填入 COMPASS_API_KEY、SEEDANCE_API_KEY 等
```

### 4. 运行 API（PM2 推荐）

```bash
# 安装 PM2（若未安装）
npm install -g pm2

# 启动 API
cd /home/你的用户名/qas-h5/api
pm2 start dist/index.js --name qas-api

# 设置开机自启
pm2 save
pm2 startup
```

### 5. 提供前端静态文件并代理 API

**方案 A：使用 Nginx**

```bash
# 安装 Nginx（若未安装）
# Ubuntu/Debian:
sudo apt update && sudo apt install nginx -y

# 创建配置
sudo nano /etc/nginx/sites-available/qas-h5
```

写入：

```nginx
server {
    listen 80;
    server_name 你的域名或IP;

    # 前端静态文件
    root /home/你的用户名/qas-h5/frontend;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        client_max_body_size 50M;
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/qas-h5 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**方案 B：不用 Nginx，用 Node 的 serve + 同域代理**

若不想装 Nginx，可用 `serve` 提供静态文件，但前端需配置 `VITE_API_BASE_URL` 指向同一域名。构建时：

```powershell
# 本地构建时设置 API 地址（若前后端同域可留空）
$env:VITE_API_BASE_URL=""
cd h5-video-tool
npm run build
```

然后用 Nginx 或 Caddy 做统一入口，或单独用 serve 跑前端（需解决 CORS，不推荐）。

**推荐使用 Nginx 方案**。

---

## 四、构建时前端 API 地址

若 **前端和 API 在同一域名**（通过 Nginx 代理 /api），构建时**不需要**设置 `VITE_API_BASE_URL`，默认为空时使用相对路径 `/api`。

若 **前端和 API 不同域**，构建前设置：

```powershell
# PowerShell
$env:VITE_API_BASE_URL="https://api.你的域名.com"
cd h5-video-tool
npm run build
```

---

## 五、一键部署脚本（可选）

在项目根目录创建 `scripts/deploy-ssh.ps1`，可简化上传步骤。需将 `USER`、`HOST`、`REMOTE_PATH` 替换为实际值后使用。

---

## 六、验证

1. 浏览器访问 `http://你的服务器IP或域名`
2. 应能看到 QAS H5 界面
3. 尝试生成视频、连接 Drive 等，确认 API 正常

---

## 七、常见问题

| 问题 | 处理 |
|------|------|
| 502 Bad Gateway | 检查 PM2 中 `qas-api` 是否运行：`pm2 list` |
| 前端空白/404 | 检查 Nginx root 路径、`try_files` 配置 |
| CORS 错误 | 确保 API 请求走同一域名的 `/api`，由 Nginx 代理 |
| 视频生成失败 | 检查 `.env` 中 `COMPASS_API_KEY`、`COMPASS_API_URL` 等是否填写正确 |

---

## 八、目录结构参考

```
服务器 /home/user/qas-h5/
├── frontend/           # h5-video-tool 的 dist 输出
│   ├── index.html
│   └── assets/
├── api/                # h5-video-tool-api
│   ├── dist/
│   ├── node_modules/
│   ├── package.json
│   └── .env
└── .env.example
```
