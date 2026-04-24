# Changelog

> Product overview lives in `PRODUCT.md`. This file tracks recent release history.

## v0.129 — 2026-04-24

**Repo 私有发布门禁、H5 冒烟技能与高级制片分镜导演规则层文档补齐**

**Internal / Release Ops:**
- 新增仓库私有 skill `gobs-release-guard`，收口 `preflight / staging-release / prod-release / post-release` 检查，并通过 PowerShell 脚本统一输出 `GO / NO-GO / GO WITH WARNINGS`。
- 新增仓库私有 skill `gobs-h5-smoke-test`，支持 `local / staging / prod` 的 `quick / full` 冒烟验证，覆盖版本接口、环境标识、关键路由与 expected commit 比对。
- 补齐私有 skill 设计文档、实施计划与 4+1 run 产物，方便后续复用和自动化接入。

**Advanced Production / Storyboard Rules:**
- 补记并校验当前主干内已存在的 `productionStoryboardRules` 规则层，补齐 design / implementation / run 文档，明确高级制片分镜的镜头时长建议、`4-15s` 平台约束和候选合并/拆分判断口径。
- 通过本轮验证确认 `/api/studio/storyboard-table` 已将导演规则上下文拼接进生成阶段的 `extraNotes`，并保留用户显式输入的补充说明。
- 通过本轮验证确认 `autoRefineShots` 会在保持 shot 数量不变的前提下，连同结构化 prompt 一起保守修正不合理的 `durationSec`。
- 记录当前主干中 `videoKling.ts` 与 `googleDriveService.ts` 的类型安全前置修复已通过本地严格编译，保证发布构建链路稳定。

## v0.127 — 2026-04-23

**高级制片分镜视频归属与导出状态收口**

**Backend / Ownership:**
- 批量分镜任务创建、取消、手动轮询和视频文件播放都改为严格校验当前登录账号，历史缺失 owner 的任务不再被任意账号读取或操作。
- Quickfilm 链式自动提交下一镜时必须同账号同项目；即梦孤儿任务恢复缺少账号、项目或分镜索引时只跳过不注册，避免产生无法归属的视频任务。

**Frontend / UX:**
- 导出审片页新增已完成、排队/生成、待处理三组汇总卡，网格视图显示每镜状态、平台排队位次或即梦队列位次。
- 新增导出页状态汇总测试和 Quickfilm 同账号同项目队列归属测试。

## v0.126 — 2026-04-23

**高级制片生图脚本部署补齐**

**Ops / Backend:**
- 后端部署现在会在上传 `dist/` 后同步上传 `h5-video-tool-api/scripts/imagen_generate.py` 到 `/home/ubuntu/qas-h5/<env>/scripts/`，覆盖角色定妆、形象状态衣橱、场景/道具图、分镜首帧等共用 Compass/Imagen 生图链路。
- 新增部署脚本回归测试，验证运行时脚本远端目录计算和缺失脚本拦截，避免后续发布再次漏发 `imagen_generate.py`。

## v0.125 — 2026-04-23

**高级制片分镜选择后直达主操作**

**Frontend / UX:**
- 从分镜状态导航或“跳到待处理”选中镜头后，页面会平滑滚动到当前分镜主操作卡片，减少用户手动寻找“生成分镜视频”的步骤。
- 上一镜 / 下一镜快捷浏览保持原行为，不强制滚动，避免打断逐镜检查节奏。

## v0.124 — 2026-04-23

**高级制片分镜待处理导航**

**Frontend / UX:**
- 分镜状态导航新增“待处理”筛选，合并未生成、失败、已取消镜头，帮助用户优先找到需要动作的分镜。
- 分镜导航新增待处理、队列中、已完成三组汇总卡，并提供“跳到待处理”快捷按钮，直接选中下一条可生成/可重试镜头。
- 待处理分镜卡片补充操作提示，区分“选择后点击主按钮生成”和“选择后可重新生成”。

## v0.123 — 2026-04-23

**高级制片分镜操作区可用性增强**

**Frontend / UX:**
- 分镜状态导航上移到平台状态下方、编辑区上方，用户先定位未生成/排队/失败镜头，再进入当前镜头操作。
- “生成分镜视频”升级为当前分镜主 CTA，增加更高视觉权重、排队位次提示和已完成分镜的“重新生成分镜视频”文案。
- 批量生成、取消本项目排队、同步即梦状态与分镜状态导航合并为同一操作区，减少页面底部来回滚动。

## v0.122 — 2026-04-23

**高级制片分镜状态标签收口**

**Frontend / UX:**
- 分镜条状态筛选和卡片状态文案统一复用 `shotUserStatus` 的 `productionWizard.status.*` label key，避免组件内再维护一套本地 switch 文案。
- 补充分镜状态 helper 回归测试，确保用户态状态与 i18n label key 保持稳定映射。

## v0.121 — 2026-04-23

**高级制片默认路径瘦身与分镜状态导航**

**Frontend / UX:**
- 高级制片分镜页新增“高级工具”收纳层，默认保留生成分镜视频、批量生成缺失视频、任务状态和预览结果。
- “生成分镜图”默认下线，改为高级工具里的“生成首帧”；图生视频缺首帧时提示先展开高级工具生成首帧。
- 分镜条升级为可筛选状态列表，支持全部、未开始、等待提交、平台排队中、正在生成、已完成、失败、已取消。
- 当前分镜新增上一镜 / 下一镜操作，并支持 `[` / `]` 快捷键，文本输入时不触发。
- 形象演化树降级为“角色形象变体”，主界面默认不展开树关系，“编辑形象变体”直接打开明确弹窗。

**Engineering / Governance:**
- 新增 `shotUserStatus` 用户态状态 helper 与回归测试，避免 stale submit id 覆盖 active job 或已完成媒体。
- 新增状态模型、数据归属不变量和用户路径文档，为后续跨页面状态统一做基线。

## v0.120 — 2026-04-23

**高级制片项目与分镜状态英文收口**

- 高级制片项目弹窗改为 key 驱动，项目列表、搜索、空状态、治理未命名项目、打开/重命名/删除确认与项目更新时间跟随 `uiLocale`。
- 高级制片运行状态提示补齐英文，项目加载失败、命名保存、批量任务同步、补全缺图、分镜视频生成/取消/检查进度等文案统一进入 `productionWizard.*` key。
- 英文内容链路减少中文 prompt 前缀。
- 高频 key 加入回归断言。

## v0.119 — 2026-04-23

**高级制片历史图片回显修复**

- `/api/production/image` 兼容旧产物目录，避免历史角色图、场景图、分镜缩略图 404。
- 补充历史图片目录回归测试。
- 线上 prod 补回旧目录高级制片图片到 shared-data。

## v0.118 — 2026-04-23

**Generate Video 英文表单与写稿提示收口**

- Generate Video 主表单改为 key 驱动。
- Viral Dance 与短剧写稿提示补齐英文。
- Viral Dance 默认 prompt 跟随内容语言。
- Generate Video 高频 key 加入回归断言。

## v0.117 — 2026-04-23

**英文本地化第二批 key 库收口**

- 高级制片主壳层改为统一 key 驱动。
- Generate Video 入口补齐第二批可复用 key。
- 本地化 key 回归测试覆盖 Generate 与 Production Wizard。

## v0.116 — 2026-04-23

**高级制片正式环境历史项目自动归位**

- 高级制片项目读取补齐旧目录回退与自动迁移。
- 失效 `projectId` 不再把高级制片锁死。

## v0.115 — 2026-04-23

**英文本地化第一批 key 库收口**

- 画廊与历史页改为统一 message key 驱动。
- 批量任务看板补齐英文状态与时间格式。
- 通用错误与输出文件 helper 收口到 locale-aware 工具层。
- 新增输出画廊本地化 helper 回归测试。

## v0.114 — 2026-04-23

**高级制片英文翻译链路 JSON 容错兜底**

- `replyLocale` 英文翻译结果改为容错解析。
- 英文本地化降级为 best-effort，不因翻译失败阻断主链路。
- 新增 replyLocale 脏 JSON 回归测试。

## v0.113 — 2026-04-23

**发布门禁自动化与 staging verified 提升机制**

- `deploy_all.py` 升级为带门禁的正式发布入口。
- 新增 staging 验证确认脚本。
- 后端部署补齐 PM2 online 硬检查。
- 发布 Runbook 与项目级规则同步更新。

## v0.112 — 2026-04-23

**双环境发布规则固化到项目级指令**

- `AGENTS.md` / `CLAUDE.md` 改成 staging-first 强制口径。
- `docs/CODEX-CLI-PROJECT-GUIDE.md` 补齐长版双环境发布说明。

## v0.111 — 2026-04-23

**单人多电脑发布 Runbook 与状态切换脚本**

- 新增本地发布状态切换脚本。
- 新增每台发布电脑的本地配置样板。
- 新增单人多电脑发布 Runbook。
