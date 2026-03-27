# 接口契约（供 H5 / API 对接）

## 1. 生成 Generate

**输入**
```json
{
  "prompt": "string, 必填",
  "materials": "string, 逗号分隔路径，可选",
  "duration": "number, 秒，可选",
  "aspect": "16:9 | 9:16 | 1:1, 可选",
  "outputDir": "string, 可选"
}
```

**输出**
```json
{
  "outputPath": "string, 成片绝对路径",
  "prompt": "string",
  "timestamp": "ISO8601"
}
```

**调用**：`node scripts/generate.js --prompt "..." [--materials "..."] [--duration 10]`

---

## 2. 管理-列表 List

**输入**
```json
{
  "baseDir": "string, 可选，默认 Ai Videos"
}
```

**输出**
```json
[
  { "path": "string", "name": "string", "size": "number", "mtime": "string" }
]
```

**调用**：`node scripts/list-videos.js [--dir "路径"] [--json]`

---

## 3. 管理-删除 Delete

**输入**
```json
{
  "path": "string, 视频绝对路径，必填"
}
```

**输出**
```json
{ "success": true }  或  { "success": false, "error": "string" }
```

**调用**：`node scripts/delete-video.js --path "路径"`

**约束**：仅允许删除 Ai Videos 目录内的视频文件。

---

## 4. 分发 Distribute

**输入**
```json
{
  "videos": "string, 逗号分隔路径或 URL，可选",
  "useLatest": "boolean, 从 latest.json 读取，可选",
  "envIds": "string, 逗号分隔云手机 ID，可选（默认读配置）",
  "platforms": "string, tiktok|instagram|youtube，可选",
  "caption": "string, 可选",
  "hashtags": "string, 可选"
}
```

**输出**
```json
{
  "taskIds": ["string"],
  "videoUrls": ["string"]
}
```

**调用**：`node scripts/distribute.js [--latest] [--videos "..."] [--env-ids "..."] [--platforms tiktok]`

---

## 5. 一键生成+分发 Run-All

**输入**：Generate + Distribute 的合并参数。

**调用**：`node scripts/run-all.js --prompt "..." [--materials "..."] [--duration 10] [--platforms tiktok] [--caption "..."]`
