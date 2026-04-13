# 任务包 02: 统一视频生成服务层

## 任务目标
抽取统一的视频生成 hook 和后端路由拆分，消除三处重复的生成/轮询逻辑。

## 范围
- ✅ 做: 前端抽取 `useVideoGeneration` hook
- ✅ 做: 后端拆分 video.ts 路由
- ❌ 不做: 不改生成逻辑本身（dreaminaVideo.ts、klingVideo.ts、veoPython.ts 不动）
- ❌ 不做: 不改 UI 布局

## 前端改动

### 新建 `src/hooks/useVideoGeneration.ts`

统一封装以下逻辑（目前分散在 TabGenerate、ProductionWizard、QuickFilm 中）：

```typescript
interface UseVideoGenerationOptions {
  onComplete?: (result: VideoResult) => void;
  onError?: (error: string) => void;
  onProgress?: (status: TaskStatus) => void;
}

interface VideoGenerationState {
  status: 'idle' | 'submitting' | 'polling' | 'completed' | 'failed';
  taskId?: string;
  submitId?: string;
  progress?: TaskProgress;
  result?: VideoResult;
  error?: string;
}

function useVideoGeneration(opts?: UseVideoGenerationOptions): {
  state: VideoGenerationState;
  // 异步提交（即梦/可灵），返回后自动开始轮询
  submitAsync: (params: VideoSubmitParams) => Promise<void>;
  // 同步生成（Veo），阻塞到完成
  generateSync: (params: VideoSubmitParams) => Promise<void>;
  // 取消轮询
  cancel: () => void;
  // 重置状态
  reset: () => void;
}
```

### 消费方改造

1. **TabGenerate.tsx** — `StepVideo` 组件内的生成逻辑替换为 `useVideoGeneration`
2. **ProductionWizard (StepStoryboard)** — 分镜视频生成替换为 `useVideoGeneration`
3. **QuickFilm.tsx** — 不直接调视频生成，但 `confirmStoryboard` 后的批量生成流程可复用

## 后端改动

### 拆分 `routes/video.ts` (1058行)

```
routes/
├── video.ts           ← 保留: /models, /file, /output-recent, /generate, /generate-multishot
├── videoDreamina.ts   ← 新建: /dreamina/submit, /dreamina/task/:submitId
├── videoKling.ts      ← 新建: /kling/task, /kling/recent-list, /kling/video-proxy, /kling/ref-cache, /generate-kling-async
└── videoVeo.ts        ← 可选: 如果 Veo 逻辑增长可拆出
```

### 拆法
- 把 `videoRouter` 改为聚合路由：
  ```typescript
  videoRouter.use('/dreamina', dreaminaRouter);
  videoRouter.use('/kling', klingRouter);
  ```
- 共享函数（`persistVideoUrlToOutput`、`fetchDriveImageAsBase64`）提取到 `services/videoUtils.ts`

## 验收标准
1. useVideoGeneration hook 能处理即梦异步 + 可灵异步 + Veo 同步三种模式
2. TabGenerate 和 ProductionWizard 都使用同一个 hook
3. 轮询间隔统一：3s 初始，成功一次后 5s，最大轮询 10 分钟超时
4. 错误信息统一格式化（429 → "服务繁忙，请稍后重试"）
5. 后端路由拆分后所有 API 路径不变
6. `npm run build` 无报错

## 风险点
- TabGenerate 中 `StepVideo` 组件的生成逻辑和 UI 耦合较紧，需要仔细剥离
- ProductionWizard 的分镜生成有"批量"概念（多个镜头排队生成），hook 需要支持多实例
- 即梦的 submitId 和 taskId 是两个概念，轮询用 submitId，但返回的 taskId 是给历史记录用的

## 给 Cursor 的 Prompt

```
我需要你做两件事：

1. 前端：新建 src/hooks/useVideoGeneration.ts
   - 封装视频生成的完整生命周期：提交 → 轮询 → 完成/失败
   - 支持三种模式：即梦异步（submit + poll）、可灵异步（submit + poll）、Veo 同步
   - 轮询参数：初始间隔 3s，稳定后 5s，最大超时 10min
   - 状态：idle | submitting | polling | completed | failed
   - 需要支持多实例（同一页面多个生成任务并行）
   
   然后改造 TabGenerate.tsx 中 StepVideo 组件的生成逻辑，使用这个 hook。
   不要改 UI，只换内部状态管理。

2. 后端：拆分 routes/video.ts
   - 新建 routes/videoDreamina.ts — 把 /dreamina/* 相关路由搬过去
   - 新建 routes/videoKling.ts — 把 /kling/* 相关路由搬过去  
   - 在 video.ts 中 use 子路由：videoRouter.use('/dreamina', dreaminaRouter) 等
   - 共享工具函数提取到 services/videoUtils.ts（persistVideoUrlToOutput, fetchDriveImageAsBase64, bufferFromVideoUrlPayload）
   - 确保所有 API 路径不变

注意：
- 不要改 dreaminaVideo.ts、klingVideo.ts、veoPython.ts 这些底层服务
- 不要改 UI 布局和样式
- 即梦的 submitId 用于轮询（GET /dreamina/task/:submitId），taskId 是最终标识
- 完成后确保 npm run build 通过
```
