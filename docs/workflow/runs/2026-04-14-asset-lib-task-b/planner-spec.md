# TASK-B Planner Spec — 自动打标引擎

**Date:** 2026-04-14  
**Run ID:** 2026-04-14-asset-lib-task-b  
**Author:** Planner (Gate 1)

---

## 1. 范围与目标

实现 `aiTagAsset(assetId)` 函数体，完成以下子目标：

1. 从 DB 读取 asset 记录，获取文件路径和 mimetype
2. 若为图片：直接读取文件内容转 base64
3. 若为视频：用 ffmpeg 截取首帧（第 0 秒），转为 base64 JPEG
4. 调用 Compass Vision API（gemini-2.5-flash），发送图片 + 结构化 prompt
5. 解析返回的 JSON，提取标签和 confidence 值
6. 写入 asset_tags（confidence < 0.7 → status='pending'，否则 'confirmed'）
7. 整体 try/catch：失败时记录日志，asset.status 保持 ready，不抛出

---

## 2. 关键技术决策

### 2.1 AI 模型选择

- **模型：** `gemini-2.5-flash`（通过 `COMPASS_GEMINI_MODEL` 环境变量，默认已是 gemini-2.5-flash）
- **依据：** compassLlm.ts 中 `DEFAULT_COMPASS_GEMINI_MODEL = 'gemini-2.5-flash'`，该模型支持 vision（图片 + 文字 multimodal）

### 2.2 Compass Vision API 调用方式

- **端点：** `{COMPASS_API_URL}/chat/completions`（OpenAI-compatible）
- **图片格式：** 在 `content` 数组中传入 `{ type: "image_url", image_url: { url: "data:image/jpeg;base64,<base64>" } }`
- **复用：** 参考 compassLlm.ts 的 `postCompassChatCompletions` 模式，在 assetTaggingService.ts 中直接实现独立的 vision 调用函数（避免循环依赖，且 compassLlm.ts 仅导出文本接口）
- **认证：** `Authorization: Bearer <COMPASS_API_KEY>` 头

### 2.3 Confidence 值来源

- **从模型输出 JSON 中读取**，prompt 明确要求返回 `confidence` 对象（每个维度 0~1）
- fallback：若模型不返回 confidence，对解析成功的字段给 0.6（低于阈值，进入 pending）
- 规则打标的 confidence 已固定为 1.0（在 TASK-A 中已实现）

### 2.4 视频截帧方案

```typescript
import { path as ffmpegPath } from 'ffmpeg-static';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';

async function extractFirstFrame(videoPath: string): Promise<string> {
  const tmpFile = path.join(os.tmpdir(), `asset-frame-${Date.now()}.jpg`);
  await promisify(execFile)(ffmpegPath!, [
    '-i', videoPath, '-ss', '0', '-frames:v', '1', '-y', tmpFile
  ]);
  const base64 = fs.readFileSync(tmpFile).toString('base64');
  fs.unlinkSync(tmpFile);
  return base64;
}
```

- 使用 `ffmpeg-static`（已在 package.json 中）
- `execFile` + `promisify`：不阻塞事件循环（子进程方式）
- tmpDir 存放，用完删除，避免磁盘积累

### 2.5 平台建议规则（规则增强）

在规则打标层面补充平台标签（TASK-B 需求中规则打标部分）：
- TikTok：竖版（portrait）且 duration < 60s
- YouTube：横版（landscape）

### 2.6 失败重试机制

- `aiTagAsset` 单次失败：catch 错误，写入 asset_tags 一条 `{ key: 'ai_tag_error', value: errorMessage, source: 'ai', confidence: 0, status: 'pending' }`，确保失败可见
- asset.status 保持 `'ready'`（不设为 error），不阻塞导入任务
- 前端可通过 `ai_tag_error` 标签识别失败资产，触发单独重试

---

## 3. 实现位置

| 文件 | 变更 |
|------|------|
| `src/services/assetTaggingService.ts` | 实现 `aiTagAsset()`，补充平台规则打标 |
| `src/services/assetIngestService.ts` | 在 processFile() 规则打标后，异步调用 `aiTagAsset(assetId)`（fire-and-forget） |

---

## 4. Prompt 模板

```
分析这张游戏素材图片，返回 JSON 格式（不要其他文字，不要 markdown 代码块）：
{
  "type": "角色立绘|游戏截图|录屏|宣传图|UI素材",
  "scene": "战斗|日常|菜单|过场|其他",
  "purpose": ["买量","社媒","版本宣发"],
  "platform": ["TikTok","YouTube"],
  "confidence": {
    "type": 0.9,
    "scene": 0.85,
    "purpose": 0.7,
    "platform": 0.8
  }
}
```

---

## 5. 验收标准映射

| AC | 实现方式 |
|----|--------|
| AC-B1: 每个 AI 标签有 confidence 值 | 写入 asset_tags 时传入 confidence 字段 |
| AC-B2: 低置信(<0.7)标签进入 pending | `confidence < 0.7 ? 'pending' : 'confirmed'` |
| AC-B3: 打标失败可单独重试，不阻塞导入 | 整体 try/catch，失败写 error tag，asset.status 不变 |
| AC-B4: npm run build 零错误 | 全程 TypeScript 严格类型，验证阶段运行 eval.sh |
