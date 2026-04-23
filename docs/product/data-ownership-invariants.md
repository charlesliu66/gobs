# 数据归属不变量

> Date: 2026-04-23  
> Goal: 避免项目、分镜、视频版本、batch job、素材和分发任务串线。

## Required Fields

| Object | Required fields |
|---|---|
| Project | `ownerId`, `projectId`, `projectType`, `createdFrom` |
| Shot | `projectId`, `shotIndex`, `shotId` |
| VideoVersion | `sourceProjectId`, `sourceShotIndex`, `batchJobId`, `provider` |
| BatchJob | `ownerId`, `projectId`, `sourceType`, `sourceShotIndex` |
| Asset | `ownerId`, `assetId`, `source`, `visibility` |
| PublishJob | `ownerId`, `videoId`, `platform`, `accountId` |

## Hard Rules

- 不允许无 `ownerId` 的 batch job。
- 不允许视频版本缺 `sourceProjectId`。
- 不允许跨 owner 读取素材。
- 不允许旧目录数据静默丢失；迁移或回退必须可追踪。
- 不允许用前端本地状态作为唯一归属来源；服务端保存时必须能重建归属。

## Production Wizard Rules

- Shot video version must keep `sourceProjectId`, `sourceShotIndex`, and `batchJobId` when created from a batch job.
- Project load must not silently overwrite cloud data when a remembered project id is missing.
- Legacy images may be read from compatibility paths, but new writes should land in the shared data location.

## Verification Checklist

Before shipping features that create or move data:

1. Which owner owns the object?
2. Which project or source object created it?
3. Where does it recover after refresh?
4. Can another account see it?
5. What happens if the source project is deleted?
6. What migration path covers old data?
