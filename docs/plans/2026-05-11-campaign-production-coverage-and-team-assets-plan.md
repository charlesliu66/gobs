# Campaign 素材生产覆盖率提升与 Team 共享素材库方案

> Date: 2026-05-11
> Audience: GOBS 内部开发 / 产品协作
> Status: 下一阶段优先级总纲
> Replaces: 下一阶段不再以“创意质量评估与迭代闭环”为第一目标，而是先提升 Campaign 素材生产覆盖率。

## 1. 核心判断

下一阶段目标从：

```text
创意质量评估与迭代闭环
```

调整为更前置的：

```text
Campaign 素材生产覆盖率提升
```

原因很直接：当用户 brief 一个 Campaign 后，如果系统拆出 12 个需制作素材，但 GOBS 只能推进 3 个，用户会觉得平台能力不足。即使这 3 个产物质量还可以，也会形成“不完整、不可靠”的感知。

所以当前优先级不是先把质量诊断做得很复杂，而是先让更多常见 Campaign 产物进入可执行状态：

- Caption set
- Headline set
- CTA set
- Hashtag set
- Platform post pack
- Campaign banner
- Thumbnail / cover
- Short video brief
- Character showcase brief
- Motion reference brief

质量评估仍然重要，但应该跟在“可生产覆盖率提升”之后：先能生产更多类型，再评价和优化这些产物。

## 2. 目标指标

下一阶段用一个简单指标衡量：

```text
Campaign Output Coverage Rate = 可推进产物数 / Campaign 需制作产物总数
```

目标：

- 短期：从当前约 25%-35% 提升到 60% 以上。
- 中期：一个 Campaign 拆出 12 个素材时，至少 8 个可以进入可执行状态。
- 长期：常见市场素材中，文本类和 Banner 类基本都可直接生产，视频类至少能生成制作 brief 或进入 Studio。

## 3. 产物能力分级

不要把所有产物都包装成“自动生成最终成品”。第一版必须明确能力边界。

```ts
type ProductionCapability =
  | 'auto_ready'
  | 'template_ready'
  | 'brief_ready'
  | 'needs_source_asset'
  | 'unsupported';
```

| 状态 | 含义 | 例子 |
|---|---|---|
| `auto_ready` | 可直接自动生成可编辑产物 | caption、headline、CTA、hashtag |
| `template_ready` | 可通过模板生成初版 | banner、thumbnail、cover |
| `brief_ready` | 可生成制作说明，但不承诺自动出最终素材 | short video、character showcase、motion reference |
| `needs_source_asset` | 缺少角色图、Logo、玩法截图等素材 | banner 主视觉、角色展示视频 |
| `unsupported` | 当前还不支持 | 复杂自由设计、复杂 AE 特效 |

用户在 Output Workbench 里应该看到：

```text
本 Campaign 需要 12 个素材
5 个可直接生成
3 个可模板化生成
2 个需要补素材
1 个可生成制作说明
1 个暂不支持
```

这样即使不是所有产物都能自动完成，用户也会知道下一步该做什么。

## 4. Team 共享素材库存储决策

为了支撑 Campaign 素材生产覆盖率，必须先让团队素材能复用。

当前存储决策：

```text
第一步：当前云服务器 + Team 共享权限 + 素材预处理 MVP
第二步：Banner / Campaign 开始引用 Team Assets
第三步：Google Drive 作为导入来源
第四步：对象存储 / EMC 暂缓，跑通后再做
```

### 4.1 当前阶段采用当前云服务器

先不接对象存储，直接在现有云服务器的 `shared-data` 下跑通 Team 共享素材库。

建议路径：

```text
<API_DATA_DIR>/team-assets/{teamId}/{assetId}/original
<API_DATA_DIR>/team-assets/{teamId}/{assetId}/thumbnail
<API_DATA_DIR>/team-assets/{teamId}/{assetId}/proxy
```

生产环境对应：

```text
/home/ubuntu/qas-h5/prod/shared-data/team-assets/{teamId}/{assetId}/original
```

### 4.2 数据库字段提前预留迁移口

即使现在不用对象存储，也要提前留字段，避免后面重构。

建议资产字段：

```ts
type AssetStorageProvider = 'local' | 'object_storage';
type AssetSourceProvider = 'upload' | 'google_drive' | 'generated' | 'imported';

type AssetVisibility = 'private' | 'team';

type TeamAsset = {
  assetId: string;
  ownerId: string;
  teamId: string;
  visibility: AssetVisibility;
  storageProvider: AssetStorageProvider;
  storageKey: string;
  sourceProvider: AssetSourceProvider;
  sourceExternalId?: string;
  sha256?: string;
};
```

第一版统一：

```text
storageProvider = local
```

后续对象存储迁移时只需要改：

```text
storageProvider = object_storage
storageKey = cos://bucket/path 或 s3://bucket/path
```

### 4.3 Google Drive 只做导入源

Google Drive 不作为 GOBS 主存储。正确定位是：

```text
Google Drive = 已有团队素材的导入来源
GOBS Team Library = 团队生产素材的工作库
当前云服务器 / 未来对象存储 = 文件本体存储
```

导入后，文件复制到 GOBS Team Library，后续 Campaign / Banner / Studio 都使用 GOBS 内部 `assetId`。

保存来源信息：

```text
sourceProvider = google_drive
sourceExternalId = driveFileId
sourceName = 原始文件名
```

不要让生产链路长期依赖 Google Drive 原文件。

## 5. 推荐 Run 拆解

### Run 1 - Campaign Output Coverage Map

#### 目标

建立 Campaign 产物类型注册表，让系统明确每类产物当前支持到什么程度。

#### 范围

只做类型、状态和 Workbench 展示，不做真实生成。

#### 建议文件

- `h5-video-tool/src/campaign/outputCoverage.ts`
- `h5-video-tool/src/campaign/outputCoverage.test.ts`
- `h5-video-tool/src/campaign/components/CampaignOutputCoverageSummary.tsx`
- `h5-video-tool/src/campaign/components/CampaignOutputCoverageSummary.test.tsx`
- `h5-video-tool/src/campaign/components/CampaignOutputWorkbench.tsx`

#### 实现步骤

1. 定义产物类型：
   - `caption_set`
   - `headline_set`
   - `cta_set`
   - `hashtag_set`
   - `platform_post_pack`
   - `campaign_banner`
   - `thumbnail_cover`
   - `short_video_brief`
   - `character_showcase_brief`
   - `motion_reference_brief`
2. 定义 `ProductionCapability`。
3. 给每类产物写 capability resolver。
4. Workbench 顶部展示 coverage summary。
5. 每个不可推进产物必须显示原因和下一步。

#### 验收标准

- Campaign Output Workbench 能展示总产物数和各状态数量。
- 每个产物都有 `auto_ready / template_ready / brief_ready / needs_source_asset / unsupported` 之一。
- `unsupported` 产物必须显示原因。

### Run 2 - Team Asset Library MVP

#### 目标

同一个 team 的人能看到同一批素材，并且 Campaign / Banner 后续可以引用这些素材。

#### 范围

当前服务器存储，不接对象存储，不做复杂 team 管理。

#### 建议文件

- `h5-video-tool-api/src/db/assetDb.ts`
- `h5-video-tool-api/src/routes/assetLibrary.ts`
- `h5-video-tool-api/src/routes/assets.ts`
- `h5-video-tool-api/src/services/assetReuseService.ts`
- `h5-video-tool-api/src/services/assetIngestService.ts`
- `h5-video-tool/src/pages/AssetLibraryPage/*`
- `h5-video-tool/src/materials/assetReuse.ts`
- 对应 tests。

#### 实现步骤

1. 增加或确认字段：
   - `team_id`
   - `visibility`
   - `storage_provider`
   - `storage_key`
   - `source_provider`
   - `source_external_id`
2. 第一版 team 处理：
   - 如果没有正式 team 系统，先使用 `default-team`。
   - 后端统一通过 helper 解析当前用户 team。
3. 上传素材时可选择：
   - My Asset
   - Team Asset
4. Asset Library 增加 tab：
   - My Assets
   - Team Assets
5. 后端查询规则：
   - private: 只有 owner 可见。
   - team: 同 team 成员可见。
6. 删除先软删除。

#### 验收标准

- 同 team 用户能看到 Team Assets。
- 不同 team 用户看不到彼此 Team Assets。
- My Assets 仍只自己可见。
- Campaign/Banner 可引用 team asset id。

### Run 3 - Asset Preprocessing MVP

#### 目标

让素材库从“文件列表”变成“可生产资产库”。

#### 建议文件

- `h5-video-tool-api/src/services/assetTaggingService.ts`
- `h5-video-tool-api/src/services/assetThumbnailService.ts`
- `h5-video-tool-api/src/services/assetReuseService.ts`
- `h5-video-tool-api/src/routes/assetLibrary.ts`
- `h5-video-tool/src/pages/AssetLibraryPage/*`
- 对应 tests。

#### 实现步骤

上传或导入后自动补：

- 文件类型。
- 文件大小。
- 图片宽高。
- 图片比例。
- 横竖屏。
- 视频时长。
- 缩略图。
- sha256 去重。
- 初始 team category。

#### 验收标准

- 素材详情页展示预处理信息。
- 可以按类型、比例、方向筛选。
- 重复上传同一文件时能提示或复用。
- Banner 能识别哪些素材适合作为主视觉。

### Run 4 - Text Production Pack

#### 目标

补齐最高频、最快落地的文本类 Campaign 产物。

#### 包含

- Caption Set
- Headline Set
- CTA Set
- Hashtag Set
- Platform Post Pack

#### 建议文件

- `h5-video-tool/src/campaign/textProduction/*`
- `h5-video-tool/src/campaign/outputPlan.ts`
- `h5-video-tool/src/campaign/campaignOutputPlan.ts`
- `h5-video-tool/src/campaign/components/CampaignOutputWorkbench.tsx`
- `h5-video-tool-api/src/routes/campaignOutputPlans.ts`
- `h5-video-tool-api/src/services/campaignOutputPlanStore.ts`
- 可复用现有 caption/prompt polish 服务，但不要强依赖视频素材。

#### 实现步骤

1. 定义文本产物结构：
   - platform
   - angle
   - tone
   - variants
   - status
2. 每个 Campaign 至少生成：
   - 3-5 条 caption。
   - 5-10 条 headline/hook。
   - 3-5 条 CTA。
   - 1 组 hashtag。
3. 支持平台：
   - TikTok
   - Facebook
   - Instagram
   - X
   - generic
4. 每条产物保留来源 Brief 和卖点。
5. 允许加入 Distribution Package。

#### 验收标准

- 一个 Campaign 可生成多组文本产物。
- 文本产物能编辑、保存、标记状态。
- 文本产物能进入 Distribution Center 作为候选文案。

### Run 5 - Campaign Banner MVP

#### 目标

补齐 Campaign Banner 生产能力，第一版不做复杂设计器。

#### 前置依赖

- Run 2 Team Assets。
- Run 3 Asset Preprocessing。

#### 建议文件

- `h5-video-tool/src/campaign/bannerProduction/*`
- `h5-video-tool/src/campaign/components/BannerOutputCard.tsx`
- `h5-video-tool/src/campaign/components/BannerOutputCard.test.tsx`
- `h5-video-tool/src/campaign/outputPlan.ts`
- `h5-video-tool/src/campaign/campaignOutputPlan.ts`
- `h5-video-tool-api/src/routes/campaignOutputPlans.ts`
- `h5-video-tool-api/src/services/campaignOutputPlanStore.ts`

#### 实现步骤

1. 支持 Banner 规格：
   - `square_1_1`
   - `portrait_4_5`
   - `story_9_16`
   - `landscape_16_9`
2. Banner 由以下字段组成：
   - 主视觉 team asset id。
   - 背景风格。
   - 主标题。
   - 副标题。
   - CTA。
   - Logo / 游戏名。
   - 平台尺寸。
3. 第一版支持两种产出：
   - Banner prompt。
   - 前端模板预览。
4. 支持状态标记：
   - usable
   - needs_fix
   - unusable
5. 支持加入 Package。

#### 验收标准

- Campaign 中能生成 Banner 计划项。
- 用户能选择 Team Asset 作为主视觉。
- 能生成 Banner prompt。
- 能预览至少 2 个模板方向。
- Banner 能进入 Distribution Package。

### Run 6 - Output To Distribution Bridge Upgrade

#### 目标

让新生成的文本和 Banner 真正进入分发流程。

#### 建议文件

- `h5-video-tool/src/distribution/*`
- `h5-video-tool/src/distribute/*`
- `h5-video-tool/src/tabs/TabDistribute.tsx`
- `h5-video-tool-api/src/routes/campaignDistributionPackages.ts`
- `h5-video-tool-api/src/routes/geelarkPublish.ts`
- 对应 tests。

#### 实现步骤

1. Caption / Headline / CTA / Hashtag 能进入 Package。
2. Banner 能作为 Package asset 出现。
3. Distribution Center 展示平台可用文案。
4. 用户可以选择某一版文案进入发布。
5. Banner 先进入素材包，不急着真实发布。

#### 验收标准

- Campaign 生成的 caption 能在 Distribution 中直接选用。
- Banner 能作为素材包资产出现。
- 一个 Campaign Package 不再只依赖视频素材。

### Run 7 - Google Drive Import To Team Library

#### 目标

Google Drive 作为导入来源，导入后文件复制到 GOBS Team Library。

#### 建议文件

- `h5-video-tool-api/src/services/googleDriveService.ts`
- `h5-video-tool-api/src/routes/drive.ts`
- `h5-video-tool-api/src/routes/assetLibrary.ts`
- `h5-video-tool/src/pages/AssetLibraryPage/*`
- 对应 tests。

#### 实现步骤

1. 支持浏览 My Drive 和 Shared Drive。
2. 选择 Drive 文件导入 Team Library。
3. 导入时复制文件到当前服务器 team-assets 目录。
4. 写入 asset metadata：
   - `sourceProvider = google_drive`
   - `sourceExternalId = driveFileId`
   - `sourceName`
   - `storageProvider = local`
5. 导入后走同一套预处理流程。

#### 验收标准

- 用户能从 Drive 选择文件导入 Team Assets。
- 导入后不依赖 Drive 原文件。
- 导入素材可被 Banner/Campaign 引用。

## 6. 调整后的执行顺序

### 第一批：提升覆盖率和素材底座

1. Run 1 Campaign Output Coverage Map
2. Run 2 Team Asset Library MVP
3. Run 3 Asset Preprocessing MVP

### 第二批：补齐高频产物

1. Run 4 Text Production Pack
2. Run 5 Campaign Banner MVP

### 第三批：接入分发和外部导入

1. Run 6 Output To Distribution Bridge Upgrade
2. Run 7 Google Drive Import To Team Library

### 暂缓

- 对象存储 / EMC 接入。
- 复杂 Banner 设计器。
- 参考动作视频深度优化。
- 角色展示视频深度优化。
- 剪辑特效。
- 大组件拆解。

这些不是不做，而是等“Campaign 素材生产覆盖率”达到可用水平后再做。

## 7. 风险点和处理方式

| 风险 | 影响 | 处理方式 |
|---|---|---|
| Banner 变成复杂设计器 | 工期失控 | 第一版只做模板预览和 prompt，不做自由画布 |
| 素材库权限串团队 | 严重数据问题 | 所有 asset 查询必须经过 owner/team helper |
| 当前服务器磁盘增长 | 影响部署和稳定性 | 限制上传大小，展示容量，后续再迁对象存储 |
| Google Drive 文件变化 | 生产素材失效 | 导入时复制到 GOBS，不直接依赖 Drive |
| 文案产物泛泛 | 用户觉得数量多但不可用 | 每条文案绑定 angle、tone、platform 和来源 Brief |
| Output Workbench 膨胀 | 页面复杂 | 增加 coverage summary 和按产物类型分组 |
| 分发包结构变复杂 | 影响发布 | 先让 Text/Banner 进入 Package，不急着真实发布 Banner |

## 8. 第一轮开工建议

建议下一轮直接开：

```text
2026-05-11-campaign-output-coverage-map
```

目标只做：

```text
定义 Campaign 产物类型注册表、ProductionCapability 状态、coverage summary。
```

不要在第一轮同时做 Banner、素材库、Google Drive 或质量诊断。

这一步完成后，再开 Team Asset Library MVP 和 Asset Preprocessing MVP，避免各模块对“产物状态”和“素材引用”的理解不一致。
