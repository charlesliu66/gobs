# video_pipeline 与 geelark_publish 优化方案

**日期**: 2025-03-10  
**状态**: 待确认

---

## 一、现状与问题汇总

### 1.1 项目定位

| 项目 | 路径 | 职责 |
|------|------|------|
| **video_pipeline** | `cursor_try/video-pipeline` | Prompt + 素材 → Seedance 即梦生成 → 成片保存到 Ai Videos |
| **geelark_publish** | `~/.cursor/skills/geelark-publish` | 视频路径/URL → 上传 GeeLark → 批量发布到 TikTok/INS/YouTube/Facebook |

两者共享输出/输入目录 `Ai Videos`，但**无自动化串联**。

### 1.2 已发现的问题

#### geelark_publish

| 问题 | 影响 | 优先级 |
|------|------|--------|
| PUT 上传 ETIMEDOUT | 内网/防火墙环境无法上传，需手动上传后改用 URL | 高 |
| 40003 签名失败 | 部分账号仅支持 Key 验证，当前仅支持 Token | 中 |
| putFile 未使用 timeout | 大文件或慢网络时长时间挂起 | 中 |
| 无 HTTP 代理支持 | 企业网络需代理才能访问 OSS 时无法使用 | 低 |

#### video_pipeline

| 问题 | 影响 | 优先级 |
|------|------|--------|
| 成片路径仅打印，未持久化 | geelark 无法自动读取「刚生成的视频」 | 中 |
| prompt 未与成片关联 | 跨会话时无法自动生成文案 | 中 |
| 排队时间固定 2h | 无法根据实际排队情况调整 | 低 |

#### 衔接断点

| 断点 | 说明 |
|------|------|
| 手动触发发布 | 生成后需用户再次发起 geelark 命令 |
| prompt 传递断裂 | 跨对话时无法自动获取 prompt 用于文案生成 |
| 成片路径未传参 | geelark 只能扫描目录或用户手动指定 |

---

## 二、优化方向与方案

### 2.1 修复 geelark_publish 网络/稳定性问题

**方案 A：最小改动（推荐）**

- 在 `putFile` 中为 request 增加 `req.setTimeout(timeoutMs)`，超时后 reject
- 环境变量 `GEELARK_UPLOAD_TIMEOUT` 已支持，只需在 request 上生效
- 工作量：约 5 分钟

**方案 B：增加代理支持**

- 读取 `HTTPS_PROXY` / `HTTP_PROXY`，使用 `https-proxy-agent` 等库
- 需新增依赖，适用于企业代理环境
- 工作量：约 30 分钟

**方案 C：增加 Key 验证（appId + sign）**

- 当 `GEELARK_APP_ID` 存在时，改用 sign 方式请求，应对 40003
- 按 api-notes 中 SHA256(appId+traceId+ts+nonce+ApiKey) 实现
- 工作量：约 45 分钟

---

### 2.2 成片元数据持久化（video_pipeline）

**方案 A：输出 latest.json（推荐）**

- 每次生成完成后，在 `Ai Videos` 下写入 `latest.json`：
  ```json
  {
    "outputPath": "C:\\...\\Ai Videos\\生成_xxx.mp4",
    "prompt": "用户选中的完整 prompt",
    "timestamp": "2025-03-10T12:00:00Z"
  }
  ```
- geelark_publish 可增加 `--latest` 参数，自动读取并发布该成片
- 工作量：约 20 分钟

**方案 B：每成片附带 metadata 文件**

- 成片 `生成_xxx.mp4` 同目录生成 `生成_xxx.json`，内含 prompt、时间等
- 更细粒度，但需在 geelark 侧增加「按 metadata 筛选」逻辑
- 工作量：约 40 分钟

---

### 2.3 一键串联（生成后即发布）

**方案 A：video_pipeline 完成后提示**

- run.js 结束时打印：「是否立刻发布？执行：node publish.js --latest --env-ids "..."」
- 用户复制命令即可，无代码耦合
- 工作量：约 5 分钟（配合 latest.json）

**方案 B：video_pipeline 支持 --publish 参数**

- `node run.js --prompt "..." --publish --env-ids "id1,id2,id3"`
- 生成完成后自动调用 publish.js（同进程或 spawn）
- 需在两个项目间建立调用关系
- 工作量：约 30 分钟

---

### 2.4 其他优化

| 项目 | 优化项 | 说明 |
|------|--------|------|
| geelark_publish | 任务查询脚本 | 新增 `query.js`，支持 `--task-ids` 查询任务状态，便于确认发布结果 |
| geelark_publish | 文件名预检 | 发布前自动检测文件名 >60 字符或含单引号，提示先运行 rename 脚本 |
| video_pipeline | 成片命名兼容 GeeLark | 默认输出 `生成_YYYYMMDD_HHMMSS.mp4` 已 <60 字，可保持；若用户自定义名则提示 |

---

## 三、推荐实施顺序

| 阶段 | 内容 | 预估 |
|------|------|------|
| 1 | putFile 增加 req.setTimeout，修复超时生效 | 5 min |
| 2 | video_pipeline 输出 latest.json | 20 min |
| 3 | geelark_publish 支持 --latest，从 latest.json 读取成片路径与 prompt | 25 min |
| 4 | （可选）Key 验证支持，应对 40003 | 45 min |
| 5 | （可选）HTTP 代理支持 | 30 min |

---

## 四、待确认

1. **优先级**：是否按上述 1→2→3 顺序实施？4、5 是否纳入本次？
2. **latest.json 路径**：固定为 `Ai Videos/latest.json` 是否合适？覆盖写入即可。
3. **--latest 行为**：`--latest` 时是否自动用 latest.json 中的 prompt 作为 caption 输入（供后续扩展文案生成）？
