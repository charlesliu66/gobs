# Planner Spec — 巨石文件拆分（批次 6 · 第一阶段）

> Run ID: `2026-04-16-monolith-split-batch6`  
> Gate: 1-5 (简化流程，类型提取)  
> 日期: 2026-04-16

## 本阶段目标

从 `riskSentimentService.ts` (1744行) 提取类型定义到独立文件，降低单文件认知负担。

## AC

| AC | 描述 | 状态 |
|---|---|---|
| AC-1 | 类型定义提取到 `riskSentimentTypes.ts` | ✅ |
| AC-2 | 主文件通过 `export type` 重导出，路由文件零改动 | ✅ |
| AC-3 | tsc --noEmit 零错误 | ✅ |

## 后续阶段（待排期）

| 阶段 | 内容 | 行数减少预估 |
|---|---|---|
| 第二阶段 | 提取 Apify 数据采集函数 → `riskSentimentFetch.ts` | ~400 行 |
| 第三阶段 | 提取 LLM 输出解析/归一化 → `riskSentimentParsing.ts` | ~500 行 |
| 目标 | 主文件 < 700 行 | |

*Gate 1-5: PASS (简化流程)*
