# GOBS 后续优化落地清单

> Date: 2026-05-10
> Audience: GOBS 开发/产品协作内部使用
> Purpose: 把下一阶段优化拆成可直接开 run 的执行项。此版本已吸收 OpenClaw review：Phase 0 严格压缩、诊断面板后移、数据关系提前、视频验证增加退出标准、剪辑特效后置。

## 0. 当前结论

GOBS 现在最大风险不是“流程没打通”，而是“产出不可控”：

- 故事类视频可以做，但还没有质量评估和可复盘样例库。
- 参考动作视频、角色展示视频还没有被验证为稳定好用。
- Banner / 静态广告素材是明确业务需求，但链路还没建。
- 用户看完第一版后，缺少结构化反馈和下一版生成能力。
- Campaign / Asset / Output / Review / Package 的 ID 关系必须从一开始用对，不能先用临时方案后迁移。

后续执行原则：

1. 先用最小标准定义“可用 / 需修 / 不可用”。
2. 先用 TypeScript 类型和 markdown 落地，不做 PPT 式方案。
3. Banner 和素材库先跑起来，诊断面板等真实评价数据出现后再做。
4. “下一版”本质是带历史上下文的重新生成任务，不新建复杂 revision 系统。
5. 参考动作和角色展示必须有继续 / 暂缓 / 放弃结论。
6. 剪辑特效后置，不抢“产出能不能用”的主线。

## 1. Run 列表

| Run | 优先级 | 名称 | 目标 | 建议周期 |
|---|---|---|---|---|
| Run 0 | P0 | Quality And Data Contract Foundation | 三档质量状态 + 5 实体关系 + 最小 fixture | 1-2 天 |
| Run 1 | P0 | Asset Library Reuse MVP | 团队素材分类、复用和预处理 MVP | 3-5 天 |
| Run 2 | P0 | Banner Output MVP | Banner 作为正式 Campaign 产物 | 4-7 天 |
| Run 3 | P1 | Story Video Review Capture | 故事类视频评价记录和样例库 | 2-4 天 |
| Run 4 | P1 | Quality Review And Next Version | 诊断面板 + 基于反馈生成下一版 | 5-8 天 |
| Run 5 | P1 | Motion Transfer Validation | 参考动作视频验证和退出结论 | 2-4 天 |
| Run 6 | P1 | Character Showcase Validation | 角色展示视频验证和退出结论 | 2-4 天 |
| Run 7 | P2 | Distribution Final Mile | 分发最后一公里体验收口 | 3-5 天 |
| Run 8 | P2 | Knowledge Traceability | 生成内容的知识来源可解释 | 3-5 天 |
| Run 9 | P2 | Data Contract Hardening | 把 Run 0 的 ID 关系落到主链路，减少断链 | 5-8 天 |
| Run 10 | P2 | Legacy Surface Reduction | 非核心历史模块隐藏/隔离/删除 | 2-5 天 |
| Run 11 | P3 | Large Component Refactor | 大组件按高频边界逐步拆分 | 6 月后 |
| Run 12 | P3 | Editor Effects Sprint | 剪辑外框、游戏转场、CTA 包装组件 | 独立 sprint |

第一批只开 Run 0-2。Run 3 可以在 Banner MVP 后开始。不要一开始就开诊断面板、视频验证和特效。

## 2. Run 0 - Quality And Data Contract Foundation

### 目标

用最小可执行方式定义后续所有功能的底座：

- 质量三档：可用 / 需修 / 不可用。
- 五个核心实体：Campaign -> Asset -> Output -> Review -> Package。
- 2-3 个 fixture 样例。

### 范围

只做 TypeScript 类型、静态规则、少量 fixture 和 markdown 文档。

### 建议文件

- `docs/plans/2026-05-10-creative-quality-and-data-contract.md`
- `h5-video-tool/src/campaign/quality/creativeQualityTypes.ts`
- `h5-video-tool/src/campaign/quality/creativeQualityRubric.ts`
- `h5-video-tool/src/campaign/quality/creativeQualityRubric.test.ts`
- `h5-video-tool/src/campaign/contracts/campaignOutputContracts.ts`
- `h5-video-tool/src/campaign/contracts/campaignOutputContracts.test.ts`

### 实现步骤

1. 定义素材类型：
   - `story_video`
   - `motion_transfer_video`
   - `character_showcase_video`
   - `banner`
   - `platform_copy`
2. 定义质量状态，只允许三档：
   - `usable`
   - `needs_fix`
   - `unusable`
3. 每档只写 2-3 条判定规则：
   - `usable`: 符合 Brief、核心卖点清楚、没有明显阻断问题。
   - `needs_fix`: 方向正确，但存在文案、节奏、构图或素材轻微问题。
   - `unusable`: 不符合 Brief、核心素材错误、卖点缺失或无法发布。
4. 定义五个实体的最小 contract：
   - `Campaign`
   - `Asset`
   - `Output`
   - `Review`
   - `Package`
5. 定义最小 ID 关系：
   - `Output.campaignId`
   - `Output.assetIds`
   - `Review.outputId`
   - `Review.parentOutputId?`
   - `Package.campaignId`
   - `Package.outputIds`
6. 写 2-3 个 fixture：
   - 一个可用 Banner。
   - 一个需修故事视频。
   - 一个不可用平台文案或 Banner。

### 验收标准

- TypeScript 类型可被前端其他模块 import。
- 质量状态只有三档，没有分数体系。
- 测试覆盖三档状态和五实体 ID 关系。
- markdown 文档能在 10 分钟内让新 run 理解标准。

### 不做

- 不做评分体系。
- 不做诊断面板。
- 不调用 LLM。
- 不接真实视频分析。
- 不做 UI。
- 不加入 `PublishBatch`、`Version` 等扩展实体。

## 3. Run 1 - Asset Library Reuse MVP

### 目标

让团队素材能被分类、复用和预处理，为 Banner、视频生成和后续质量评价提供稳定素材来源。

### 前置依赖

- Run 0 的 `Asset` contract。

### 建议文件

- `h5-video-tool/src/materials/*`
- `h5-video-tool/src/api/materials.ts`
- `h5-video-tool/src/campaign/contracts/*`
- `h5-video-tool-api/src/routes/assets.ts`
- `h5-video-tool-api/src/services/asset*`
- 相关 tests。

### 实现步骤

1. 定义团队素材基础分类：
   - 角色图。
   - 场景图。
   - UI 截图。
   - Logo。
   - 玩法截图。
   - 视频片段。
   - Banner 成品。
   - 其他参考图。
2. 素材预处理先做基础能力：
   - 文件类型。
   - 尺寸。
   - 比例。
   - 缩略图。
   - 时长（视频素材）。
3. 上传后允许人工修正分类。
4. Campaign Output Workbench 能引用素材库素材。
5. Banner Output MVP 可选择素材库中的主视觉。

### 验收标准

- 上传素材后能看到分类、尺寸、比例、缩略图。
- 用户可以手动改分类。
- Campaign / Banner 能引用素材 ID，不复制大文件。
- 测试覆盖分类 fallback 和预处理字段。

### 不做

- 不做复杂 AI 自动分类。
- 不做素材权限系统大改。
- 不做完整 DAM 系统。

## 4. Run 2 - Banner Output MVP

### 目标

把 Banner / 静态广告图作为 Campaign Output 的正式产物，先跑通“计划 -> 素材选择 -> 生成 prompt/占位结果 -> 人工标记 -> 导出/进入分发包”的 MVP。

### 前置依赖

- Run 0 的质量状态和五实体关系。
- Run 1 的素材库分类和素材 ID 引用。

### 建议文件

前端：

- `h5-video-tool/src/campaign/outputPlan.ts`
- `h5-video-tool/src/campaign/campaignOutputPlan.ts`
- `h5-video-tool/src/campaign/components/CampaignOutputWorkbench.tsx`
- `h5-video-tool/src/campaign/components/BannerOutputCard.tsx`
- `h5-video-tool/src/campaign/components/BannerOutputCard.test.tsx`
- `h5-video-tool/src/campaign/quality/*`
- `h5-video-tool/src/campaign/contracts/*`

后端：

- `h5-video-tool-api/src/routes/campaignOutputPlans.ts`
- `h5-video-tool-api/src/services/campaignOutputPlanStore.ts`
- 对应 tests。

### 实现步骤

1. 在 Output Plan 类型中新增 `banner` 产物类型。
2. 定义第一批 Banner 规格：
   - `square_1_1`
   - `portrait_4_5`
   - `story_9_16`
   - `landscape_16_9`
3. Campaign Brief 生成 Output Plan 时可以包含 Banner 需求。
4. Workbench 中展示 Banner 卡片：
   - 目标平台。
   - 尺寸。
   - 主视觉素材 ID。
   - 短文案。
   - CTA。
   - 缺失素材。
5. 第一版先支持生成 prompt + 占位结果。
6. Banner 结果只做三档人工标记：
   - 可用。
   - 需修。
   - 不可用。
7. Banner 可以进入 Package 的 assets/copy 上下文，先不要求真实平台发布。

### 验收标准

- 用真实 Campaign Brief 能生成 Banner 计划项。
- 用户能选择素材库图片作为 Banner 主视觉。
- 用户能看到尺寸、文案、CTA 和缺失素材。
- 用户能标记 Banner 为可用 / 需修 / 不可用。
- Banner 能进入待发布素材包上下文。
- 不影响现有视频/文案产物。

### 不做

- 不做完整设计编辑器。
- 不做复杂图层编辑。
- 不做诊断面板。
- 不一次性覆盖所有广告平台尺寸。
- 不绕过现有图片生成安全边界。

## 5. Run 3 - Story Video Review Capture

### 目标

先收集故事类视频的真实人工评价，为后续诊断面板和下一版生成提供数据。

### 前置依赖

- Run 0 的 `Review` contract。

### 建议文件

- `docs/plans/2026-05-10-story-video-quality-samples.md`
- `h5-video-tool/src/production/*`
- `h5-video-tool/src/studio/*`
- `h5-video-tool/src/campaign/quality/*`
- `h5-video-tool/src/campaign/contracts/*`
- 尽量不要碰 AGENTS.md 中禁止的后端底层服务文件。

### 实现步骤

1. 建立故事视频样例记录格式：
   - Campaign Brief。
   - 脚本。
   - 分镜。
   - 生成结果链接。
   - 三档人工评价。
   - 反馈标签。
   - 下一版建议。
2. 在结果页增加人工评价入口：
   - 可用。
   - 需修。
   - 不可用。
3. 支持问题标签：
   - 开头弱。
   - 节奏慢。
   - 卖点不清楚。
   - 结尾弱。
   - 角色不准确。
4. 将评价保存为 `Review`，并关联 `Output`。
5. 暂时只展示记录，不做自动诊断。

### 验收标准

- 至少能记录 3 条故事视频评价样例。
- 用户能从结果页标记质量状态和问题标签。
- 评价能保存并在 Campaign 侧看到。

### 不做

- 不直接重写 Storyboard 生成逻辑。
- 不动底层视频 provider 服务。
- 不做自动视频理解。
- 不生成下一版。

## 6. Run 4 - Quality Review And Next Version

### 目标

在有人工评价数据后，再做诊断面板和“生成下一版”。第一版重点支持 Banner 和文案，视频只生成下一版任务，不承诺局部重生成。

### 前置依赖

- Run 0 质量状态和五实体关系。
- Run 2 Banner 有人工标记。
- Run 3 故事视频有 Review 数据。

### 建议文件

- `h5-video-tool/src/campaign/components/CreativeQualityPanel.tsx`
- `h5-video-tool/src/campaign/components/CreativeQualityPanel.test.tsx`
- `h5-video-tool/src/campaign/components/CreativeFeedbackBar.tsx`
- `h5-video-tool/src/campaign/components/CreativeFeedbackBar.test.tsx`
- `h5-video-tool/src/campaign/feedback/creativeFeedbackTypes.ts`
- `h5-video-tool/src/campaign/feedback/creativeFeedbackActions.ts`
- `h5-video-tool/src/campaign/feedback/creativeFeedbackActions.test.ts`
- `h5-video-tool/src/campaign/contracts/*`
- 可能接入 Campaign Output Workbench / Studio Result Page。

### 实现步骤

1. 做质量诊断面板，但数据来源只用：
   - 人工标记。
   - 问题标签。
   - 静态规则。
2. 展示：
   - 当前三档状态。
   - 高频问题标签。
   - 下一步建议。
3. 定义反馈类型：
   - 卖点不突出。
   - 前 3 秒不吸引人。
   - 节奏太慢。
   - 角色不准确。
   - 动作不像参考。
   - 文案不够强。
   - 更适合 TikTok。
   - 更适合 Facebook。
4. “下一版”最小实现：
   - 新 Output 通过 `parentOutputId` 指向上一版。
   - 继承原 Brief。
   - 继承素材 ID。
   - 带上反馈标签和反馈备注。
   - 生成下一版 prompt 或下一版任务。
5. 先支持 Banner / 文案，再支持视频下一版任务。

### 验收标准

- 用户能看到质量面板，但不会被误导为“AI 已自动看懂视频”。
- 用户能点反馈按钮。
- 系统能生成下一版 prompt 或任务。
- 下一版 Output 有 `parentOutputId`。
- 下一版能追溯原始 Campaign、素材和上一版问题。

### 不做

- 不做全自动质量裁决。
- 不承诺所有视频都能局部重生成。
- 不新建复杂 revision 系统。
- 不把反馈只存在浏览器本地缓存里作为唯一来源。

## 7. Run 5 - Motion Transfer Validation

### 目标

验证参考动作视频是否真的适合当前业务场景，形成适用边界和明确结论。

### 执行方式

这是验证 run，不是功能扩张 run。优先产出验证记录和最小 UI 提示。

### 建议文件

- `docs/plans/2026-05-10-motion-transfer-validation.md`
- `h5-video-tool/src/studio/*`
- `h5-video-tool/src/campaign/quality/*`

### 实现步骤

1. 选 10 个动作参考样例。
2. 每个样例记录：
   - 参考动作类型。
   - 角色素材。
   - 生成结果。
   - 成功/失败原因。
   - 是否可用于广告。
3. 计算可用率：
   - 可用样例数 / 总样例数。
4. 写验证结论，只能三选一：
   - `continue`: 继续进入主流程。
   - `experimental`: 只保留实验入口。
   - `pause`: 暂缓投入。
5. 退出标准：
   - 10 个样例中少于 3 个可用，标记为 `experimental` 或 `pause`，不得进入默认主流程。
6. 在 Motion Transfer 入口增加输入提示或实验提示。

### 验收标准

- 验证报告有明确 `continue / experimental / pause` 结论。
- 明确至少 3 类适合动作或写明不足 3 类。
- 明确高风险动作类型。
- 如果可用率 < 30%，入口不能作为稳定能力呈现。

### 不做

- 不为了提高可用率临时包装结果。
- 不承诺 Motion Transfer 已稳定。
- 不大改底层视频生成服务。

## 8. Run 6 - Character Showcase Validation

### 目标

验证角色展示视频是否能稳定产出广告感素材，并形成继续 / 实验 / 暂缓结论。

### 建议文件

- `docs/plans/2026-05-10-character-showcase-validation.md`
- `h5-video-tool/src/studio/*`
- `h5-video-tool/src/campaign/quality/*`

### 实现步骤

1. 选 5 个角色。
2. 每个角色测试 2 个展示方向：
   - 角色亮相。
   - 技能或卖点展示。
3. 记录：
   - 角色是否跑偏。
   - 画面是否清楚。
   - 是否有广告感。
   - 适合进入视频还是 Banner。
4. 计算可用率。
5. 写验证结论，只能三选一：
   - `continue`
   - `experimental`
   - `pause`
6. 退出标准：
   - 10 个样例中少于 3 个可用，标记为 `experimental` 或 `pause`。
7. 根据结论调整 Character Showcase 入口和 prompt preset。

### 验收标准

- 验证报告有明确结论。
- 每个角色至少有结果记录。
- 如果可用率 < 30%，入口不能作为稳定能力呈现。
- 推荐模板和不推荐模板都有记录。

## 9. Run 7 - Distribution Final Mile

### 目标

素材质量可控后，让发布准备流程更顺。

### 建议文件

- `h5-video-tool/src/tabs/TabDistribute.tsx`
- `h5-video-tool/src/distribute/*`
- `h5-video-tool-api/src/routes/geelarkPublish.ts`
- 相关 tests。

### 实现步骤

1. 发布成功后跳到当前批次摘要。
2. 最近任务包 / 最近发布配置显著展示。
3. 账号组支持预览和编辑。
4. 刷新后恢复当前任务包和已选配置。
5. 发布失败文案改成“原因 + 下一步”。

### 验收标准

- 运营能完成“选素材 -> 选账号 -> 改文案 -> 发布 -> 看结果”。
- 刷新后不丢关键上下文。
- 发布失败能看到下一步建议。

## 10. Run 8 - Knowledge Traceability

### 目标

让用户知道系统生成内容时用了哪些游戏知识，避免黑箱。

### 建议文件

- `h5-video-tool/src/campaign/*`
- `h5-video-tool-api/src/routes/campaign*.ts`
- `h5-video-tool-api/src/services/*knowledge*`
- 注意不要动 AGENTS.md 禁止的 provider 服务文件。

### 实现步骤

1. Campaign Brief 中展示引用知识。
2. Output Plan 中标记哪些卖点来自知识库。
3. 用户可以标记：
   - 有用。
   - 不准确。
   - 不要再用。
4. 反馈进入后续生成上下文。

### 验收标准

- 用户能看到至少 3 条引用知识或“无引用”的明确提示。
- 用户反馈能被保存。
- 后续生成不会重复使用被明确否定的知识。

## 11. Run 9 - Data Contract Hardening

### 目标

把 Run 0 定义的五实体 ID 关系落到主链路，减少跨页面断链和刷新丢上下文。

### 建议文件

- `h5-video-tool/src/campaign/*`
- `h5-video-tool/src/distribution/*`
- `h5-video-tool/src/studio/*`
- `h5-video-tool-api/src/routes/campaignOutputPlans.ts`
- `h5-video-tool-api/src/routes/campaignDistributionPackages.ts`
- 相关 store/tests。

### 实现步骤

1. 审计当前 ID 传递：
   - Campaign -> Output Plan。
   - Output -> Studio。
   - Studio result -> Package。
   - Package -> Distribution。
2. 所有跳转都携带 Run 0 定义的最小必要 ID。
3. 刷新页面后优先从后端恢复。
4. 减少 localStorage 作为唯一状态来源。
5. 不做历史数据大迁移；只保证新数据走对关系。

### 验收标准

- 任一新发布记录能追溯到素材、Brief 和 Campaign。
- 任一新生成结果能追溯到 Output。
- 刷新或换设备不丢关键上下文。

### 不做

- 不重新设计完整数据库。
- 不一次性迁移所有历史数据。
- 不引入新的全局状态管理库。

## 12. Run 10 - Legacy Surface Reduction

### 目标

降低非主线历史模块对维护和认知的干扰。

### 建议文件

- `docs/plans/2026-05-09-legacy-surface-reduction-audit.md`
- `h5-video-tool/src/App.tsx`
- `h5-video-tool/src/sj-ui/`
- RiskSentiment / TiktokMatrix / Platform 相关页面。

### 实现步骤

1. `rg` 审计引用。
2. 先隐藏主导航入口，不直接删除。
3. 记录 direct URL 是否仍可访问。
4. 一轮 smoke 后再删除或归档。
5. 如果删除 `sj-ui`，必须单独 commit，便于回滚。

### 验收标准

- 主链路不受影响。
- 构建通过。
- 主导航更聚焦 Campaign / Studio / Distribution。

### 不做

- 不和业务功能 run 混在一起。
- 不在同一 commit 同时删大目录和改业务逻辑。

## 13. Run 11 - Large Component Refactor

### 目标

降低长期维护成本，但必须在业务验证稳定后做。

### 候选对象

- `ProductionWizard`
- `EditorWorkbench`
- `TabGenerate`
- `TabDistribute` 剩余父组件状态

### 执行原则

- 先补测试，再拆。
- 只拆高频改动区域。
- 每个 run 只拆一个明确边界。
- 不和产品新功能混在一起。

## 14. Run 12 - Editor Effects Sprint

### 目标

在素材质量和反馈闭环稳定后，再增强视频包装表现力。

### 候选能力

- 通用外框特效。
- 游戏产品专用转场。
- 角色登场包装。
- 战斗切入包装。
- CTA 片尾模板。

### 执行原则

- 作为独立 sprint 做。
- 不做真实 AE 工程兼容。
- 先做 5-8 个模板化效果。
- 每个效果必须同时验证预览和导出。

## 15. 推荐开工顺序

### 第一批：5/12-5/22

1. Run 0 Quality And Data Contract Foundation
2. Run 1 Asset Library Reuse MVP
3. Run 2 Banner Output MVP
4. Run 3 Story Video Review Capture

原因：先让素材有标准、有来源、有静态产物、有人工评价。

### 第二批：5/23-6/1

1. Run 4 Quality Review And Next Version
2. Run 5 Motion Transfer Validation
3. Run 6 Character Showcase Validation
4. Run 7 Distribution Final Mile

原因：有评价数据后再做诊断和下一版，同时验证另外两类视频是否值得继续投入。

### 第三批：6/2-6/12

1. Run 8 Knowledge Traceability
2. Run 9 Data Contract Hardening
3. Run 10 Legacy Surface Reduction

原因：真实演练后再加固知识解释、主链路 ID 关系和历史模块清理。

### 暂缓

- Run 11 Large Component Refactor
- Run 12 Editor Effects Sprint
- 引入新的全局状态管理库
- 大规模删除历史模块
- 新增更多视频模板入口

## 16. 每个 run 的通用要求

- 必须用 `gobs-multi-agent-dev-loop` 开 run。
- Run anchor 必须写清楚 editable files。
- 不碰 AGENTS.md 禁止的 provider 服务文件。
- 不在同一个 run 同时做“新功能 + 大清理”。
- 每个 run 至少有：
  - 1 个产品验收标准。
  - 1 个自动化测试或可重复手测脚本。
  - 1 条失败/边界场景。
- 面向线上发布的 run 必须更新 `PRODUCT.md` 和 `CHANGELOG.md`。
- 部署由 Release Owner 窗口执行，开发窗口只做代码和验证。

## 17. 当前第一步建议

下一轮直接开：

```text
2026-05-12-quality-and-data-contract-foundation
```

目标只做四件事：

```text
1. 三档质量状态：usable / needs_fix / unusable
2. 五实体关系：Campaign -> Asset -> Output -> Review -> Package
3. 2-3 个 fixture
4. markdown 文档 + TypeScript 类型 + 测试
```

不要在第一步接 LLM、做 UI、做诊断面板、做评分体系或引入更多实体。
