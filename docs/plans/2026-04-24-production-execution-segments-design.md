# 2026-04-24 Production Execution Segments Design

## 背景

高级制片当前已经有一层“故事分镜”：

- `shots[]` 由 `/api/studio/storyboard-table` 生成
- 用户围绕 `shots[]` 编辑、预览、生成视频
- 当前任务模型是 `1 shot = 1 batch job = 1 Dreamina video`

但平台真实约束是单次视频生成更适合落在 `4-15s`。这导致两个实际问题：

1. 小于 `4s` 的快切镜头即使在表里存在，提交时也只是被粗暴提到 `4s`
2. 大于 `15s` 的长镜头缺少拆段策略，执行质量不稳定

第一阶段已经把导演规则引入 storyboard 生成层，减少明显不合理的时长。第二阶段目标是在不改变原始分镜展示心智的前提下，引入“执行分段层”。

## 目标

在保留原始 `shots[]` 作为“故事分镜”的前提下，新增 `executionSegments[]` 作为“即梦执行分段”。

用户界面默认仍按原始分镜浏览，但实际提交给 Dreamina 的单位变成 execution segment：

- `<4s` 的短镜头可合并为一个 segment
- `>15s` 的长镜头可拆分为多个 segments
- `4-15s` 的镜头默认保持 `1 shot = 1 segment`

执行结果、状态、失败信息不再直接绑定单个 shot，而是先绑定 segment，再聚合回原始 shot。

## 核心设计

### 1. 双层模型

保留：

- `shots[]`：叙事分镜 / 用户编辑对象

新增：

- `executionSegments[]`：执行层对象 / 提交给 Dreamina 的真实单位

聚合原则：

- 用户默认看 `shots[]`
- 每个 shot 下可展开看到相关 `executionSegments`
- shot 的整体状态来自其关联 segments 的聚合

### 2. Execution Segment 结构

建议新增前后端通用字段：

```ts
interface ProductionExecutionSegment {
  id: string;
  segmentOrder: number;
  sourceShotIndexes: number[];
  primaryShotIndex: number;
  mode: 'direct' | 'merged_short' | 'split_long';
  durationSec: number;
  storyboardText: string;
  segmentLabel: string;
  status?: 'idle' | 'awaiting_submit' | 'pending' | 'queuing' | 'processing' | 'done' | 'failed' | 'cancelled';
  videoUrl?: string;
  failReason?: string;
  queueInfo?: {
    queue_idx?: number;
    queue_length?: number;
    queue_status?: string;
  };
  jobIds?: string[];
}
```

补充到原始 shot 的轻量关联字段：

```ts
interface ProductionShot {
  executionSegmentIds?: string[];
}
```

## 分段规则

### A. Direct

如果 shot 的 `durationSec` 落在 `4-15s` 且内容无需拆分：

- 生成一个 `mode = direct` 的 segment
- `sourceShotIndexes = [shotIndex]`

### B. Merged Short

如果出现 `<4s` 的连续短镜头，并满足以下条件，可合并：

- 相邻 shot 连续
- 主体连续或场景连续
- prompt 可自然串接
- 合并后总时长落在 `4-15s`

合并规则：

- 优先只合并连续短镜头
- 优先限制为 `2-3` 个短镜头一组
- 如果累计超过 `15s`，则停止继续合并

### C. Split Long

如果单个 shot `>15s`：

- 拆分为多个 `mode = split_long` 的 segments
- 依据动作阶段、镜头阶段或叙事阶段拆 prompt
- 每段目标落在 `6-10s`，最长不超过 `15s`

本次不要求复杂 NLP 分句器，首版可先按稳定规则拆分：

- 优先根据动作连接词 / 阶段词拆分
- 拆分失败时按时长平均分段，但保留原始 prompt 的阶段标记

## 状态聚合

shot 聚合状态只用于 UI 展示，不作为真实任务状态源。

推荐聚合口径：

- 全部 segment `done` -> shot `done`
- 任一 segment `processing` -> shot `processing`
- 任一 segment `queuing/pending/awaiting_submit` 且无 processing -> shot `queued`
- 部分 done、部分未完成 -> shot `partial`
- 任一 segment `failed` 且无进行中 -> shot `failed_partial` 或 `failed`
- 全部 cancelled -> shot `cancelled`

这样原始分镜列表仍可保持简洁，但展开后能看到每个执行段详情。

## Batch Job 模型变更

当前 batch job 只有：

- `shotIndex`

第二阶段需要新增：

- `segmentId`
- `sourceShotIndexes`
- `primaryShotIndex`

保持 `shotIndex` 兼容保留，但语义改为：

- `shotIndex = primaryShotIndex`

真实回写与状态定位优先使用 `segmentId`。

## 项目持久化

项目 JSON 中新增：

```ts
interface ProductionProject {
  executionSegments?: ProductionExecutionSegment[];
}
```

兼容策略：

- 老项目若无 `executionSegments`，在加载或生成前自动补齐为 direct segments
- 保存项目时一并持久化 `executionSegments`
- 保留现有 `shots[]` 结构，避免历史项目失真

## 前端交互

### 默认视图

保持当前原始分镜列表不变。

每个 shot 卡片增加一块简要执行摘要：

- `1 个执行片段`
- `2 个执行片段（拆分）`
- `与 #3 合并执行`

### 展开视图

在 shot 下增加 execution segment 面板，展示：

- segment label
- 执行类型（直出 / 合并 / 拆分）
- 时长
- 来源 shot
- 当前状态
- 视频结果 / 失败信息

### 生成动作

“生成当前分镜视频”改为：

- 为该 shot 关联的全部 segments 依次或按队列提交

如果多个 shots 共用一个 merged segment：

- 该 segment 只会创建一次 job
- 相关 shots 都能看到该 segment 的共享状态和结果

## 非目标

本次不做：

1. 改写 storyboard 生成接口协议
2. 直接把 UI 主视图切成 execution segments
3. 引入复杂 AI 驱动的细粒度自动拆句系统
4. 修改禁改文件

## 风险

### 1. 合并段被多个 shot 共享，UI 容易重复显示

应对：

- 每个 segment 用唯一 `segmentId`
- 前端按 `segmentId` 去重展示共享 segment

### 2. 历史项目没有 executionSegments

应对：

- 引入兼容初始化：老项目自动补 direct segments

### 3. 回写链路仍按 shotIndex 设计

应对：

- batch job 增加 `segmentId`
- 回写 project 时优先写 segment，再聚合更新 shot 摘要字段

## 验收标准

1. 原始 shot UI 保持不变
2. `<4s` 连续镜头会合并成 execution segment
3. `>15s` 镜头会拆成多个 execution segments
4. 真正提交 Dreamina 的单位是 segment 而不是 shot
5. 老项目可正常加载并回退到 direct segment 模式
6. staging / prod smoke 通过

