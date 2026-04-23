# 用户态任务状态模型

> Date: 2026-04-23  
> Scope: Production Wizard first, then QuickFilm / History / Gallery / Batch Jobs / Publish.

## Goal

用户只需要理解“任务现在能不能继续、卡在哪里、是否能恢复”。前端页面默认展示用户态状态，provider 原始状态只作为 tooltip、日志或排障信息保留。

## User-Facing Statuses

| 用户态 | 用户文案 | Meaning |
|---|---|---|
| `not_started` | 未开始 | 还没有提交生成，也没有可播放结果 |
| `waiting_submit` | 等待提交 | H5 或平台调度器尚未提交到模型平台 |
| `platform_queueing` | 平台排队中 | 已进入 Dreamina / Kling / VEO 等平台队列 |
| `generating` | 正在生成 | provider 正在生成，或后端已记录 submitId 并持续跟进 |
| `completed` | 已完成 | 已有可访问结果 |
| `failed` | 生成失败 | 明确失败，可重试 |
| `cancelled` | 已取消 | 用户或系统取消 |

## Provider Mapping

| Provider / local state | User status | Notes |
|---|---|---|
| no video, no job, no submit id | `not_started` | 默认空状态 |
| `awaiting_submit` | `waiting_submit` | 平台调度器还没真正提交 |
| `pending` | `platform_queueing` | 已提交，等待平台受理 |
| `queuing` | `platform_queueing` | provider 队列中 |
| `processing` | `generating` | provider 正在生成 |
| pending submit id without active job | `generating` | 刷新恢复或后端仍在跟进 |
| `done` or existing playable media | `completed` | 媒体存在优先级最高 |
| `failed` without playable media | `failed` | 展示失败原因和重试入口 |
| `cancelled` without playable media | `cancelled` | 展示取消原因 |

## Display Rules

- 已完成媒体优先级最高，不能被旧 `pendingVideoSubmitId` 覆盖。
- active job 优先于旧 submit id：`awaiting_submit` 不能被 stale submit id 显示成“正在生成”。
- 用户默认只看用户态状态；原始 provider 状态可以放在 title / tooltip。
- 失败和取消必须能停止“生成中”视觉状态。
- 批量列表应支持按用户态筛选。

## Refresh Recovery

页面刷新后：

1. 从项目分镜读取已有媒体。
2. 从 batch jobs 读取 active / terminal job。
3. 如无 active job 但有 submit id，显示 `generating` 并允许手动检查。
4. 如果后端确认 failed / cancelled，清理 pending submit id 并写入 `lastVideoError`。

## Logging Boundary

- 用户文案：简短、可行动，例如“平台排队中”“选择后可重新生成”。
- 开发日志：保留 submit id、job id、provider status、queue info。
- 不把 `submitId` / `batch job` 作为默认用户主文案。
