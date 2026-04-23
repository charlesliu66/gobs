# QAS 单人多电脑发布 Runbook

> 版本：2026-04-23
> 适用对象：单人维护、可在多台电脑开发与发布的 QAS/GOBS 管理员
> 目标：把“开发 -> 测试环境 -> 正式环境 -> 发布提示 -> 回滚”固定成一套可重复执行的生产流程

---

## 1. 核心原则

这套流程默认你是单人维护，但可能在家里电脑、公司电脑、临时发布电脑之间切换。为了避免“代码在这台，发布在那台，线上跑的是第三个版本”，先固定 5 条原则：

1. GitHub `main` 是唯一发布真源。
2. 只有已经 `push` 到 GitHub 的 commit 才允许发布。
3. `staging` 先发、先验，再发 `prod`。
4. 正式发布前必须先打开发布提示，再开始发 `prod`。
5. 任意一台电脑都能发布，但每次发布只能选定一台“当前发布电脑”。

一句话理解：

**开发可以分散在多台电脑，发布必须围绕同一个 GitHub commit 收口。**

---

## 2. 环境约定

### 2.1 线上入口

- 正式环境：`http://43.134.186.196`
- 测试环境：`http://43.134.186.196:8080`

### 2.2 服务器目录

- 正式后端：`/home/ubuntu/qas-h5/prod/api`
- 正式前端：`/home/ubuntu/qas-h5/prod/frontend`
- 正式数据：`/home/ubuntu/qas-h5/prod/shared-data`
- 测试后端：`/home/ubuntu/qas-h5/staging/api`
- 测试前端：`/home/ubuntu/qas-h5/staging/frontend`
- 测试数据：`/home/ubuntu/qas-h5/staging/shared-data`

### 2.3 PM2 进程

- 正式：`qas-api-prod`
- 测试：`qas-api-staging`

### 2.4 运行时识别

发布后请用这两个标记确认环境是否正确：

- 测试环境底部版本应类似：`GOBS [STAGING] main@xxxxxxx`
- 正式环境底部版本应类似：`GOBS [PROD] main@xxxxxxx`

---

## 3. 每台发布电脑的一次性准备

每台“可能拿来发布”的电脑都需要一次性准备。开发电脑可以很多台，但只有完成下面配置的电脑，才算“可发布电脑”。

### 3.1 拉取仓库

```powershell
git clone https://github.com/charlesliu66/gobs.git
cd gobs
git switch main
git pull --ff-only origin main
```

### 3.2 安装依赖

```powershell
cd h5-video-tool-api
npm install
cd ..\h5-video-tool
npm install
cd ..
```

### 3.3 配置本机发布凭据

把 [scripts/deploy.env.example](/C:/Users/wei.liu/Desktop/cursor_try/QAS/scripts/deploy.env.example) 复制为本机自己的 `scripts/.env`，填入真实密码。`scripts/.env` 会被 git 忽略，不要提交。

建议最少包含下面这些变量：

```env
SERVER_HOST=43.134.186.196
SERVER_USER=ubuntu
SERVER_PASSWORD=<你的真实密码>

DEPLOY_STAGING_API_DIR=/home/ubuntu/qas-h5/staging/api
DEPLOY_STAGING_FRONTEND_DIR=/home/ubuntu/qas-h5/staging/frontend
DEPLOY_STAGING_PM2_NAME=qas-api-staging
DEPLOY_STAGING_VERSION_URL=http://43.134.186.196:8080/api/system/version

DEPLOY_PROD_API_DIR=/home/ubuntu/qas-h5/prod/api
DEPLOY_PROD_FRONTEND_DIR=/home/ubuntu/qas-h5/prod/frontend
DEPLOY_PROD_PM2_NAME=qas-api-prod
DEPLOY_PROD_VERSION_URL=http://43.134.186.196/api/system/version
```

### 3.4 验证这台电脑具备发布能力

```powershell
python scripts/set_deployment_state.py --target staging --show
python scripts/set_deployment_state.py --target prod --show
python scripts/deploy_all.py --help
```

如果上面 3 条都能跑通，这台电脑就可以承担发布。

---

## 4. 日常开发流程

### 4.1 任意电脑开发

你可以在任意一台电脑上开发，但建议遵守下面的节奏：

1. 从最新 `main` 拉新分支。
2. 在功能分支上开发、自测。
3. 更新 `PRODUCT.md`。
4. `git commit`。
5. `git push origin <feature-branch>`。
6. 合并回 `main`。

如果你暂时不走 PR，也至少保证：

- `main` 上的 commit 是可发布的
- 不把半成品直接 push 到 `main`

### 4.2 发布只认 `main`

后续 `staging` 和 `prod` 发布，都只从 `main` 发，不从临时分支直接发。

原因很简单：

- 你会在不同电脑开发
- 临时分支容易和正式发布 commit 脱节
- `main` 统一后，测试环境和正式环境更容易比对

---

## 5. 每次发布前的预检

无论是发 `staging` 还是发 `prod`，都先做一次预检。

### 5.1 选定“当前发布电脑”

一次发布只能选一台电脑执行，不要在电脑 A 部署一半，再去电脑 B 补后半段。

### 5.2 更新到最新 `main`

```powershell
git switch main
git pull --ff-only origin main
```

### 5.3 确认工作区干净

```powershell
git status --short
```

要求：

- 当前发布电脑用于发布的仓库应尽量干净
- 如果当前工作区有未完成改动，换一个干净 worktree 或干净 clone 再发布

### 5.4 记下本次准备发布的 commit

```powershell
git rev-parse --short HEAD
```

### 5.5 看线上当前版本

```powershell
Invoke-WebRequest -UseBasicParsing http://43.134.186.196:8080/api/system/version | Select-Object -ExpandProperty Content
Invoke-WebRequest -UseBasicParsing http://43.134.186.196/api/system/version | Select-Object -ExpandProperty Content
```

这一步要回答 3 个问题：

1. 本地 `HEAD` 是哪个 commit
2. 当前 `staging` 是哪个 commit
3. 当前 `prod` 是哪个 commit

如果你连这 3 个版本关系都说不清，就不要发版。

---

## 6. 标准发布流程：开发 -> 测试环境 -> 正式环境

### 6.1 第一步：本地验证

```powershell
cd h5-video-tool-api
npx tsc --noEmit
node --test --import tsx tests/deploymentState.test.ts
cd ..

cd h5-video-tool
npm run build
node --test tests/deploymentBanner.test.ts
cd ..

python -m unittest scripts.tests.test_deploy_config scripts.tests.test_server_layout scripts.tests.test_init_dual_env_server scripts.tests.test_set_deployment_state
```

如果这一步没过，不进入部署。

### 6.2 第二步：发布到测试环境

```powershell
python scripts/deploy_all.py --target staging
```

发布完成后，再看一次测试环境版本：

```powershell
Invoke-WebRequest -UseBasicParsing http://43.134.186.196:8080/api/system/version | Select-Object -ExpandProperty Content
```

要求：

- `commitShort` 应与本地 `HEAD` 一致
- `environment` 应为 `staging`

### 6.3 第三步：测试环境自测

至少检查下面这些点：

1. 首页能正常打开
2. 登录正常
3. 关键主链路正常
4. 测试环境底部版本显示 `STAGING`
5. 如果你主动打开了测试环境提示条，顶部 banner 显示正常

只有 `staging` 验证通过，才能继续发 `prod`。

### 6.4 第四步：正式发布前打开提醒

先把正式环境切到 `preparing`，给正在使用的同学留 3 到 5 分钟缓冲。

```powershell
python scripts/set_deployment_state.py --target prod --phase preparing --updated-by wei.liu
```

如果你想自定义文案，可以这样：

```powershell
python scripts/set_deployment_state.py --target prod --phase preparing --updated-by wei.liu --message-zh "系统将在 5 分钟后发布更新，请先保存当前工作。" --message-en "The system will be updated in about 5 minutes. Please save your current work first."
```

建议等待 3 到 5 分钟，再继续。

### 6.5 第五步：正式发布窗口

正式开始发版时，先把状态切到 `deploying`：

```powershell
python scripts/set_deployment_state.py --target prod --phase deploying --updated-by wei.liu
```

然后发布正式环境：

```powershell
python scripts/deploy_all.py --target prod
```

发布完成后，把状态切到 `verifying`：

```powershell
python scripts/set_deployment_state.py --target prod --phase verifying --updated-by wei.liu
```

### 6.6 第六步：正式环境验收

至少检查：

1. `prod` 首页可打开
2. 登录正常
3. 一条关键业务主链路可跑通
4. 正式环境底部版本显示 `PROD`
5. 正式环境版本号已经是本次发布的 commit

验证命令：

```powershell
Invoke-WebRequest -UseBasicParsing http://43.134.186.196/api/system/version | Select-Object -ExpandProperty Content
Invoke-WebRequest -UseBasicParsing http://43.134.186.196/api/system/deployment-state | Select-Object -ExpandProperty Content
```

### 6.7 第七步：关闭正式环境提示

确认没问题后，把正式环境切回 `idle`：

```powershell
python scripts/set_deployment_state.py --target prod --phase idle --updated-by wei.liu
```

到这里，一次完整发布结束。

---

## 7. 标准回滚流程

如果正式环境发布后发现问题，按下面顺序回滚。

### 7.1 找到上一个稳定 commit

可以从 GitHub、`git log` 或正式环境旧版本记录里找。

```powershell
git log --oneline -20
```

### 7.2 切正式环境到 `deploying`

```powershell
python scripts/set_deployment_state.py --target prod --phase deploying --updated-by wei.liu --message-zh "系统正在回滚到上一稳定版本，请稍候。" --message-en "The system is rolling back to the previous stable version. Please wait."
```

### 7.3 切到目标 commit 并重新部署

```powershell
git checkout <good-sha>
python scripts/deploy_all.py --target prod
```

### 7.4 回滚后验证

```powershell
Invoke-WebRequest -UseBasicParsing http://43.134.186.196/api/system/version | Select-Object -ExpandProperty Content
```

确认正式环境已经回到目标 commit 后：

```powershell
python scripts/set_deployment_state.py --target prod --phase verifying --updated-by wei.liu
python scripts/set_deployment_state.py --target prod --phase idle --updated-by wei.liu
git switch main
```

---

## 8. 多电脑切换规则

这是这份 Runbook 最重要的部分。

### 8.1 每台电脑都要各自准备 `scripts/.env`

不要以为“这台能开发”就等于“这台能发布”。发布能力是按电脑准备的，不是按 Git 账号自动继承的。

### 8.2 不发布本地独有 commit

禁止下面这种情况：

1. 电脑 A 本地改了代码
2. 没 push
3. 直接从电脑 A 发 `staging` 或 `prod`

正确做法：

1. 本地改完
2. `git commit`
3. `git push`
4. 用 GitHub 上已经存在的 commit 作为发布对象

### 8.3 不跨电脑拆一半流程

禁止下面这种情况：

1. 电脑 A 把 `prod` 切到 `preparing`
2. 电脑 B 才开始真正部署

正确做法：

- 选定本次发布电脑后，从预检到关闭 `idle` 全流程在同一台机器完成

### 8.4 换电脑时重新做预检

只要发布电脑变了，就重新执行：

```powershell
git switch main
git pull --ff-only origin main
git status --short
git rev-parse --short HEAD
python scripts/set_deployment_state.py --target staging --show
python scripts/set_deployment_state.py --target prod --show
```

---

## 9. 常用命令速查

### 看当前发布状态

```powershell
python scripts/set_deployment_state.py --target staging --show
python scripts/set_deployment_state.py --target prod --show
```

### 打开正式环境发布前提醒

```powershell
python scripts/set_deployment_state.py --target prod --phase preparing --updated-by wei.liu
```

### 标记正式环境正在发布

```powershell
python scripts/set_deployment_state.py --target prod --phase deploying --updated-by wei.liu
```

### 标记正式环境进入验证期

```powershell
python scripts/set_deployment_state.py --target prod --phase verifying --updated-by wei.liu
```

### 关闭正式环境提醒

```powershell
python scripts/set_deployment_state.py --target prod --phase idle --updated-by wei.liu
```

### 发布测试环境

```powershell
python scripts/deploy_all.py --target staging
```

### 发布正式环境

```powershell
python scripts/deploy_all.py --target prod
```

---

## 10. 最后一句提醒

以后每次发版，都先问自己这 4 句：

1. 这次准备发的 commit 是多少？
2. 这个 commit 已经在 GitHub `main` 上了吗？
3. `staging` 已经验证通过了吗？
4. `prod` 的提醒已经提前打开了吗？

这 4 句都能回答清楚，再发版，基本就不会乱。
