---
name: QAS/GOBS 项目背景
description: 项目技术栈、服务器、仓库等背景常量
type: project
---

GOBS 是视频创作分发平台，QAS 是其 H5 视频工具套件。

**Why:** 每次新对话都需要重新介绍项目背景，浪费 context。
**How to apply:** 每次新对话直接引用这些常量，无需重复介绍。

## 基本信息
- 服务器: 43.134.186.196（腾讯云 CVM，SSH root@43.134.186.196）
- Git 仓库: charlesliu66/gobs（main 分支）
- 本地工作目录: C:\Users\wei.liu\Desktop\cursor_try\QAS

## 技术栈
- 前端: h5-video-tool/（Next.js/React + Vite，npm run build → dist/）
- 后端: h5-video-tool-api/（Node.js + TypeScript + Express，port 3001）
- 视频: Compass/VEO2、Dreamina CLI（即梦）、Kling API
- 图像: Compass/Imagen（gemini-3.x-flash/pro-image-preview）
- 部署: PM2 + Nginx，腾讯云 CVM

## 工作流
- 4+1 门禁式工作流，见 docs/workflow/README.md
- 任务总览: docs/TASK-INDEX.md
- 当前 6 个优化任务: TASK-01 到 TASK-06（P0: 01/02/05，P1: 03/04/06）

## Harness Enhancement（2026-04-13 完成）
- CLAUDE.md: 根目录，多工具兼容智能体指令
- scripts/eval.sh: 半自动化验证脚本，输出 eval-result.json
- SESSION-ANCHOR: 每个 workflow run 的 context 锚点模板
- memory/: 跨会话记忆文件（project.md + feedback.md）
- verifier.md: 强化为先读 eval-result.json 再做业务验证
