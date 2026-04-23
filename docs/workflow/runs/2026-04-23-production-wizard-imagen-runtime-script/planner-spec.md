# Planner Spec: Production Wizard Imagen Runtime Script

## Problem

用户在高级制片的形象状态衣橱中生成形象变体时，线上后端返回：

```text
/usr/bin/python3: can't open file '/home/ubuntu/qas-h5/prod/scripts/imagen_generate.py': [Errno 2] No such file or directory
```

## Investigation Findings

- `CharacterWardrobePanel` 的基础形象、状态变体生成走前端 `generateFrames()`。
- 高级制片角色、场景、道具补图、重试缺图和分镜首帧也走 `generateFrames()`。
- 角色肖像/定妆走 `generateCharacterPortrait()` 或 `standardizeCharacterImage()`。
- 后端 `/api/storyboard/frames`、`/api/storyboard/portrait`、`/api/storyboard/images`、`/api/character/standardize-image` 最终均调用 `generateImageWithPython()`。
- 线上运行时代码期望脚本位于 `/home/ubuntu/qas-h5/<env>/scripts/imagen_generate.py`，但当前部署脚本只上传 `dist/` 到 `/home/ubuntu/qas-h5/<env>/api`。

## Decision

在部署层补齐 `imagen_generate.py` 的运行时上传，让 staging/prod 每次后端发布都同步拥有 `<env>/scripts/imagen_generate.py`。该修复覆盖所有共用 Compass/Imagen 生图入口，避免逐个前端入口打补丁。

## Acceptance Criteria

- 后端部署脚本会把 `h5-video-tool-api/scripts/imagen_generate.py` 上传到目标环境 `scripts/` 目录。
- 部署脚本测试覆盖运行时脚本路径计算和脚本缺失时的拦截。
- 后端 TypeScript 检查通过。
- 后端 build 通过。
- 前端 build 通过。
