# Staging / Production Deployment Design

更新时间：2026-04-23

## 目标

为 QAS/GOBS 当前的单机腾讯云部署补齐两套明确分工的环境：

1. `staging`：用于开发完成后的自测、回归、验收。
2. `prod`：用于对外正式使用。

同时补齐“从测试环境推到正式环境”期间的用户提示能力，让正在使用正式环境的同学能够提前收到提醒，并在真正切换窗口内获得清晰的状态提示。

本设计优先兼容现有约束：

- 单台云服务器
- `Nginx + PM2 + SFTP(paramiko)` 部署
- 服务器无 git，依赖本地构建产物上传
- 前后端继续沿用当前目录结构与发布流程

## 背景与现状问题

当前部署默认只有一套线上目录：

- 后端：`/home/ubuntu/qas-h5/api`
- 前端：`/home/ubuntu/qas-h5/frontend`
- PM2：`qas-api`

这套方式在“单环境快速迭代”阶段可用，但已经暴露出三类问题：

1. 没有独立自测环境，任何联调或验收都容易直接碰正式环境。
2. 发布时缺少对用户的明确提示，正在使用正式环境的同学很难判断当前是否处于发布窗口。
3. 当前部署脚本把服务器连接信息和目标目录写死在脚本内，不利于扩展到双环境，也存在明显的凭据安全风险。

## 方案对比

### 方案 A：同机双目录 + 双 PM2 + 双入口

做法：

- 同一台服务器上拆出 `staging` / `prod` 两套目录。
- 后端启动两套 PM2 进程。
- Nginx 提供两套独立入口。
- 数据目录彼此隔离。

优点：

- 最贴合当前部署方式，改造成本最低。
- 环境边界清晰，回归和验收不会污染正式数据。
- 发布正式环境时，只影响 `prod` 目录和 `prod` 进程。

缺点：

- 需要额外维护两套目录和 Nginx/PM2 配置。

结论：本次采用。

### 方案 B：同机双前端，单后端共享

做法：

- 测试/正式共用一个后端进程，只拆前端。

缺点：

- 测试任务、数据、缓存、状态会污染正式环境。
- 无法真正模拟正式发布前的完整验收。

结论：不采用。

### 方案 C：正式环境蓝绿发布

做法：

- 在 `prod` 内再拆 `blue` / `green` 两套可切换版本。

优点：

- 正式切换更平滑，回滚更快。

缺点：

- 相对当前阶段过重。

结论：列入二阶段增强，不作为本轮第一优先级。

## 目标架构

### 1. 服务器目录布局

```text
/home/ubuntu/qas-h5/
├── prod/
│   ├── api/
│   ├── frontend/
│   ├── shared-data/
│   └── .env
├── staging/
│   ├── api/
│   ├── frontend/
│   ├── shared-data/
│   └── .env
├── backups/
└── scripts/
```

说明：

- `prod/api` 与 `staging/api` 都是独立的编译产物目录。
- `prod/frontend` 与 `staging/frontend` 都是独立的静态资源目录。
- `shared-data` 是“该环境内部共享”的数据目录，不与另一个环境混用。
- 两套 `.env` 分别声明端口、数据目录、环境名等变量。

### 2. 进程与端口

推荐约定：

- `qas-api-prod`：监听 `127.0.0.1:3001`
- `qas-api-staging`：监听 `127.0.0.1:3002`

说明：

- 两套进程都继续只绑定 `127.0.0.1`，由 Nginx 统一反代，保持现有安全边界。
- PM2 名称必须与环境绑定，避免“重启错进程”。

### 3. Nginx 入口

推荐两种入口方式，优先用独立子域名：

- 正式：`qas.example.com`
- 测试：`staging-qas.example.com`

如果短期没有额外域名，也可退化为路径隔离，但子域名优先级更高：

- 正式：`/`
- 测试：`/staging`

本次推荐子域名，原因是：

- 用户更容易识别当前所在环境。
- Cookie、缓存、跳转、相对路径更容易隔离。
- 后续扩展蓝绿或灰度更自然。

### 4. 数据隔离

两套环境必须使用独立数据根目录：

- `prod`: `API_DATA_DIR=/home/ubuntu/qas-h5/prod/shared-data`
- `staging`: `API_DATA_DIR=/home/ubuntu/qas-h5/staging/shared-data`

这样可以隔离：

- 项目数据
- 上传文件
- 导出结果
- 临时缓存
- 恢复扫描状态
- 发布公告/部署状态文件

### 5. 运行时环境识别

后端环境变量新增：

- `APP_ENVIRONMENT=prod|staging`

前端通过系统接口读取运行时信息，界面底部版本区显示：

- `GOBS [PROD] main@abc1234`
- `GOBS [STAGING] feature@def5678`

目标是让自测时第一眼就能判断当前是不是正式环境。

## 发布提示与保护设计

### 1. 部署状态模型

新增一份独立的部署状态对象，按环境保存为 JSON 文件。建议位于：

- `<API_DATA_DIR>/.data/deployment-state.json`

建议结构：

```json
{
  "active": false,
  "phase": "idle",
  "level": "info",
  "messageZh": "",
  "messageEn": "",
  "allowWrites": true,
  "updatedAt": "2026-04-23T10:00:00.000Z",
  "updatedBy": "admin"
}
```

字段含义：

- `active`：是否显示公告
- `phase`：`idle | preparing | deploying | verifying`
- `level`：`info | warning | critical`
- `messageZh/messageEn`：中英文提示文案
- `allowWrites`：是否允许继续新建提交类操作
- `updatedAt/updatedBy`：便于排查是谁开启了发布窗口

### 2. 接口分层

#### 公开只读接口

- `GET /api/system/deployment-state`

用途：

- 前端轮询读取当前环境的发布提示
- 不包含敏感字段，不暴露写能力

#### 管理员写接口

- `GET /api/admin/deployment-state`
- `PUT /api/admin/deployment-state`

用途：

- 仅管理员登录后可读取和更新正式环境的发布状态
- 管理员可以在正式发布前先切换为 `preparing`
- 发布开始后切换为 `deploying`
- 发布完成后切换为 `verifying`，最终恢复为 `idle`

### 3. 前端行为

#### 全局公告条

在 `Layout` 顶部增加一条全局 banner：

- `preparing`：黄色提醒条，提示“请先保存当前工作，系统将在几分钟后更新”
- `deploying`：红色提醒条，提示“系统正在发布，避免重复提交任务”
- `verifying`：蓝色提醒条，提示“系统已恢复，若有异常请刷新页面”

#### 关键操作旁提示

本轮先不强制改所有业务页面，但设计上要求二阶段补齐：

- 创建任务
- 批量提交
- 发布到社媒
- 导出

在这些高风险操作附近读取 `allowWrites`，必要时给出二次确认或直接禁用。

### 4. 操作员流程

正式发布建议流程：

1. 本地完成开发。
2. 先部署到 `staging`。
3. 在 `staging` 完成自测与验收。
4. 在 `prod` 将部署状态切到 `preparing`，提前 5 分钟通知。
5. 开始上传正式环境产物并重启 `qas-api-prod`。
6. 发布完成后将状态切到 `verifying`。
7. 完成关键链路检查后切回 `idle`。

## 本地部署脚本设计

### 1. 目标

将现有 `deploy_api.py` / `deploy_frontend.py` / `deploy_all.py` 改造成“按目标环境部署”的脚本，而不是把正式目录写死在脚本中。

### 2. 新约定

脚本统一支持：

- `--target staging`
- `--target prod`

本地通过未提交的 `.env` 读取连接信息和目标目录，不再在 Python 文件里硬编码密码或路径。

建议变量：

- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_PASSWORD`
- `DEPLOY_STAGING_API_DIR`
- `DEPLOY_STAGING_FRONTEND_DIR`
- `DEPLOY_STAGING_PM2_NAME`
- `DEPLOY_STAGING_VERSION_URL`
- `DEPLOY_PROD_API_DIR`
- `DEPLOY_PROD_FRONTEND_DIR`
- `DEPLOY_PROD_PM2_NAME`
- `DEPLOY_PROD_VERSION_URL`

### 3. 好处

- 同一套脚本可部署测试和正式。
- 避免把凭据硬编码进仓库。
- 后续加蓝绿时只需继续扩展 target。

## 分阶段实施策略

### Phase 1：最小闭环

本轮先实现以下能力：

1. 设计文档与实施计划落库。
2. 部署脚本支持 `staging/prod` 目标化配置，并移除仓库内硬编码连接密码。
3. 后端新增部署状态读写能力与运行环境识别。
4. 前端 Layout 增加全局发布公告条与环境标识。

这四项完成后，已经具备“先发测试、自测、再提示正式用户、最后发正式”的基本闭环。

### Phase 2：操作保护增强

后续补齐：

1. 关键提交按钮基于 `allowWrites` 做软禁用或二次确认。
2. 管理后台提供部署状态编辑页，而不是只靠接口。
3. 发布完成自动健康检查。
4. 发布失败快速回滚。

### Phase 3：正式蓝绿发布

在正式环境内部增加 `blue/green` 切流，实现更平滑的正式升级与回退。

## 风险与缓解

### 1. 测试环境误用正式数据

缓解：

- 强制独立 `API_DATA_DIR`
- 前端底部持续展示环境标识

### 2. 操作员重启错 PM2 进程

缓解：

- PM2 名称显式带环境后缀
- 部署脚本按 target 自动映射进程名

### 3. 发布脚本继续携带硬编码凭据

缓解：

- 本轮必须把凭据移出 Python 脚本正文
- 统一改为读取本地未提交环境变量

### 4. 用户只看到提示但仍在提交

缓解：

- Phase 1 先做全局可见公告
- Phase 2 再给关键入口加写保护

## 验收标准

满足以下条件视为本设计第一阶段落地：

1. 本地部署脚本可按 `staging/prod` 分别部署到不同服务器目录。
2. 正式与测试环境能够返回不同的 `APP_ENVIRONMENT` 标识。
3. 正式环境可通过管理员接口开启部署提示。
4. 普通用户进入正式环境时能看到清晰的全局公告条。
5. 正式发布完成后可恢复为无公告状态。
6. 代码仓库中不再保留服务器密码硬编码。

## 本轮不做

- 正式蓝绿发布
- 自动回滚
- Nginx/PM2 远程自动初始化脚本
- 所有业务页的强制写入拦截
- WebSocket/SSE 式部署通知

本轮优先保证“架构能跑、发布有提示、环境可区分、脚本可用”。
