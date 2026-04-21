# QAS Current State Assessment

> Date: 2026-04-21
> Scope: current repository state + deployed H5 on `43.134.186.196`

## 1. What QAS already is

QAS is no longer a single "text to video" demo. It is already a multi-stage video workflow product with four connected work areas:

1. `Studio / 高级制片`
   - story arc generation
   - character / scene / prop design
   - shot table generation
   - per-shot video generation
   - export / continuous play / AB compare

2. `Editor / 视频剪辑`
   - timeline editing
   - AI editing agent
   - BGM generation
   - subtitle / text overlays
   - export pipeline

3. `Asset Library / 素材中台`
   - upload, organize, classify, review pending tags
   - use assets directly in generation

4. `Distribution + Ops`
   - social distribution
   - history / batch-jobs board
   - risk / matrix related pages

The most valuable product idea is not a single feature. It is the closed loop:

`创意输入 -> 制片 -> 分镜生成 -> 成片筛选 -> 导入剪辑 -> 导出 -> 分发`

That loop is the real moat of this project.

## 2. What is actually deployed now

Observed on production at `http://43.134.186.196`:

- API version endpoint: `/api/system/version`
- deployed commit: `0006d7a`
- deployed branch: `main`
- deployed build time: `2026-04-21T02:36:33.169Z`
- PM2 process: `qas-api`
- PM2 status: `online`

Important distinction:

- Production is running `v0.64.2` era behavior.
- Local repo HEAD is already ahead at `01e29dd`.
- The `2026-04-20-dreamina-scheduler-cancel` work is present in the worktree, but it is not what production is currently serving.

So when discussing "current online behavior", it should be evaluated as **v0.64.2**, not as the latest local code.

## 3. My current understanding of the product

### 3.1 Core product direction

This project is aimed at a marketing / content operations user, not a pure video editor power user.

The design pattern is:

- lower the prompt burden
- lower the media management burden
- lower the shot-to-edit handoff burden
- expose queue / async state just enough so users do not panic

### 3.2 Current strengths

- `ProductionWizard` is the strongest module. It has real workflow depth and a relatively complete state model.
- `EditorWorkbench` is already beyond a toy editor: it has timeline semantics, agent integration, BGM, subtitles, undo/redo, export.
- `AssetLibraryPage` has become a meaningful middle layer rather than just an upload bucket.
- batch jobs + SSE + writeback architecture shows the product is already solving "long-running async generation" seriously.

### 3.3 Current product risk

The project is now feature-rich enough that the main risk is no longer "missing features".

The main risk is:

- users do not know which path to use first
- state can desync across modules
- deployment reality can lag behind repo reality
- queue / auth / media access edge cases create trust loss quickly

## 4. Highest-priority issues and optimization points

### P0 - Production H5 is still HTTP only

Observed behavior:

- `http://43.134.186.196/` is reachable
- `https://43.134.186.196/` on port 443 is not reachable

Impact:

- login credentials and tokens are exposed on plaintext transport
- this weakens trust immediately for any real team usage
- browser-side integrations and future cookie/session work will stay constrained

Recommendation:

- put the production H5 behind HTTPS first
- even if you keep the IP for internal use, at least add a domain + TLS for normal access

### P1 - Batch job media playback/import path is inconsistent with FAT-protected media access

Relevant code:

- `h5-video-tool-api/src/services/batchJobsQueue.ts`
- `h5-video-tool-api/src/routes/batchJobs.ts`
- `h5-video-tool/src/components/BatchJobsBoard.tsx`
- `h5-video-tool/src/pages/History.tsx`

Current shape:

- backend writes batch-job result URLs as `/api/batch-jobs/video/:id`
- that route requires authenticated identity via JWT/FAT/query token resolution
- frontend batch board uses raw `job.videoUrl` directly for `<video>` and download
- history import uses `fetch(job.videoUrl)` directly

Likely consequence:

- batch-job preview / download / import can 401 in browser contexts that do not append FAT

This is one of the classic "API route exists, UI button exists, but the user path is still broken" issues.

### P1 - Real-time job state is fragile after SSE disconnect

Relevant code:

- `h5-video-tool/src/hooks/useGlobalJobs.ts`
- `h5-video-tool/src/components/BatchJobsBoard.tsx`

Current behavior:

- EventSource is created once
- on error it closes immediately
- there is no reconnect strategy, no retry backoff, no resubscribe

Impact:

- queue state can silently freeze after temporary network blips
- users will think generation is stuck
- this is especially harmful for long-running Dreamina / batch flows

Recommendation:

- add automatic reconnect with backoff
- surface "连接已断开，正在重连" in UI

### P1 - Editor -> Production back-link is broken

Relevant code:

- `h5-video-tool/src/pages/EditorWorkbench.tsx`
- `h5-video-tool/src/App.tsx`

Current behavior:

- editor top bar links to `/studio/wizard?...`
- actual route is `/studio/production`
- query key also does not match current route conventions

Impact:

- one of the most important cross-module jumps is unreliable
- this directly damages the "制片 -> 剪辑" closed loop

### P2 - UI version signal is misleading

Relevant code:

- `h5-video-tool/src/components/Layout.tsx`

Current behavior:

- sidebar footer still shows `GOBS v0.1`
- production API reports `0006d7a` / v0.64.2 era state

Impact:

- users cannot trust what version they are on
- debugging and support conversations become slower

Recommendation:

- replace static footer version with `/api/system/version`
- show at least `commitShort` or a mapped product version

### P2 - Login path is less deployable than the rest of the frontend

Relevant code:

- `h5-video-tool/src/pages/Login.tsx`
- `h5-video-tool/src/api/client.ts`

Current behavior:

- login uses raw `fetch('/api/auth/login')`
- most other API calls use the shared API client and support `VITE_API_BASE_URL`

Impact:

- current same-origin deployment is okay
- future split-domain / reverse-proxy / alternate base path deployments are more fragile than they need to be

## 5. Usability observations

These are not all "bugs", but they are friction points worth fixing.

### 5.1 Too many entry points, not enough path guidance

For a new user, the nav currently exposes:

- 一键成片
- 高级制片
- 生成视频
- 视频剪辑
- 我的成片
- 素材库
- 视频分发
- 风控大师
- 我的项目
- 历史记录

This is powerful, but cognitively heavy.

Recommendation:

- define 3 primary paths on the home page:
  - 快速出片
  - 精细制片
  - 剪辑精修
- everything else becomes secondary tooling

### 5.2 Production and Editor are the stars; other modules should visually defer to them

Right now the app reads like a wide toolbox. The actual differentiation is:

- production planning depth
- edit handoff
- async shot generation

Recommendation:

- reframe homepage and sidebar around the main loop, not around every page equally

### 5.3 "Current online capability" needs a single visible status panel

Because local code and online deployment are drifting, you need one obvious place in UI or docs that answers:

- current deployed version
- whether Dreamina queue scheduler is online
- whether ASR/brand-kit features are online
- whether this environment is internal beta or stable

## 6. Suggested next optimization order

1. Enable HTTPS for production H5.
2. Fix batch-job media auth path so preview/download/import all use FAT-safe URLs.
3. Add SSE reconnect and reconnect-state UI.
4. Fix editor back-link to production.
5. Replace hardcoded version text with runtime version info.
6. Simplify home-page / sidebar information architecture.
7. Add a small "what's live in this environment" status block for operators and users.

## 7. Short conclusion

QAS already has enough depth to be useful. The main challenge is no longer "can it do more", but "can users trust the workflow end to end".

The strongest part is the product loop between production, batch generation, and editing.
The weakest part is the reliability surface around deployment reality, auth-bearing media playback, and async state continuity.
