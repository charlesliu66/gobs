# 任务包 01: 拆分 ProductionWizard.tsx

## 任务目标
把 3994 行的 ProductionWizard.tsx 拆分为可维护的模块结构。

## 范围
- ✅ 做: 拆分为 Step 级组件 + 共享 Context
- ✅ 做: 保持所有现有功能不变
- ❌ 不做: 不改后端 API，不改功能逻辑，不改样式
- ❌ 不做: 不动 productionTypes.ts 和 productionAssets.ts（这两个文件结构合理）

## 模块拆分

```
h5-video-tool/src/
├── studio/
│   ├── ProductionContext.tsx      ← 新建: 所有状态 + 操作方法
│   ├── ProductionWizardShell.tsx  ← 新建: 步骤导航 + 顶栏 + 整体布局
│   ├── steps/
│   │   ├── StepInput.tsx          ← Step 0: 角色圣经 + 故事梗概输入
│   │   ├── StepStoryArc.tsx       ← Step 1: 剧本大纲展示/编辑
│   │   ├── StepDesign.tsx         ← Step 2: 角色/场景/道具 tab 面板
│   │   ├── StepStoryboard.tsx     ← Step 3: 分镜表 + 图片/视频生成
│   │   └── StepExport.tsx         ← Step 4: 导出与下载
│   └── components/
│       ├── CharacterPanel.tsx     ← 角色卡片列表 + 形象树入口
│       ├── ScenePanel.tsx         ← 场景卡片列表
│       ├── PropPanel.tsx          ← 道具卡片列表
│       ├── ShotRow.tsx            ← 单个分镜行（含视频生成按钮）
│       ├── ProjectSelector.tsx    ← 项目切换/新建/另存
│       └── ChecklistPanel.tsx     ← L2 完备性检查
└── pages/
    └── ProductionWizard.tsx       ← 改为只 import ProductionContext + Shell
```

## 验收标准
1. ProductionWizard.tsx 缩减到 < 50 行（仅做 Provider 包裹 + Shell 渲染）
2. 每个 Step 组件 < 500 行
3. ProductionContext.tsx 用 useReducer 管理状态，< 400 行
4. 所有现有功能正常工作（创建项目、生成大纲、角色/场景管理、分镜生成、视频生成、导出）
5. localStorage 持久化行为不变
6. `npm run build` 无报错

## 风险点
- ProductionWizard 里有大量 useEffect 互相依赖，拆分时需要注意依赖关系
- 状态通过 localStorage 双向同步（存+读），拆 Context 时必须保留这个行为
- 分镜表有很多行内编辑状态（展开/收起、正在生成），需要在 Context 中统一管理
- CharacterLookTreeCanvas 和 CharacterPortraitEditorModal 已经是独立组件，不需要再拆

## 给 Cursor 的 Prompt

```
我需要你把 h5-video-tool/src/pages/ProductionWizard.tsx（3994行）拆分成模块化结构。

核心原则：
1. 功能不变，只做结构重组
2. 用 React Context + useReducer 管理所有共享状态
3. 每个 Step 是独立组件，通过 Context 获取状态和操作

拆分计划：
- 新建 src/studio/ProductionContext.tsx — 把所有 useState/useEffect 搬进来，用 useReducer 管理
- 新建 src/studio/ProductionWizardShell.tsx — 步骤导航 + 布局
- 新建 src/studio/steps/StepInput.tsx — Step 0
- 新建 src/studio/steps/StepStoryArc.tsx — Step 1
- 新建 src/studio/steps/StepDesign.tsx — Step 2（含角色/场景/道具 tab）
- 新建 src/studio/steps/StepStoryboard.tsx — Step 3
- 新建 src/studio/steps/StepExport.tsx — Step 4
- 新建 src/studio/components/ — 角色面板、场景面板、道具面板、分镜行等可复用 UI

注意事项：
- localStorage 的存取逻辑必须保留（PRODUCTION_STORAGE_KEY）
- 原来 import 的 CharacterLookTreeCanvas、CharacterPortraitEditorModal 等已有组件，直接引用不要重写
- 原来引用的 API 函数（postStoryArc, postProductionDesign 等）保持引用不变
- productionTypes.ts 和 productionAssets.ts 不需要改动
- 分镜 Step 中的视频生成轮询逻辑（submitDreaminaAsync + getDreaminaTaskStatus）要完整保留
- 完成后确保 npm run build 通过
```
