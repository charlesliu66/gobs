# 任务包 04: 多镜头生成异步化

## 任务目标
把多镜头视频生成从同步阻塞 HTTP 改为异步 Job 队列，前端实时展示每镜进度。

## 范围
- ✅ 做: 后端改为 Job 模式（类似现有的 editorExport 和 quickfilm）
- ✅ 做: 前端每镜独立进度条
- ❌ 不做: 不改单段生成逻辑
- ❌ 不做: 不改分镜生成算法

## 当前问题

`POST /api/video/generate-multishot` 是同步的：
1. 串行调用每个镜头的视频生成（每个 2-5 分钟）
2. 全部完成后 ffmpeg 拼接
3. 整个过程 HTTP 连接挂着，5 镜头可能 20 分钟
4. 中间断连就全部白做
5. 最终返回整个 base64 视频（可能几百 MB）

## 后端改动

### 改造 `routes/video.ts` 中的 multishot

```
POST /api/video/generate-multishot
  → 改为: 创建 Job，立即返回 jobId
  → 响应: { jobId, status: 'pending' }

GET /api/video/multishot-job/:jobId  
  → 新增: 查询 Job 状态
  → 响应: {
      status: 'pending' | 'running' | 'done' | 'error',
      shots: [
        { index: 0, status: 'done', videoPath: '...' },
        { index: 1, status: 'running' },
        { index: 2, status: 'pending' },
      ],
      finalVideoPath?: string, // 拼接完成后
      error?: string
    }
```

### Job 存储
在 `gobs-data/multishot-jobs/` 下存 JSON，结构类似 quickfilm 的 Job。

### 关键改动
- 每个镜头独立调即梦/可灵/Veo，完成后立即写入 job 状态
- 全部完成后自动 ffmpeg 拼接
- 单镜头失败不影响其他镜头（标记失败，继续其余）
- 拼接时跳过失败的镜头

## 前端改动

### 改造生成流程 UI

原来的"生成中..."全屏遮罩改为：
- 每个镜头独立状态卡片（pending → running → done/failed）
- 完成的镜头可以单独预览
- 失败的镜头可以单独重试
- 全部完成后显示拼接进度 → 最终预览

## 验收标准
1. 5 镜头生成：提交后立即返回，前端能看到每镜独立进度
2. 中途刷新页面，重新进入后能看到当前 Job 的实时进度
3. 单镜头失败时，其余镜头继续生成，失败的可以重试
4. 最终拼接完成后提供下载链接（不再返回 base64）
5. `npm run build` 无报错

## 风险点
- 并发控制：不能 5 个镜头同时调 API（尤其是即梦有并发限制），需要串行或限制并发数（建议 max 2）
- 原来的 `concatVideos` 函数假设所有视频都在临时目录，改为 job 目录后路径要调整
- ProductionWizard 的分镜生成也调了类似逻辑，但它是单镜头独立调的，暂不改

## 给 Cursor 的 Prompt

```
我需要把 POST /api/video/generate-multishot 从同步改为异步 Job 模式。

当前问题：这个接口串行生成所有镜头，HTTP 可能挂 20 分钟，还返回 base64 大包。

改造方案：
1. POST /generate-multishot 改为创建 Job，立即返回 { jobId }
2. 新增 GET /multishot-job/:jobId 查询状态
3. Job 信息存 JSON 文件（gobs-data/multishot-jobs/）

Job 执行逻辑：
- setImmediate 启动后台任务（参考 editorExport.ts 的做法）
- 镜头串行生成（并发限制 max 2，用 Promise 控制）
- 每生成完一个镜头，更新 job.shots[i].status 和 videoPath
- 全部完成后 ffmpeg 拼接
- 单镜头失败标记 error 但不终止其他

前端（TabGenerate.tsx / StepVideo 组件）：
- 调用改为 POST + 轮询模式
- 显示每镜头进度卡片
- 失败的镜头显示重试按钮
- 最终成片用 videoPath 而非 base64

注意：
- 即梦有并发限制，千万不要 Promise.all 同时提交所有镜头
- 生成完的视频保存在 job 目录（gobs-data/multishot-jobs/<jobId>/shot_0.mp4 等）
- 最终拼接视频也放在同一 job 目录
- 返回 videoPath 供前端用 GET /api/video/file?path= 拉取
- 完成后确保 npm run build 通过
```
