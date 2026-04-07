# Quality at Scale — Skills 进展总结

**更新日期**: 2025-03-13

---

## 1. 当前进展

### 1.1 本地 / Cursor 路径（可闭环）

| 能力 | 状态 | 说明 |
|------|------|------|
| **video-create-distribute** | ✅ 可用 | 统一入口：生成 + 管理 + 分发 |
| **video-pipeline** | ✅ 可用 | Prompt + 素材 → Seedance → 成片（run.js） |
| **geelark-publish** | ✅ 可用 | 成片 → GeeLark API → TikTok/INS/YouTube/Facebook |
| **video-director** | ✅ 已增强 | 2025-03-12 更新：Seedance 2.0、TT OM 结构、安全声明等 |
| **storyboard-studio** | ✅ 可用 | 分镜规范，被 video-director 调用 |

用户说「做个 10 秒浪人视频发到 TikTok」可在 Cursor 内闭环完成。

### 1.2 H5 网页工具部分完成

| 模块 | 状态 | 实现 |
|------|------|------|
| Prompt 输入 + 关键词 | ✅ | `keywords.ts`、`POST /api/prompt/polish` |
| Drive 检索与素材选择 | ✅ | `DriveMaterialPicker`、`POST /api/drive/search` |
| **promptPolish 服务** | ✅ | Compass Gemini（chat/completions）生成分镜格式 prompt + 中英双语 searchKeywords |
| video-director / storyboard-studio | ⚠️ 部分 | SKILL 文件在 `h5-video-tool-api/src/skills/`，未以正式 API 形式接入 |

### 1.3 video-director 近期优化

- 整合 seedance-rules.md（Seedance 2.0 规范）
- 分镜必含：主体、环境、光线、运镜、色调
- 安全声明、500 字限制、TT OM 竖屏结构

---

## 2. 卡点

### 2.1 高优先级（阻塞主流程）

| 卡点 | 影响 | 现状 |
|------|------|------|
| **H5 分镜生成 API** | Phase 0 不能完整走通 Prompt → 分镜 | 有 `promptPolish` 提供分镜格式输出，但尚未以正式分镜生成 API 暴露；未显式调用 video-director skill |
| **H5 视频生成 API** | 无法从分镜到成片 | 缺 `POST /api/video/generate`，未封装 Seedance 提交与轮询 |
| **H5 发布 API** | 无法从成片到社媒 | 缺 `POST /api/publish`，未封装 GeeLark |
| **GeeLark 上传 ETIMEDOUT** | 内网/防火墙环境上传失败 | 需 putFile 超时或「手动上传 + URL」等方案 |
| **发布结果无验证** | 发布后不知成功/失败 | 缺少任务完成后自动 query 与失败原因提示 |

### 2.2 中优先级（体验与稳定性）

| 卡点 | 影响 |
|------|------|
| **账号登录前置检查** | 云手机未登录导致多任务失败 |
| **配置路径分散** | 各 skill 从不同路径读配置 |
| **GeeLark 40003 签名** | 部分账号需要 Key 验证 |

### 2.3 低优先级（扩展）

| 卡点 |
|------|
| 世界观文档检索未落地 |
| list-videos / delete-video 管理能力偏弱 |
| Skill 间契约/接口文档缺失 |

---

## 3. 后续重点

### 3.1 补全 Phase 0 后端（优先）

1. **分镜生成**：新增 `POST /api/prompt/generate`，或把现有 `promptPolish` 正式定位为分镜生成服务并接入前端；
2. **视频生成**：新增 `POST /api/video/generate`，对接 Seedance（提交任务 + 轮询 + 下载）；
3. **发布**：新增 `POST /api/publish`，封装 GeeLark 上传与自动化发布。

### 3.2 串联 H5 前端

- 分镜展示 → 用户确认 → 调用视频生成 → 轮询 → 成片下载；
- 串联现有「Prompt + Drive 检索」与「生成 + 发布」流程。

### 3.3 本地 / Cursor 路径优化

- 发布后自动 query 任务状态；
- 发布前检查云手机 TikTok 是否已登录；
- 统一从 `QAS/config/` 读取配置。

### 3.4 实践路径对比

| 路径 | 状态 |
|------|------|
| 本地 / Cursor | ✅ 可闭环 |
| H5 网页 | ⚠️ Phase 0 未完成，卡在分镜→视频→发布 API |

---

## 4. 简要结论

- **Skills 层**：核心技能已打通，本地路径可闭环。
- **H5 工具**：Prompt polish + Drive 检索已有，但缺少视频生成与发布 API，无法形成完整流水线。
- **下一步**：优先补齐 H5 后端 API（分镜→视频→发布），再串联前端流程，最后做本地/Cursor 的发布验证与配置统一。
