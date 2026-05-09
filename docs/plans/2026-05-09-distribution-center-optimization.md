# Distribution Center Optimization Plan

> Date: 2026-05-09
> Owner: Charles
> Purpose: 理顺分发中心逻辑，让市场运营用得顺。聚焦可用性，不做定时发布/审批流/数据回流等未来功能。

## 一、背景与定位

分发中心 (`/distribute`) 是 GOBS 整个内容链条的**唯一出站通道**。上游所有内容（Studio 一键成片、Production Wizard 制片、Editor 剪辑、Campaign Creative 策略）最终都通过它到达社交平台。

当前问题：页面能跑但不好用，逻辑混杂，运营每次发布的心智负担重。

## 二、核心问题清单

### 问题 1：Campaign 上下文重复输入

**文件**: `h5-video-tool/src/pages/TabDistribute.tsx` L886-960

TabDistribute 页面有一整块 campaign 输入区（campaignObjective / targetAudience / cta / market / brandTone / sellingPoints / avoidTerms 七个字段），但 Campaign Creative 的 Distribution Package 已经打包了这些信息。从 Campaign 路径进来时用户要看到一堆已经填过的字段，从快速发布路径进来时这些字段又太重。

**解法**: 删除分发页面的 campaign 手动输入区。Package 路径自动继承上下文（只读展示），快速发布路径不再收集这些字段，文案生成时改为可选的简单"一句话描述"输入。

**改动范围**:
- `h5-video-tool/src/pages/TabDistribute.tsx`: 删除 campaignObjective/targetAudience/cta/market/brandTone/sellingPoints/avoidTerms 相关 state、JSX 和 onChange handler
- `h5-video-tool/src/components/distribution/packageToDistributeDraft.ts`: `formPrefill` 字段简化或移除，campaign 上下文直接传给文案生成 API 不再回填表单
- `h5-video-tool/src/i18n/messages.ts`: 清理对应的 locale key（`distribute.campaignObjective` 等）
- 快速发布路径新增一个可选的 `captionHint` 输入框（一行，placeholder 例如"输入关键词辅助文案生成"），替代之前的七字段表单

### 问题 2：两条入口路径混在一起

从 Campaign Creative 带着 Package 进来 vs 直接进 `/distribute` 选视频发，两条路径的 UI 交互混在同一个 1600 行的组件里，状态管理交叉。

**解法**: 将 TabDistribute 拆成清晰的分步流程组件，两条路径共享步骤组件但入口逻辑分离。

**目标页面结构**:

```
┌──────────────────────────────────────────────┐
│ 分发中心                                       │
├──────────────────────────────────────────────┤
│ [Pending Packages 横幅]（有 package 时显示）    │
│  点击加载 → 自动预填素材+文案+上下文            │
├──────────────────────────────────────────────┤
│ Step 1: 选择素材                               │
│  - Package 路径：展示预填素材（可换）            │
│  - 快速路径：素材选择器（当前/本地/服务端）      │
├──────────────────────────────────────────────┤
│ Step 2: 文案                                   │
│  - Package 路径：展示预填文案（可微调）          │
│  - 快速路径：生成按钮 + 可选 captionHint        │
│  - 通用：按平台显示文案卡片                     │
├──────────────────────────────────────────────┤
│ Step 3: 选择账号                               │
│  - 账号组快速加载（新功能）                     │
│  - 平台/区域筛选                               │
│  - 勾选确认                                    │
├──────────────────────────────────────────────┤
│ Step 4: 预览确认 & 发布                        │
│  - Preflight checklist                         │
│  - 一键发布                                    │
│  - 发布状态追踪                                │
├──────────────────────────────────────────────┤
│ 发布历史（折叠/展开）                           │
└──────────────────────────────────────────────┘
```

**改动范围**:
- `h5-video-tool/src/pages/TabDistribute.tsx`: 主组件瘦身为流程编排器，按步骤拆出子组件
- 新建 `h5-video-tool/src/components/distribute/DistributeStepAsset.tsx`: 素材选择步骤
- 新建 `h5-video-tool/src/components/distribute/DistributeStepCopy.tsx`: 文案步骤
- 新建 `h5-video-tool/src/components/distribute/DistributeStepAccounts.tsx`: 账号选择步骤
- 新建 `h5-video-tool/src/components/distribute/DistributeStepPublish.tsx`: 预览确认 & 发布步骤
- 已有 `DistributeAssetPicker.tsx` / `DistributePreflightChecklist.tsx` / `DistributePublishHistory.tsx` / `PendingDistributionPackages.tsx` 继续使用，按需适配 props

**拆分规则**:
- 每个 Step 组件是纯展示 + callback 模式，状态仍由 TabDistribute 统一管理
- 不是硬分页（不需要"下一步"按钮强制线性），而是单页面内四个视觉区块，有清晰的标题和分隔
- Package 路径和快速路径在每个 Step 内部用条件渲染区分，不在外层搞两套页面

### 问题 3：账号选择每次从零开始

运营每次发布都要手动勾选同一组账号，没有预设组。当前 `geelark-accounts.json` 的 `remark` 字段里已有 `group:xxx` 标记（如 `group:web TH`、`group:ID`），但前端完全没用这个信息。

**解法**: 利用已有的 `group:` 标记实现账号组快速选择，同时支持用户自定义账号组。

**实现方案（前端 localStorage，不加后端表）**:

```typescript
// 账号组来源 1: 从 geelark-accounts.json 的 remark 中解析 group:xxx
// 账号组来源 2: 用户在分发页面自定义保存的组（存 localStorage）

interface AccountGroup {
  id: string;             // 如 'group:web TH' 或 'custom:my-indo-set'
  name: string;           // 显示名
  accountIds: string[];   // 账号 ID 列表
  source: 'config' | 'custom';
}
```

**UI 交互**:
- 账号选择区顶部新增"快速选择"横条，显示可用的账号组 chip
- 点击 chip → 一键勾选该组所有账号（如果已选则取消）
- 底部"保存当前选择为组"按钮 → 弹出命名框 → 存入 localStorage
- 自定义组支持删除

**改动范围**:
- 新建 `h5-video-tool/src/components/distribute/AccountGroupPicker.tsx`: 账号组选择 UI
- 新建 `h5-video-tool/src/utils/accountGroups.ts`: 解析 config group + localStorage CRUD
- `h5-video-tool/src/pages/TabDistribute.tsx`: 接入 AccountGroupPicker
- `h5-video-tool-api/src/routes/geelark.ts`: GET `/api/geelark/accounts` response 已包含 remark 字段，无需后端改动

### 问题 4：文案和平台的绑定关系模糊

当前文案生成后，用 `platformDrafts` map 按平台 key 存储，但 UI 上是通过 tab 切换查看不同平台文案，不够直观。用户容易搞不清当前编辑的文案会发到哪些账号。

**解法**: 文案区域改为按平台横向排列卡片，每张卡片明确显示"这份文案 → 发到这些账号"的对应关系。

**改动范围**:
- `h5-video-tool/src/components/distribute/DistributeStepCopy.tsx`（新建）: 按平台显示文案卡片，每张卡片底部列出该平台被勾选的账号数量
- 保留 `platformDrafts` 数据结构不变，只改展示层

### 问题 5：发布历史太弱

当前历史只有最近 20 条 GeeLark 任务列表，无筛选，无导出，刷新后 latest batch 丢失。

**解法**: 增强发布历史面板。

**改动范围**:
- `h5-video-tool/src/components/distribute/DistributePublishHistory.tsx`: 增加按平台/状态的快速筛选 chip，增加日期分组显示
- `h5-video-tool-api/src/routes/geelark.ts`: GET `/api/geelark/tasks` 增加 `platform` / `status` query 参数（如果 GeeLark API 支持），否则前端过滤
- 不做 CSV 导出，不做分页（20 条够用）

### 问题 6：Package 状态展示太粗

Pending Packages 面板只展示 assetState 和 reviewStatus 两个标签，运营看不出这个包该怎么处理。

**解法**: 增强 Package 卡片信息密度。

**改动范围**:
- `h5-video-tool/src/components/distribution/PendingDistributionPackages.tsx`:
  - 显示 variant 角度和 hook 文案预览
  - 显示目标平台和市场
  - `needs_asset` 状态时用醒目的黄色提示 + 快速跳转按钮
  - `publishable` 状态时显示绿色"可发布"标记

## 三、不做的事

明确排除，避免范围膨胀：

- ❌ 定时发布 / 调度器
- ❌ 审批流 / 多人协作
- ❌ 数据回流 / 发布效果追踪
- ❌ 多平台直发（非 GeeLark 通道）
- ❌ A/B 测试
- ❌ 发布日历
- ❌ 后端新增数据库表（账号组用 localStorage）
- ❌ 发布模板 / 预设保存

## 四、实施顺序

按依赖关系排序，每步可独立交付验证：

### Step 1: 删除 campaign 重复输入（最小改动，立即见效）
1. 删除 TabDistribute 中七个 campaign 字段的 state 和 UI
2. Package 路径：campaign 上下文以只读摘要展示在文案区上方
3. 快速路径：新增一个可选的 `captionHint` 单行输入
4. 更新 locale keys

### Step 2: 拆分页面为分步组件
1. 从 TabDistribute 中提取四个 Step 子组件
2. TabDistribute 变为流程编排器（管状态、传 props）
3. 保持单页面滚动布局，四个区块有视觉分隔
4. 两条路径（Package / 快速）在每个 Step 内条件渲染

### Step 3: 账号组快速选择
1. 实现 `accountGroups.ts` 工具函数（解析 config group + localStorage CRUD）
2. 实现 `AccountGroupPicker.tsx` 组件
3. 接入 DistributeStepAccounts

### Step 4: 文案-平台卡片化 & Package 面板增强
1. DistributeStepCopy 按平台卡片横排展示
2. PendingDistributionPackages 增加信息密度

### Step 5: 发布历史增强
1. 历史面板增加筛选 chip 和日期分组

## 五、验证标准

每个 Step 交付后需满足：

- `npx tsc --noEmit` 前后端均通过
- `npm run build` 前后端均通过
- 现有 tests 不回归（`npm test` 通过）
- 两条发布路径均可走通：
  - Campaign Creative → Distribution Package → /distribute → 预填素材+文案 → 选账号 → 发布
  - 直接进 /distribute → 选素材 → 生成/写文案 → 选账号 → 发布

## 六、关键文件索引

| 文件 | 角色 |
|------|------|
| `h5-video-tool/src/pages/TabDistribute.tsx` | 分发主页面（1600 行，本次重构重点） |
| `h5-video-tool/src/components/distribute/DistributeAssetPicker.tsx` | 素材选择器（已有） |
| `h5-video-tool/src/components/distribute/DistributePreflightChecklist.tsx` | 发布前检查清单（已有） |
| `h5-video-tool/src/components/distribute/DistributePublishHistory.tsx` | 发布历史（已有） |
| `h5-video-tool/src/components/distribute/distributeSupport.ts` | 分发工具函数（已有） |
| `h5-video-tool/src/components/distribution/PendingDistributionPackages.tsx` | Package 待处理面板（已有） |
| `h5-video-tool/src/components/distribution/packageToDistributeDraft.ts` | Package → 分发草稿转换（已有） |
| `h5-video-tool/src/api/geelark.ts` | GeeLark 前端 API client（已有） |
| `h5-video-tool/src/api/campaignDistribution.ts` | Distribution Package 前端 API client（已有） |
| `h5-video-tool-api/src/routes/geelark.ts` | GeeLark 后端路由（已有） |
| `h5-video-tool-api/src/services/geelark.ts` | GeeLark 后端服务（已有） |
| `h5-video-tool-api/src/routes/campaignDistribution.ts` | Distribution Package 后端路由（已有） |
| `h5-video-tool-api/src/services/campaignDistributionPackage.ts` | Distribution Package 后端服务（已有） |
| `config/geelark-accounts.json` | GeeLark 账号配置（已有 group: 标记） |
| `h5-video-tool/src/i18n/messages.ts` | 国际化文案（中英文） |

## 七、约束

- 所有新组件遵循现有设计系统（CSS variable token、rounded-xl/2xl/3xl、Tailwind utility class 风格）
- 保持中英文双语 locale key
- 不引入新依赖
- 不改动 GeeLark 后端核心发布逻辑（`publishVideo` / `getTaskDetail` / `getTaskHistory`）
- 不改动 Distribution Package 后端数据结构
- 账号组存 localStorage，key 命名: `gobs:distribute:account-groups`
