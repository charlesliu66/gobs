# GeeLark 发布与互动 — 统一使用指南

**更新日期**: 2025-03-16

---

## 一、功能总览

| 功能 | 脚本 | 说明 |
|------|------|------|
| **发布视频** | `geelark-post.js` | 1 台或 N 台设备的 TT 账户发布视频，支持自定义/自动生成 description、hashtag |
| **批量评论** | `geelark-engage.js comment` | 指定 1 台或 N 台设备，对 1 个或 N 个链接批量发评论 |
| **随机点赞** | `geelark-engage.js like` | 指定 1 台或 N 台设备随机点赞（⚠️ API 不支持指定链接） |
| **单设备评论** | `geelark-tiktok-comment.js` | 单设备单链接评论，简化用法 |

---

## 二、发布视频（geelark-post）

### 2.1 用法

```powershell
# 单台设备（按设备名）
node scripts/geelark-post.js --videos "C:\path\to\video.mp4" --env "Test 3"

# 多台设备（按设备名，逗号分隔）
node scripts/geelark-post.js --videos "path.mp4" --env "Test 1,Test 2,Test 3"

# 按设备 ID
node scripts/geelark-post.js --videos "path.mp4" --env-ids "609149762754576432,609149209844645936"

# 自定义文案和标签
node scripts/geelark-post.js --videos "path.mp4" --env "Test 3" --caption "Ronin edit 🔥" --hashtags "#fyp #ronin #viral"
```

### 2.2 参数

| 参数 | 必选 | 说明 |
|------|------|------|
| `--videos` | 是* | 视频路径或 URL，逗号分隔；可与 `--latest` 二选一 |
| `--latest` | 否 | 从 `Ai Videos/latest.json` 读取 video-pipeline 刚生成的成片 |
| `--env` | 否* | 设备名，如 `"Test 3"` 或 `"Test 1,Test 2,Test 3"` |
| `--env-ids` | 否* | 设备 ID，逗号分隔 |
| `--caption` | 否 | 视频文案/description |
| `--hashtags` | 否 | 标签，如 `#fyp #viral` |
| `--platforms` | 否 | 默认 `tiktok`；多平台用 `tiktok,instagram,youtube` |

*不指定 `--env` / `--env-ids` 时使用 `config/geelark.json` 中的 `defaultEnvIds`。

### 2.3 文案与标签

- **用户自定义**：通过 `--caption`、`--hashtags` 传入
- **自动生成**：由 geelark-publish Skill 或 AI 根据视频 prompt 生成后传入；参考 `~/.cursor/skills/geelark-publish/reference/caption-formulas.md`

---

## 三、批量评论（geelark-engage comment）

### 3.1 用法

```powershell
# 单台设备，单链接
node scripts/geelark-engage.js comment --links "https://vt.tiktok.com/ZSuuoHCwa/" --comment "It's so good" --env "Test 3"

# 单台设备，多链接（对每个链接发同一条评论）
node scripts/geelark-engage.js comment --links "url1,url2,url3" --comment "Nice!" --env "Test 3"

# 多台设备，多链接（每台设备对每个链接各发一条评论）
node scripts/geelark-engage.js comment --links "url1,url2" --comment "🔥" --env "Test 1,Test 2,Test 3"
```

### 3.2 参数

| 参数 | 必选 | 说明 |
|------|------|------|
| `--links` | 否 | TikTok 视频链接，逗号分隔；不传则为随机评论 |
| `--comment` | 是 | 评论内容 |
| `--env` | 否* | 设备名，如 `"Test 3"` 或 `"Test 1,Test 2"` |
| `--env-ids` | 否* | 设备 ID，逗号分隔 |

---

## 四、随机点赞（geelark-engage like）

### 4.1 用法

```powershell
# 单台设备
node scripts/geelark-engage.js like --env "Test 3"

# 多台设备
node scripts/geelark-engage.js like --env "Test 1,Test 2,Test 3"
```

### 4.2 ⚠️ API 限制说明

**GeeLark 的 `tiktokRandomStar` 仅支持【随机点赞】**：
- 无法指定要点赞的视频链接
- 每台设备会随机浏览并点赞若干视频
- 若需对指定链接点赞，当前 API 不支持，需联系 GeeLark 确认是否有其他接口

---

## 五、脚本清单

| 脚本 | 路径 | 依赖 |
|------|------|------|
| `geelark-lib.js` | `scripts/geelark-lib.js` | 共享库，配置加载、请求、设备解析 |
| `geelark-post.js` | `scripts/geelark-post.js` | 依赖 `geelark-publish` skill 的 `publish.js` |
| `geelark-engage.js` | `scripts/geelark-engage.js` | 批量评论、随机点赞 |
| `geelark-tiktok-comment.js` | `scripts/geelark-tiktok-comment.js` | 单设备评论（兼容旧用法） |
| `geelark-query-tasks.js` | `scripts/geelark-query-tasks.js` | 查询任务状态 |

---

## 六、配置

- **配置文件**：`config/geelark.json`
- **设备示例**：

```json
{
  "devices": [
    { "id": "609149762754576432", "name": "Test 3", "region": "印度尼西亚" },
    { "id": "609149209844645936", "name": "Test 2", "region": "印度尼西亚" },
    { "id": "608232396864618599", "name": "Test 1", "region": "美国" }
  ],
  "defaultEnvIds": ["609149762754576432", "609149209844645936", "608232396864618599"]
}
```

- **环境变量**：`GEELARK_API_KEY`（或通过 `config/geelark.json` 中的 `apiKey` 设置）

---

## 七、常见用法速查

| 需求 | 命令 |
|------|------|
| 发视频到 Test 3 | `node scripts/geelark-post.js --videos "path.mp4" --env "Test 3"` |
| 发视频到全部设备 | `node scripts/geelark-post.js --videos "path.mp4"`（使用 defaultEnvIds） |
| 指定链接下评论 | `node scripts/geelark-engage.js comment --links "url" --comment "Nice!" --env "Test 3"` |
| 多链接批量评论 | `node scripts/geelark-engage.js comment --links "url1,url2" --comment "🔥" --env "Test 1,Test 2"` |
| 随机点赞 | `node scripts/geelark-engage.js like --env "Test 3"` |
