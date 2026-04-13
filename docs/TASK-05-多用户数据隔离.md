# 任务包 05: 多用户数据隔离

## 任务目标
把高级制片、视频成片、剪辑器素材、QuickFilm 等模块的文件存储按用户隔离，防止用户之间互相看到数据。

## 背景
目前只有 Projects 模块（`/api/projects`）做了按 `username` 分目录，其他模块全局共用：

| 模块 | 当前路径 | 问题 |
|------|----------|------|
| 高级制片项目 | `output/production/projects/` | 所有用户共用 |
| 高级制片图片 | `output/production/images/` | 所有用户共用 |
| 视频成片 | `output/` | 所有用户共用 |
| 剪辑器素材 | `uploads/editor/` | 所有用户共用 |
| QuickFilm Job | `quickfilm/` | 所有用户共用 |

## 范围
- ✅ 做: 上述 5 个模块加入用户隔离
- ✅ 做: 兼容已有无用户名的历史数据（fallback 到 `_default` 目录）
- ❌ 不做: 不改认证逻辑（JWT 已有 username）
- ❌ 不做: 不迁移历史数据（旧数据放 `_default`，新数据按用户分）

## 改动方案

### 核心原则
利用已有的 `req.user.username`（JWT 中间件已注入），在文件路径中加入 username 子目录。

### 1. 高级制片 — `routes/productionPersist.ts`

**当前**:
```typescript
const IMG_DIR = path.join(OUTPUT_BASE, 'production', 'images');
const PROJ_DIR = path.join(OUTPUT_BASE, 'production', 'projects');
```

**改为**:
```typescript
function getProductionImgDir(username: string): string {
  return path.join(OUTPUT_BASE, 'production', 'images', sanitizeUsername(username));
}
function getProductionProjDir(username: string): string {
  return path.join(OUTPUT_BASE, 'production', 'projects', sanitizeUsername(username));
}
```

每个接口从 `req.user!.username` 获取用户名，传入路径函数。

### 2. 视频成片 — `routes/video.ts`（或拆分后的子路由）

**`persistVideoUrlToOutput`** 函数加 username 参数：
```typescript
async function persistVideoUrlToOutput(
  videoUrl: string, 
  filenameSlug: string, 
  username?: string
): Promise<string | undefined> {
  const userDir = username ? path.join(OUTPUT_DIR, sanitizeUsername(username)) : OUTPUT_DIR;
  await fs.mkdir(userDir, { recursive: true });
  // ... 存到 userDir
}
```

**`/output-recent`** 接口改为只扫描当前用户目录。

### 3. 剪辑器素材 — `routes/editorAssets.ts`

上传路径从 `uploads/editor/` 改为 `uploads/editor/{username}/`。
资产查找也限定在用户目录。

### 4. QuickFilm Job — `routes/quickfilm.ts` + `services/quickFilmService.ts`

Job 存储从 `quickfilm/` 改为 `quickfilm/{username}/`。
列表接口只返回当前用户的 Job。

### 5. 公共工具函数 — 新建 `utils/safeUsername.ts`

```typescript
/** 防路径穿越，与 projects.ts 的 isSafeUsername 保持一致 */
export function sanitizeUsername(raw: string): string {
  const s = raw.trim();
  if (/^[\w-]{1,64}$/.test(s)) return s;
  return '_default';
}
```

### 6. 历史数据兼容

- 新接口写入时，如果 `req.user?.username` 为空或无效，fallback 到 `_default` 子目录
- 读取时，如果用户目录下找不到，不 fallback 到全局目录（避免看到别人数据）
- 已有的全局目录数据不自动迁移，管理员可以手动移到 `_default/`

## 涉及文件

```
h5-video-tool-api/src/
├── utils/
│   └── safeUsername.ts              ← 新建
├── routes/
│   ├── productionPersist.ts         ← 改: 路径加 username
│   ├── video.ts                     ← 改: persistVideoUrlToOutput 加 username
│   ├── editorAssets.ts              ← 改: 上传/查找路径加 username
│   └── quickfilm.ts                 ← 改: job 路径加 username
└── services/
    └── quickFilmService.ts          ← 改: job 存储路径加 username
```

## 验收标准
1. 用户 A 上传的剪辑素材，用户 B 看不到
2. 用户 A 的高级制片项目和图片，用户 B 看不到
3. 用户 A 生成的视频成片，用户 B 看不到
4. 用户 A 的 QuickFilm Job，用户 B 看不到
5. 没有 username 的请求（理论上不应该发生，JWT 会拦截）fallback 到 `_default`
6. 旧数据在全局目录不会被新用户访问到
7. `npm run build` 无报错

## 风险点
- `resolveReadableImagePath` 函数有多路径兼容逻辑（绝对路径、相对路径、旧路径），加 username 后需要同步更新所有分支
- `clientVideoPathFromSavePath` 返回的是相对路径给前端用，加了 username 子目录后这个函数也要更新
- 剪辑器 export 导出时，`resolveAssetPaths` 扫描多个目录找素材，需要限定在用户目录
- 高级制片的图片路径是存在项目 JSON 里的（相对路径），改了目录结构后旧项目的图片路径会失效 → 需要在读取时做 fallback

## 给 Cursor 的 Prompt

```
我需要给 GOBS 后端加多用户数据隔离。目前只有 /api/projects 按 username 分目录，其他模块全局共用。

核心改动：在文件存储路径中加入 username 子目录。

1. 新建 src/utils/safeUsername.ts
   export function sanitizeUsername(raw: string): string — 校验安全后返回，不安全返回 '_default'
   参考 routes/projects.ts 的 isSafeUsername 逻辑

2. 改 routes/productionPersist.ts
   - IMG_DIR 和 PROJ_DIR 从常量改为函数，接收 username 参数
   - 每个路由处理函数从 req.user!.username 获取用户名
   - resolveReadableImagePath 也要加 username 维度
   - upload-image 存到 production/images/{username}/
   - project save/load/list/delete 用 production/projects/{username}/

3. 改 routes/video.ts（或拆分后的文件）
   - persistVideoUrlToOutput 加 username 参数，存到 output/{username}/
   - clientVideoPathFromSavePath 适配新路径
   - GET /output-recent 只扫当前用户目录
   - POST /generate、/dreamina/submit 等调用 persistVideoUrlToOutput 时传入 req.user!.username

4. 改 routes/editorAssets.ts
   - 上传路径从 uploads/editor/ 改为 uploads/editor/{username}/
   - 素材列表/获取只查用户目录

5. 改 routes/quickfilm.ts + services/quickFilmService.ts
   - Job 存储从 quickfilm/ 改为 quickfilm/{username}/
   - createJob/loadJob/listJobs 等函数加 username 参数
   - 路由处理函数传入 req.user!.username

6. 改 routes/editorExport.ts
   - resolveAssetPaths 中的搜索目录加 username 维度
   - 导出文件存到 exports/{username}/

历史兼容：
- 不自动迁移旧数据
- 新数据都写入 username 子目录
- 读取时不 fallback 到全局目录（安全优先）
- req.user 不存在时 fallback 到 '_default'

注意：
- req.user.username 在 JWT 中间件中已注入，直接用即可
- 路径中的 username 必须经过 sanitizeUsername 防路径穿越
- 高级制片项目 JSON 里存了图片的相对路径，改目录后要注意兼容
- 完成后确保 npm run build 通过
```
