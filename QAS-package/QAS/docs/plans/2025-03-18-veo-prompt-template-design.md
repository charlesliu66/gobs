# VEO 适配 + 模板系统设计文档

**日期**: 2025-03-18  
**状态**: 已批准，实现中  
**目标**: promptPolish 适配 VEO API；按 templateId 区分单镜/多镜输出；Studio 模板选择优先

---

## 一、总体架构与目标

### 1.1 目标

1. 将 `promptPolish.ts` 的 prompt 规则从 Seedance/即梦 调整为适配 **VEO**
2. 按 `templateId` 区分输出形态：单镜 vs 多镜分镜
3. 所有模板有中文展示名，cg-trailer 展示为「英雄宣传」
4. 前端：Studio 内「先选模板 → 再进工作区」（方案 B）

### 1.2 核心决策

| 项目 | 决策 |
|------|------|
| 输出形态 | 混合：viral-dance 单镜；cg-trailer、short-drama 多镜分镜 |
| 模板命名 | id 不变，新增 nameZh 用于前端展示 |
| 入口流程 | 保持 Studio，第一步为模板选择卡片/列表，选定后进入工作区 |
| 时长 | viral-dance 改为 8 秒（VEO 支持 5–8s）；多镜由各镜头独立 |

### 1.3 涉及改动

- 后端：promptPolish.ts、prompt 路由、模板配置
- 前端：Studio/TabGenerate 布局与流程

---

## 二、模板定义与 promptPolish 改造

### 2.1 模板配置结构

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| name | string | 英文名 |
| nameZh | string | 中文展示名 |
| description | string | 简短说明 |
| duration | number | 默认时长（秒） |
| aspectRatio | string | 9:16 或 16:9 |
| pipelineMode | single \| multishot | 单镜/多镜流水线 |
| outputMode | single-shot \| multi-shot | 决定 polishedPrompt 形态 |
| systemPromptSuffix | string | 注入 LLM 的模板专属说明 |

### 2.2 初始模板

| id | nameZh | duration | aspectRatio | outputMode |
|----|--------|----------|-------------|------------|
| viral-dance | Viral 舞蹈 | 8 | 9:16 | single-shot |
| cg-trailer | 英雄宣传 | 60 | 16:9 | multi-shot |
| short-drama | 短剧 | 30 | 9:16 | multi-shot |

### 2.3 promptPolish 改造要点

- **VEO 通用规则**：Subject + Action 结构，单场景、具体描述，Cinematic/8K
- **single-shot**：输出 8 秒单场景英文 prompt
- **multi-shot**：输出多镜头分镜（时间码、景别、运镜），可拆分为独立 VEO 调用
- **templateId 注入**：拼接 systemPromptSuffix

---

## 三、前端 UX（方案 B）

Studio 内第一步为「模板选择」卡片/列表，选定后进入该模板的 prompt 工作区（输入、一键优化、素材、生成）。
