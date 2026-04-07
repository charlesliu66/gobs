# H5 视频工具 — 手把手傻瓜式部署教程

零基础也能跟着做，每一步都有说明和可复制命令。

---

## 目录

1. [前置准备](#一前置准备)
2. [第一步：本地构建](#二第一步本地构建)
3. [第二步：打包上传](#三第二步打包上传)
4. [第三步：服务器安装环境](#四第三步服务器安装环境)
5. [第四步：配置并启动后端](#五第四步配置并启动后端)
6. [第五步：配置 Nginx](#六第五步配置-nginx)
7. [第六步：配置 Google OAuth](#七第六步配置-google-oauth)
8. [验证与访问](#八验证与访问)
9. [常见问题排查](#九常见问题排查)（含 [9.6 可灵参考视频](#96-可灵参考视频与公网地址配置)）

---

## 一、前置准备

### 1.1 你需要准备的东西

| 项目 | 说明 |
|------|------|
| **云服务器** | 阿里云 / 腾讯云 / AWS 等，系统选 Ubuntu 22.04 或 CentOS 7+ |
| **本地电脑** | Windows / Mac，已安装 Node.js |
| **域名（可选）** | 有域名更好，没有的话用服务器 IP 也能访问 |
| **API 密钥** | 见下方 1.2 |

### 1.2 需要提前申请的 API 密钥

在部署前，请准备好这些（如果本地已经能跑，说明你已有）：

| 密钥 | 获取方式 | 用途 |
|------|----------|------|
| `COMPASS_API_KEY` | 你们内部的 Compass API（与视频/生图共用） | 一键 Prompt、发布文案、视频生成等 |
| `COMPASS_API_URL` | 同上 | Compass 代理根地址，默认 `https://compass.llm.shopee.io/compass-api/v1` |
| `GOOGLE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com/) 创建 OAuth 客户端 | Drive 登录 |
| `GOOGLE_CLIENT_SECRET` | 同上，创建时一起给出 | Drive 登录 |

> 如果本地 `.env` 已经配置好，直接复制 `h5-video-tool-api/.env` 到服务器即可。

### 1.3 确认本地能正常运行

在部署前，先在本地确认项目能跑：

```powershell
# 1. 启动后端
cd c:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool-api
npm run dev

# 2. 新开一个终端，启动前端
cd c:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool
npm run dev

# 3. 浏览器打开 http://localhost:5173，能正常使用再部署
```

---

## 二、第一步：本地构建

在 **本地电脑** 的 QAS 项目根目录执行。

### 2.1 打开 PowerShell 或 CMD

按 `Win + R`，输入 `powershell`，回车。

### 2.2 进入项目目录

```powershell
cd c:\Users\wei.liu\Desktop\cursor_try\QAS
```

> 如果你的项目不在这个路径，改成你的实际路径。

### 2.3 构建前端

```powershell
cd h5-video-tool
npm install
npm run build
```

看到类似 `✓ built in xxx` 表示成功。构建产物在 `h5-video-tool/dist` 文件夹。

### 2.4 构建后端

```powershell
cd ..\h5-video-tool-api
npm install
npm run build
```

看到没有报错即可。构建产物在 `h5-video-tool-api/dist` 文件夹。

### 2.5 创建部署包（可选，方便上传）

```powershell
cd ..
mkdir deploy -Force
Copy-Item -Recurse h5-video-tool\dist deploy\frontend
Copy-Item -Recurse h5-video-tool-api\dist deploy\api
Copy-Item h5-video-tool-api\package.json deploy\api
Copy-Item h5-video-tool-api\.env deploy\api
```

> 如果 `.env` 不存在，先复制：`Copy-Item h5-video-tool-api\.env.example deploy\api\.env`，然后编辑 `deploy\api\.env` 填入密钥。

现在 `deploy` 文件夹里就是部署需要的全部内容。

---

## 三、第二步：打包上传

### 3.1 方式 A：用 WinSCP / FileZilla（推荐新手）

1. 下载 [WinSCP](https://winscp.net/) 或 [FileZilla](https://filezilla-project.org/)
2. 连接服务器：
   - 主机：你的服务器 IP（如 `123.45.67.89`）
   - 用户名：通常是 `root` 或 `ubuntu`
   - 密码：购买服务器时设置的
3. 在服务器上创建目录，例如 `/home/你的用户名/qas-h5`
4. 上传：
   - 把 `deploy/frontend` 里的**所有文件**上传到服务器的 `qas-h5/frontend/`
   - 把 `deploy/api` 里的**所有内容**（含 dist、package.json、.env）上传到 `qas-h5/api/`

### 3.2 方式 B：用 SCP 命令（熟悉命令行可用）

```powershell
# 替换 你的用户名 和 服务器IP 为实际值
scp -r deploy\frontend 你的用户名@服务器IP:/home/你的用户名/qas-h5/
scp -r deploy\api 你的用户名@服务器IP:/home/你的用户名/qas-h5/
```

### 3.3 上传后的目录结构

服务器上应该是这样：

```
/home/你的用户名/qas-h5/
├── frontend/          # 前端静态文件
│   ├── index.html
│   └── assets/
│       ├── index-xxx.js
│       └── index-xxx.css
└── api/               # 后端
    ├── dist/
    │   └── index.js
    ├── package.json
    └── .env
```

---

## 四、第三步：服务器安装环境

用 **SSH** 登录服务器。Windows 可用 PowerShell 自带的 `ssh`，或 [PuTTY](https://www.putty.org/)。

```powershell
ssh 你的用户名@服务器IP
```

### 4.1 安装 Node.js 18+

```bash
# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node -v   # 应显示 v18 或 v20
npm -v
```

### 4.2 安装 PM2（用于后台运行后端）

```bash
sudo npm install -g pm2
```

### 4.3 安装 Nginx（用于托管网页和代理 API）

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install nginx -y

# 验证
sudo systemctl status nginx   # 应显示 active (running)
```

---

## 五、第四步：配置并启动后端

### 5.1 进入 api 目录并安装依赖

```bash
cd /home/你的用户名/qas-h5/api
npm install --production
```

> 把 `你的用户名` 换成你实际的用户名，如 `ubuntu`、`root` 等。

### 5.2 检查 .env 文件

```bash
cat .env
```

确认里面有 `COMPASS_API_KEY`、`GOOGLE_CLIENT_ID` 等（一键 Prompt 与视频共用 Compass Key）。若使用可灵 Omni **参考视频**，还需配置 `API_PUBLIC_BASE_URL`，见 [9.6](#96-可灵参考视频与公网地址配置)。没有的话：

```bash
nano .env
```

按下面格式填写（不要有引号、不要有空格 around `=`）：

```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=你的密钥
COMPASS_API_URL=https://compass.llm.shopee.io/compass-api/v1
COMPASS_API_KEY=你的Compass密钥
PORT=3001
```

保存：`Ctrl+O` 回车，退出：`Ctrl+X`。

### 5.3 启动后端

```bash
pm2 start dist/index.js --name h5-api
```

看到类似：

```
[PM2] Starting dist/index.js in fork_mode (1 instance)
[PM2] Done.
```

### 5.4 验证后端是否正常

```bash
curl http://127.0.0.1:3001/api/health
```

应返回：`{"status":"ok","message":"h5-video-tool-api"}`

### 5.5 设置开机自启

```bash
pm2 save
pm2 startup
```

最后一行会提示你复制一条命令，复制后执行即可。

---

## 六、第五步：配置 Nginx

### 6.1 创建 Nginx 配置文件

```bash
sudo nano /etc/nginx/sites-available/qas-h5
```

### 6.2 粘贴以下内容

**重要：把下面三处改成你的实际值：**

- `你的用户名` → 如 `ubuntu`、`root`
- `你的域名或IP` → 如 `123.45.67.89` 或 `video.yourdomain.com`

```nginx
server {
    listen 80;
    server_name 你的域名或IP;

    root /home/你的用户名/qas-h5/frontend;
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

保存：`Ctrl+O` 回车，退出：`Ctrl+X`。

### 6.3 启用站点并重载 Nginx

```bash
sudo ln -sf /etc/nginx/sites-available/qas-h5 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t` 应显示 `syntax is ok`，没有报错。

---

## 七、第六步：配置 Google OAuth

如果别人访问你的网页时，点击「连接 Google Drive」报错，需要做这一步。

### 7.1 打开 Google Cloud Console

访问：https://console.cloud.google.com/

### 7.2 进入凭据

左侧菜单：**API 和服务** → **凭据**

### 7.3 编辑 OAuth 2.0 客户端 ID

找到类型为「Web 应用」的客户端，点击名称进入编辑。

### 7.4 添加已授权的 JavaScript 来源

在「已授权的 JavaScript 来源」中点击「+ 添加」，填入：

- `http://你的服务器IP`（如 `http://123.45.67.89`）
- 若有域名：`https://你的域名`（如 `https://video.example.com`）

### 7.5 添加已授权的重定向 URI

在「已授权的重定向 URI」中点击「+ 添加」，填入：

- `http://你的服务器IP/`（注意末尾有 `/`）
- 若有域名：`https://你的域名/`

### 7.6 保存

点击「保存」。更改可能需要几分钟生效。

---

## 八、验证与访问

### 8.1 浏览器访问

打开浏览器，输入：

- `http://你的服务器IP`（如 `http://123.45.67.89`）
- 或 `http://你的域名`

### 8.2 应看到

- 视频工坊的页面
- 能选择模板、输入创意
- 能点击「连接 Google Drive」（若已配置 OAuth）
- 能点击「一键 Prompt」生成分镜（需 `COMPASS_API_KEY` 正确）

### 8.3 若打不开

跳到 [九、常见问题排查](#九常见问题排查)。

---

## 九、常见问题排查

### 9.1 502 Bad Gateway

**原因**：Nginx 连不上后端。

**排查**：

```bash
pm2 list
```

看 `h5-api` 是否为 `online`。若是 `stopped` 或 `errored`：

```bash
pm2 logs h5-api
```

看报错信息，通常是 `.env` 里密钥错误或端口被占用。

**处理**：修正 `.env` 后重启：

```bash
pm2 restart h5-api
```

---

### 9.2 页面空白或 404

**原因**：前端路径不对或 Nginx 配置有误。

**排查**：

```bash
ls /home/你的用户名/qas-h5/frontend/
```

应能看到 `index.html` 和 `assets` 文件夹。

**处理**：检查 Nginx 配置里的 `root` 路径是否正确，然后：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### 9.3 连接 Google Drive 失败 / 弹出错误

**原因**：Google OAuth 未添加部署域名。

**处理**：按 [第六步](#六第六步配置-google-oauth) 把 `http://你的IP` 或 `https://你的域名` 加入「已授权的 JavaScript 来源」和「已授权的重定向 URI」。

---

### 9.4 一键 Prompt 失败 / 视频生成失败

**原因**：后端 `.env` 里 API 密钥错误或未配置。

**排查**：

```bash
pm2 logs h5-api
```

看具体报错。

**处理**：检查 `COMPASS_API_KEY`、`COMPASS_API_URL` 是否正确，修改后：

```bash
pm2 restart h5-api
```

---

### 9.5 防火墙 / 安全组未放行 80 端口

**现象**：本地能 ping 通服务器，但浏览器打不开网页。

**处理**：在云服务器控制台找到「安全组」或「防火墙」，添加入站规则：放行 **TCP 80** 端口。

---

### 9.6 可灵参考视频与公网地址配置

**适用**：使用 **clipai.ingarena** 可灵 Omni，且任务里带 **参考视频**（`video_list`，如 TikTok 舞蹈、动作迁移脚本 `scripts/test-kling-motion-ref-two-images.ts`）。

**规则（与代码一致）**：

| 项目 | 说明 |
|------|------|
| 参考视频传参 | **仅支持 http(s) URL**，不可 base64；可灵服务端会 **GET** 拉取该地址。 |
| `API_PUBLIC_BASE_URL` | 填 **本 API 对外的根地址**，**无尾斜杠**，与 `GET /api/video/kling/ref-cache/:uuid` 拼成完整链接。需与 **H5 的 `VITE_API_BASE_URL`** 指向同一套部署（生产即你的域名或 `https://服务器IP` 经 Nginx 反代到 3001）。 |
| 参考视频时长 | ingarena 常见限制：**不超过约 10 秒**，过长会报错（如 `Video duration can not longer than 10s`），需先用剪辑/ffmpeg 裁短。 |

**生产环境**：在 `h5-video-tool-api/.env` 中设置，例如：

```env
API_PUBLIC_BASE_URL=https://你的域名或反代后的API根
```

保存后 **重启后端**（如 `pm2 restart h5-api`）。不要用内网 `10.x.x.x` 作为该值——**公网可灵无法访问**。

**本地调试（ngrok）**：

1. 启动后端：`npm run dev`（端口 **3001**）。
2. 另开终端执行：`ngrok http 3001`（若提示「仅 1 个会话」，请先在 [ngrok Dashboard](https://dashboard.ngrok.com/agents) 关掉旧隧道或改用付费方案）。
3. 打开 ngrok 本地管理页查看隧道（常见端口 **4040** 或 **4041`，以你本机为准）：浏览器访问 `http://127.0.0.1:4040/api/tunnels`（4040 无内容时试 **4041**），在 JSON 里找到 **`public_url`**，形如 `https://xxxx.ngrok-free.app`。
4. 把 **`API_PUBLIC_BASE_URL`** 设为该 **https 根地址**（无路径、无尾斜杠），保存 `.env` 并 **重启** 后端进程。
5. **每次重启 ngrok，子域名常会变化**，需重复 3～4 步更新 `.env`，否则可灵拉取参考视频会失败（如 `Something went wrong when we tried to get the contents of the file`）。

**验证 ref-cache 是否可被外网拉取**（把 `你的ngrok域名` 和 `uuid` 换成实际值）：

```text
https://你的ngrok域名/api/video/kling/ref-cache/某个uuid
```

浏览器或 `curl` 应能拿到 **MP4**（非 HTML 警告页）。若 ngrok 免费版对自动化请求返回拦截页，可换 **固定域名的内网穿透** 或 **部署到公网服务器** 后使用真实 `https://你的域名`。

---

## 十、一键脚本（可选）

### 10.1 本地一键构建 + 打包

在项目根目录创建 `scripts/build-deploy.ps1`，内容：

```powershell
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

Write-Host "=== 1. 构建前端 ===" -ForegroundColor Cyan
Set-Location "$root\h5-video-tool"
npm run build

Write-Host "`n=== 2. 构建后端 ===" -ForegroundColor Cyan
Set-Location "$root\h5-video-tool-api"
npm run build

Write-Host "`n=== 3. 打包 deploy ===" -ForegroundColor Cyan
$deploy = "$root\deploy"
Remove-Item -Recurse -Force $deploy -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path "$deploy\frontend" | Out-Null
New-Item -ItemType Directory -Force -Path "$deploy\api" | Out-Null
Copy-Item -Recurse "$root\h5-video-tool\dist\*" "$deploy\frontend\"
Copy-Item -Recurse "$root\h5-video-tool-api\dist\*" "$deploy\api\"
Copy-Item "$root\h5-video-tool-api\package.json" "$deploy\api\"
if (Test-Path "$root\h5-video-tool-api\.env") {
    Copy-Item "$root\h5-video-tool-api\.env" "$deploy\api\"
} else {
    Copy-Item "$root\h5-video-tool-api\.env.example" "$deploy\api\.env"
    Write-Host "请编辑 deploy\api\.env 填入密钥！" -ForegroundColor Yellow
}

Write-Host "`n=== 完成！===" -ForegroundColor Green
Write-Host "deploy 文件夹已生成，上传 frontend 和 api 到服务器即可。" -ForegroundColor Gray
```

使用：

```powershell
cd c:\Users\wei.liu\Desktop\cursor_try\QAS
.\scripts\build-deploy.ps1
```

### 10.2 服务器一键启动脚本

在服务器 `qas-h5` 目录创建 `start.sh`：

```bash
#!/bin/bash
cd /home/你的用户名/qas-h5/api
npm install --production
pm2 delete h5-api 2>/dev/null || true
pm2 start dist/index.js --name h5-api
pm2 save
echo "后端已启动，用 pm2 list 查看状态"
```

使用：

```bash
chmod +x start.sh
./start.sh
```

---

## 十一、检查清单（部署前对照）

- [ ] 本地能正常运行（前后端都启动，浏览器能访问）
- [ ] 已准备好 COMPASS_API_KEY、GOOGLE_CLIENT_ID 等
- [ ] 已购买/拥有云服务器，能 SSH 登录
- [ ] 服务器安全组已放行 80 端口
- [ ] 已按步骤完成 Nginx 配置
- [ ] 若用 Drive，已在 Google Console 添加部署域名
- [ ] 若用可灵参考视频 / ref-cache：已设置 `API_PUBLIC_BASE_URL` 为**公网可访问**的 API 根（与 `VITE_API_BASE_URL` 一致；本地 ngrok 见 [9.6](#96-可灵参考视频与公网地址配置)）

---

有问题可参考 `docs/h5-deploy-guide.md` 的常见问题，或查看 `DEPLOY.md`。
