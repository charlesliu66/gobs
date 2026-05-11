# Campaign 素材生产覆盖率 V2 调整计划

> Date: 2026-05-11
> Audience: GOBS 内部开发 / OpenClaw Review
> Status: Review Draft
> Based on: `2026-05-11-campaign-production-coverage-and-team-assets-plan.md` + OpenClaw 代码审查反馈

## 1. 这次为什么要调整

原方案的大方向仍然成立：下一阶段应该优先提升 `Campaign 素材生产覆盖率`，而不是先做更复杂的创意质量诊断。

核心问题也没有变：

```text
用户 brief 一个 Campaign 后，如果系统拆出 12 个需制作素材，但 GOBS 只能推进 3 个，
用户会直接感知为“平台能力不足”。
```

但 OpenClaw 的反馈指出了一个关键风险：原方案有些地方写得像绿地建设，而当前代码库已经有不少基础能力。如果直接照原方案开工，容易出现三类问题：

- 重复造轮子：例如 `assetDb.ts`、`assetLibrary.ts`、`assetIngestService.ts`、`DriveBrowser.tsx` 已经存在。
- 破坏已有数据：例如现有 `ProductionCapability` 已经落库/传输，不能直接替换成新的枚举值。
- 范围失控：例如 Banner 第一版如果同时做 prompt、模板预览、前端设计器，很容易变成半个设计工具。

所以 V2 的调整原则是：

```text
先审计，再增量。
先兼容，再扩展。
先覆盖，再质量。
先 prompt/结构化产物，再复杂渲染。
```

## 2. V2 核心结论

### 2.1 目标不变

下一阶段主目标仍然是：

```text
Campaign 素材生产覆盖率提升
```

优先补齐高频、低风险、对市场同学感知最直接的素材类型：

- Caption set
- Headline set
- CTA set
- Hashtag set
- Platform post copy
- Campaign banner prompt
- Thumbnail / cover brief
- Short video production brief
- Character showcase production brief
- Motion reference production brief

### 2.2 实施方式变化

原方案的“新增一套能力分级、产物类型、素材库结构”调整为：

```text
在现有 CampaignOutputPlan / Asset Library / Google Drive / Distribution Package 基础上增量增强。
```

第一阶段不做大迁移，不重命名已有类型，不新建同名模块。

### 2.3 覆盖率口径要拆开

原方案的 `Campaign Output Coverage Rate = 可推进产物数 / 总产物数` 需要细分，否则 `brief_ready` 会把指标虚高。

V2 采用三个指标：

| 指标 | 口径 | 用途 |
|---|---|---|
| True Production Coverage | 可直接生成或模板化生成的产物 / 总产物 | 衡量用户真实感知的“能做多少” |
| Assistive Coverage | 只能生成制作说明的产物 / 总产物 | 衡量系统能不能帮用户推进人工制作 |
| Blocked Rate | 缺素材或暂不支持的产物 / 总产物 | 衡量当前阻塞在哪里 |

建议口径：

```text
True Production Coverage = auto_ready + template_ready
Assistive Coverage = brief_ready
Blocked = needs_source_asset + unsupported
```

`brief_ready` 不能算进真实覆盖率，只能单独展示为“可辅助推进”。

## 3. 当前代码事实盘点

以下是 V2 必须承认并复用的现有能力。

### 3.1 Campaign Output Plan 已存在

现有文件：

```text
h5-video-tool/src/components/campaign/outputPlan.ts
h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx
h5-video-tool-api/src/services/campaignOutputPlan.ts
h5-video-tool-api/src/routes/campaignOutputPlan.ts
```

现有 `ProductionItemType`：

```ts
type ProductionItemType =
  | 'fb_post'
  | 'tiktok_video'
  | 'short_video'
  | 'banner'
  | 'caption_set'
  | 'headline_set'
  | 'hashtag_set';
```

现有 `ProductionCapability`：

```ts
type ProductionCapability =
  | 'supported'
  | 'supported_with_source_assets'
  | 'unsupported'
  | 'manual_recommended';
```

V2 不能直接把它替换成：

```ts
auto_ready | template_ready | brief_ready | needs_source_asset | unsupported
```

否则可能破坏已有 Output Plan 数据、测试和前后端 contract。

### 3.2 Asset Library 已有基础设施

现有文件：

```text
h5-video-tool-api/src/db/assetDb.ts
h5-video-tool-api/src/services/assetLibrary.ts
h5-video-tool-api/src/services/assetIngestService.ts
h5-video-tool-api/src/services/assetTaggingService.ts
h5-video-tool-api/src/services/assetThumbnailService.ts
h5-video-tool-api/src/services/assetReuseService.ts
h5-video-tool-api/src/routes/assetLibrary.ts
h5-video-tool-api/src/types/assetLibrary.ts
h5-video-tool/src/api/assetLibraryApi.ts
h5-video-tool/src/pages/AssetLibraryPage/*
h5-video-tool/src/materials/assetReuse.ts
```

现有 `assets` 表已经包含：

```text
sha256
width
height
duration
fps
orientation
has_audio
ai_category
team_category
folder_id
deleted_at
```

所以 Asset Preprocessing 不能按“从零建设”估算。下一步应补的是：

- Team 可见性。
- 素材来源和存储来源字段。
- 容量和文件大小保护。
- 前端筛选与复用体验。
- Google Drive 导入后写入 Team Asset 的最后一段链路。

### 3.3 Google Drive 基础入口已存在

现有文件：

```text
h5-video-tool/src/pages/AssetLibraryPage/DriveBrowser.tsx
h5-video-tool/src/api/googleDriveApi.ts
h5-video-tool-api/src/services/googleDriveService.ts
```

因此 Drive Run 不应写成“支持浏览 My Drive / Shared Drive”。下一步应缩小为：

```text
从已有 Drive Browser 选择文件 -> 复制到 GOBS Team Library -> 写 asset metadata -> 跑现有预处理。
```

### 3.4 CampaignOutputWorkbench 已存在

现有文件：

```text
h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx
```

下一步应增强这个 Workbench，而不是新建一个平行 Workbench。

## 4. 兼容策略

### 4.1 不直接替换 ProductionCapability

保留已有落库/传输枚举：

```ts
'supported'
'supported_with_source_assets'
'unsupported'
'manual_recommended'
```

新增一个 UI / 指标层的映射，不改变底层数据。

建议命名：

```ts
type ProductionReadiness =
  | 'auto_ready'
  | 'template_ready'
  | 'brief_ready'
  | 'needs_source_asset'
  | 'unsupported';
```

映射规则第一版：

| Existing capability | 条件 | UI readiness |
|---|---|---|
| `supported` | 文本类产物 | `auto_ready` |
| `supported` | 已有安全模板的视觉产物 | `template_ready` |
| `supported_with_source_assets` | 所需素材已满足 | `template_ready` |
| `supported_with_source_assets` | 所需素材缺失 | `needs_source_asset` |
| `manual_recommended` | 可生成制作说明 | `brief_ready` |
| `unsupported` | 当前无安全路径 | `unsupported` |

这层可以放在前端 view model 中，例如：

```text
h5-video-tool/src/components/campaign/outputCoverageViewModel.ts
```

如果后续确认需要后端也计算，再加同名后端 helper，但第一版不要做数据迁移。

### 4.2 不直接替换 ProductionItemType

保留已有类型：

```text
fb_post
tiktok_video
short_video
banner
caption_set
headline_set
hashtag_set
```

新增类型必须先做映射判断。

| V1 建议类型 | V2 处理方式 |
|---|---|
| `cta_set` | 可新增，但先确认是否应作为 `caption_set/headline_set` 的 produced output kind，还是独立 item type |
| `platform_post_pack` | 第一版不要落库为新 type，先作为 `fb_post` / `tiktok_video` / caption/headline 的 UI 分组 |
| `campaign_banner` | 不新增，沿用现有 `banner` |
| `thumbnail_cover` | 暂不新增，可作为 `banner` 的 subtype 或 produced output kind |
| `short_video_brief` | 不新增，沿用 `short_video` + `manual_recommended` / `brief_ready` 映射 |
| `character_showcase_brief` | 暂不新增，先作为 Studio intent / brief template |
| `motion_reference_brief` | 暂不新增，先作为 Studio intent / brief template |

判断标准：

```text
只有当一个产物需要独立状态、独立生产动作、独立分发桥接时，才新增 ProductionItemType。
否则先用 subtype / output kind / UI group 表达。
```

### 4.3 Text 输出优先补 produced output，而不是乱扩 item type

现有 `ProducedOutputKind` 已包含：

```ts
'caption' | 'headline' | 'hashtag' | 'post_copy' | 'banner_prompt'
```

V2 应优先补：

```text
cta
platform_post_copy variants
```

但要先检查它们是否更适合放在 `post_copy` 的结构里，而不是直接扩 `ProductionItemType`。

## 5. 修订后的 Run 拆解

### Run 0 - Existing Capability Audit & Compatibility Map

#### 目标

先做半天到一天的代码审计，把“已有 / 需增强 / 净新增 / 禁止碰”的边界定清楚。

#### 产物

- 代码审计表。
- capability 映射表。
- output type 映射表。
- 真实或样例 Campaign Output Plan 的产物分布统计。
- 第一批开发文件白名单。

#### 必查文件

```text
h5-video-tool/src/components/campaign/outputPlan.ts
h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx
h5-video-tool-api/src/services/campaignOutputPlan.ts
h5-video-tool-api/src/db/assetDb.ts
h5-video-tool-api/src/services/assetLibrary.ts
h5-video-tool-api/src/services/assetIngestService.ts
h5-video-tool-api/src/services/assetReuseService.ts
h5-video-tool-api/src/services/googleDriveService.ts
h5-video-tool/src/pages/AssetLibraryPage/DriveBrowser.tsx
h5-video-tool/src/api/googleDriveApi.ts
```

#### 建议审计命令

```bash
rg -n "ProductionCapability|ProductionItemType|manual_recommended|supported_with_source_assets" h5-video-tool h5-video-tool-api
rg -n "sha256|team_category|storage_provider|source_provider|visibility|team_id" h5-video-tool h5-video-tool-api
rg -n "DriveBrowser|googleDriveApi|googleDriveService" h5-video-tool h5-video-tool-api
rg -n "CampaignOutputWorkbench|ProducedOutputKind|banner_prompt|post_copy" h5-video-tool h5-video-tool-api
```

#### 验收标准

- 不再出现“建议新建一个实际已存在的同名模块”。
- 每个后续 Run 都能标注是“增强现有文件”还是“新增小模块”。
- 明确哪些 enum 可以新增，哪些只能 UI 映射。
- Coverage baseline 不再假设 25%-35%，而是来自当前样例或真实 Output Plan 统计。

### Run 1A - Coverage Map UI Compatibility Layer

#### 目标

在不改落库枚举的前提下，让用户看到 Campaign 需要多少素材、哪些能直接生成、哪些需要素材、哪些只能生成制作说明。

#### 主要改动

- 增加 `ProductionReadiness` UI 映射。
- 增加 coverage summary。
- 增加 blocked / assistive / true coverage 分口径展示。
- 增强现有 `CampaignOutputWorkbench.tsx`，不要新建平行页面。

#### 建议文件

```text
h5-video-tool/src/components/campaign/outputCoverageViewModel.ts
h5-video-tool/src/components/campaign/outputCoverageViewModel.test.ts
h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx
h5-video-tool/tests/campaignOutputWorkbenchIntegration.test.ts
```

#### 不做

- 不替换 `ProductionCapability`。
- 不迁移已有 Output Plan。
- 不新增复杂产物类型。

#### 验收标准

- Workbench 顶部展示 `True Production Coverage / Assistive Coverage / Blocked`。
- `manual_recommended` 显示为“可生成制作说明”，不算进 true coverage。
- `supported_with_source_assets` 缺素材时显示具体缺口和下一步。

### Run 1B - Text Production Pack Prompt Strategy

#### 目标

快速提升 Campaign 高频文本素材覆盖率，优先让一个 Campaign 产出可编辑、可进入分发的文本资产。

#### 为什么可以并行

文本产物不强依赖 Team Assets，也不强依赖 Banner。因此它可以和 Run 1A 并行，而不是等 Run 2/3 完成。

#### 包含

- Caption variants
- Headline / hook variants
- CTA variants
- Hashtag set
- Platform post copy

#### 关键调整

原方案只说“生成 3-5 条 caption / 5-10 条 headline”，但没有说明如何避免泛泛内容。V2 必须补 prompt 策略。

每个文本产物必须绑定：

```text
platform
angle
audience
tone
source brief
selling point
CTA intent
forbidden claims
knowledge citations if available
```

#### Prompt 约束

- 不允许只输出泛泛营销句。
- 每条文案要带使用场景，例如 TikTok hook、FB feed headline、community caption。
- 每条文案要可编辑、可标记 `draft / needs_review / approved`。
- 风险词和夸大承诺必须从 Campaign brief / knowledge guardrails 中继承。

#### 建议文件

```text
h5-video-tool/src/components/campaign/textProductionPrompt.ts
h5-video-tool/src/components/campaign/textProductionPrompt.test.ts
h5-video-tool/src/components/campaign/outputPlan.ts
h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx
h5-video-tool/tests/campaignOutputProductionAdapter.test.ts
```

#### 不做

- 不为 `platform_post_pack` 新增落库 item type。
- 不接真实社媒发布。
- 不承诺文案免审核。

#### 验收标准

- 一个 Campaign 至少能得到 caption/headline/CTA/hashtag/post copy 的结构化草稿。
- 每条文本都保留来源 brief / angle / platform。
- 文本产物能进入 Distribution Package 的候选文案。

### Run 2 - Team Asset Visibility & Storage Guard

#### 目标

在现有 Asset Library 上补 Team 共享能力和存储保护，而不是重建素材库。

#### 主要改动

- 增加或确认 team visibility 字段。
- 增加 source provider / storage provider 字段。
- 增加文件大小和团队容量限制。
- 增加查询层 team 权限 helper。
- 前端区分 My Assets / Team Assets。

#### 建议新增/增强字段

```text
team_id
visibility
storage_provider
storage_key
source_provider
source_external_id
source_name
```

#### MVP team 策略

如果正式 team 系统还没准备好，第一版可以使用：

```text
default-team
```

但必须同时留下迁移口：

- 所有查询都通过 `resolveActorTeamId(user)` 之类 helper。
- 不能在业务代码各处散落硬编码 `default-team`。
- 文档里写清楚：未来真实 team 系统上线时，`default-team` 数据如何迁移或归属。

#### 存储保护建议

第一版用当前云服务器存储，但必须加保护：

| 项 | 建议 |
|---|---|
| 单文件上限 | Team Asset 第一版建议 50MB |
| Team 总容量 | 先做软限制和告警，建议默认 20GB |
| 删除策略 | 软删除优先，保留恢复口 |
| 可观测性 | Asset Library 展示当前 team 已用容量 |

如果现有视频素材上传需要超过 50MB，不要直接放宽全部 Team Asset；可以后续单独给 `video_clip` 类素材开更高限制。

#### 建议文件

```text
h5-video-tool-api/src/db/assetDb.ts
h5-video-tool-api/src/types/assetLibrary.ts
h5-video-tool-api/src/services/assetLibrary.ts
h5-video-tool-api/src/services/assetIngestService.ts
h5-video-tool-api/src/routes/assetLibrary.ts
h5-video-tool/src/api/assetLibraryApi.ts
h5-video-tool/src/pages/AssetLibraryPage/*
```

#### 不做

- 不接对象存储 / EMC。
- 不做复杂组织架构。
- 不让 Google Drive 成为主存储。

#### 验收标准

- Team Assets 对同 team 用户可见。
- Private Assets 仍只对 owner 可见。
- 查询层有统一 owner/team helper。
- 超过文件大小或容量限制时有明确错误文案。

### Run 3 - Asset Preprocessing Gap Fill

#### 目标

补齐“素材能不能用于生产”的体验缺口，而不是重新做预处理系统。

#### 当前已有

现有 DB 和服务已经覆盖较多字段：

```text
sha256
width / height
duration / fps
orientation
has_audio
ai_category
team_category
thumbnail service
tagging service
reuse service
```

#### 下一步只补缺口

- 前端筛选和展示是否足够好。
- 重复素材提示是否能被用户理解。
- team category 是否能人工修正。
- Banner 是否能识别可用主视觉、Logo、玩法截图。
- Drive 导入后是否复用同一套预处理。

#### 建议文件

```text
h5-video-tool-api/src/services/assetReuseService.ts
h5-video-tool-api/src/services/assetIngestService.ts
h5-video-tool-api/src/routes/assetLibrary.ts
h5-video-tool/src/materials/assetReuse.ts
h5-video-tool/src/pages/AssetLibraryPage/*
```

#### 不做

- 不重写 `assetTaggingService.ts`。
- 不重写 `assetThumbnailService.ts`。
- 不新增一套独立 preprocessing pipeline。

#### 验收标准

- Asset Library 能按类型、方向、比例、team category 筛选。
- 重复文件能提示“已存在 / 可复用”。
- Campaign/Banner 选择素材时能优先看到适配素材。

### Run 4 - Campaign Banner Prompt MVP

#### 目标

补齐 Banner 生产链路的第一步：让用户能从 Campaign brief + Team Asset 生成可交付给图像模型或设计同事的 Banner prompt。

#### 关键范围收缩

原方案提到“前端模板预览”，V2 第一版先不做。

Run 4 只做：

```text
选素材 + 填关键文案 + 生成 Banner prompt + 保存到 Output Plan / Package
```

#### 第一版 Banner 字段

```text
spec: square_1_1 / portrait_4_5 / story_9_16 / landscape_16_9
mainVisualAssetId
logoAssetId
headline
subheadline
cta
visualStyle
platform
prompt
```

#### 不做

- 不做自由画布。
- 不做拖拽图层。
- 不做复杂模板预览。
- 不承诺直接生成最终 Banner 图片。

#### 为什么要这么卡范围

当前最紧急的问题是“Campaign 拆出来的 Banner 任务无法推进”，不是“Banner 设计器不够强”。Prompt MVP 可以先让 Banner 从 unsupported / manual 进入可推进状态，并验证字段是否够用。

#### 建议文件

```text
h5-video-tool/src/components/campaign/bannerPrompt.ts
h5-video-tool/src/components/campaign/bannerPrompt.test.ts
h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx
h5-video-tool/src/components/campaign/outputPlan.ts
```

#### 验收标准

- Banner item 能选择 Team Asset 作为主视觉。
- 能生成结构化 Banner prompt。
- Banner prompt 能保存为 produced output。
- Banner prompt 能进入 Distribution Package 作为素材包上下文。

### Run 4.5 - Banner Template Preview

#### 目标

仅当 Run 4 验证字段够用后，再做轻量模板预览。

#### 范围

- 只读预览。
- 只支持 1-2 个固定布局。
- 不支持拖拽。
- 不支持图层编辑。

#### 进入条件

- Run 4 中至少 5 个 Campaign Banner prompt 被人工标记为可用或需小修。
- 用户明确认为“看不到预览”影响判断效率。

### Run 5 - Output To Distribution Bridge Upgrade

#### 目标

让新增的文本产物和 Banner prompt 真正进入分发上下文。

#### 主要改动

- Caption / headline / CTA / hashtag / post copy 进入候选文案。
- Banner prompt / asset references 进入素材包上下文。
- Distribution Center 展示这些素材来自哪个 Campaign / Output Plan。

#### 建议文件

```text
h5-video-tool/src/distribution/*
h5-video-tool/src/distribute/*
h5-video-tool/src/tabs/TabDistribute.tsx
h5-video-tool-api/src/routes/campaignDistributionPackages.ts
```

#### 不做

- 不让 Banner 直接参与真实发布。
- 不改 GeeLark publish 底层 API。
- 不碰 AGENTS.md 禁止修改的底层视频服务。

#### 验收标准

- Campaign 生成的文本能在 Distribution Center 直接选择。
- Banner prompt 能作为 Package asset/context 出现。
- Package 里能看见 `campaignId / outputPlanId / productionItemId` 链路。

### Run 6 - Google Drive Import Into Team Library

#### 目标

复用已有 Google Drive Browser，把 Drive 文件导入 GOBS Team Library。

#### 主要改动

```text
Drive 选择文件
-> 复制到当前服务器 team-assets/local storage
-> 写入 asset metadata
-> 跑现有预处理
-> 返回 GOBS assetId
```

#### Metadata

```text
source_provider = google_drive
source_external_id = driveFileId
source_name = originalDriveFileName
storage_provider = local
visibility = team
```

#### 不做

- 不让 GOBS 生产链路依赖 Drive 原文件。
- 不做 Drive 文件双向同步。
- 不把 Drive 当主存储。

#### 验收标准

- 用户能从已有 Drive Browser 导入文件到 Team Assets。
- 导入后素材有 GOBS assetId。
- 导入后断开 Drive 也不影响 Campaign/Banner 使用。

## 6. 修订后的执行顺序

### 第一批：先把边界和高频文本跑起来

1. Run 0 - Existing Capability Audit & Compatibility Map
2. Run 1A - Coverage Map UI Compatibility Layer
3. Run 1B - Text Production Pack Prompt Strategy

说明：Run 1A 和 Run 1B 可以在两个窗口并行，但必须都基于 Run 0 的审计结果。

### 第二批：Team 素材底座和 Banner Prompt

1. Run 2 - Team Asset Visibility & Storage Guard
2. Run 3 - Asset Preprocessing Gap Fill
3. Run 4 - Campaign Banner Prompt MVP

说明：Run 2/3 优先级高于 Banner，因为 Banner 必须引用可靠素材。Run 4 不等 Drive 导入，可以先用上传素材和现有素材跑通。

### 第三批：分发桥接和 Drive 导入

1. Run 5 - Output To Distribution Bridge Upgrade
2. Run 6 - Google Drive Import Into Team Library

说明：Drive 导入是素材来源增强，不是 Banner MVP 的硬前置。

### 可选后续

1. Run 4.5 - Banner Template Preview
2. Object Storage / EMC migration
3. Deeper video validation
4. Creative diagnosis panel
5. Large component refactor

这些不抢第一轮目标。

## 7. 两窗口开发建议

如果要并行推进，建议这样拆：

| 窗口 | 负责内容 | 原因 |
|---|---|---|
| Window A | Run 0 + Run 1A + Run 1B | 都围绕 Campaign Output Plan / Workbench / 文本生产，文件边界接近 |
| Window B | Run 2 + Run 3 | 都围绕 Asset Library / 后端 asset schema / 前端素材库，文件边界接近 |

等 Window B 的 Team Assets 基本可用后，再开：

| 窗口 | 负责内容 |
|---|---|
| Window A 或新窗口 | Run 4 Banner Prompt MVP |
| Window B | Run 6 Drive Import Into Team Library |

Run 5 Distribution Bridge 建议单独做，避免同时改 Campaign 和 Distribution 两端导致冲突。

## 8. 明确不做清单

第一阶段不要做这些事：

- 不替换已有 `ProductionCapability` 枚举。
- 不大规模迁移已有 Output Plan 数据。
- 不新建与现有 `assetDb.ts` / `assetLibrary.ts` / `DriveBrowser.tsx` 同名或同职责模块。
- 不做复杂 Banner 设计器。
- 不做 Banner 自由画布 / 拖拽图层。
- 不把 `brief_ready` 算进真实生产覆盖率。
- 不接对象存储 / EMC。
- 不让 Google Drive 成为主存储。
- 不碰 AGENTS.md 禁止修改的底层视频生成服务。

## 9. 主要风险和处理方式

| 风险 | 等级 | 处理方式 |
|---|---|---|
| 枚举迁移破坏已有数据 | 高 | 只做 UI readiness 映射，不替换落库 capability |
| 重复建设已有模块 | 高 | Run 0 先做代码审计，后续 Run 必须标明复用文件 |
| Coverage 指标虚高 | 中 | True coverage 不包含 `brief_ready` |
| Banner MVP 变成设计器 | 中 | Run 4 只做 prompt，不做预览；预览放 Run 4.5 |
| `default-team` 形成技术债 | 中 | 所有 team 逻辑通过 helper，保留迁移说明 |
| 文本产物变成泛泛 AI 文案 | 中 | 强制绑定 platform / angle / selling point / forbidden claims / citations |
| 服务器磁盘增长过快 | 中 | 单文件上限、team 容量软限制、容量展示、后续对象存储迁移 |
| Drive 文件变化影响生产链路 | 低 | 导入时复制到 GOBS，本地 assetId 成为主引用 |

## 10. OpenClaw Review 问题清单

请 OpenClaw 重点帮忙确认以下问题：

1. 现有 `ProductionCapability` 是否已经有历史数据依赖？如果有，V2 的 UI 映射方案是否足够安全？
2. `cta_set` 应该作为新的 `ProductionItemType`，还是作为 `ProducedOutputKind` / `post_copy` 内部字段？
3. `platform_post_pack` 是否应该只是 UI 分组，而不是落库类型？
4. 当前 `assetDb.ts` 中是否已经有 production 环境迁移风险？新增 `team_id / visibility / storage_provider / source_provider` 是否需要单独 migration guard？
5. `default-team` MVP 是否可接受？如果不可接受，最小 team model 应该是什么？
6. Banner Prompt MVP 不做预览是否足够支撑第一轮验证？
7. True Production Coverage 排除 `brief_ready` 是否合理？
8. Drive 导入是否只需要补“写入 Team Asset”这一段？现有 Drive Browser 是否可直接复用？

## 11. 下一步可执行动作

建议下一次开发从这个 run 开始：

```text
docs/workflow/runs/2026-05-11-campaign-production-coverage-code-audit/
```

Run 目标：

```text
完成 Campaign Output / Asset Library / Google Drive / Distribution Package 的现有能力审计，
形成兼容映射表和第一批开发白名单。
```

Run 完成后再正式进入：

```text
Run 1A - Coverage Map UI Compatibility Layer
Run 1B - Text Production Pack Prompt Strategy
```

这样可以避免一上来就改 enum、改 schema、改 Workbench，稳一点。不是保守，是别让系统在地基上玩极限运动。

