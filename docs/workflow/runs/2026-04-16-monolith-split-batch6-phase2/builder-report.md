# Builder Report — 巨石文件拆分 Phase 2（LLM 解析函数提取）

## 变更概要

从 `riskSentimentService.ts`（1744 行）中提取 LLM 解析/归一化/快照补全函数到新文件 `riskSentimentParsing.ts`。

**跳过 Apify 数据采集函数**（按用户要求保留在主文件中）。

## 文件变更

| 文件 | 变更 |
|---|---|
| `services/riskSentimentParsing.ts` | **新建** 747 行，包含 28 个解析/归一化函数 |
| `services/riskSentimentService.ts` | 1744 → 1051 行（减少 693 行），添加 import |

## 提取的函数清单

- `parseJsonRelaxed`, `extractJsonObject` — JSON 容错解析
- `normalizePct3`, `deriveOverviewScoreFromPcts` — 数值归一化
- `parseKeywordMatrix`, `fallbackKeywordMatrix`, `buildKeywordMatrixFromBatch` — 关键词矩阵
- `parseListeningAlerts`, `buildListeningAlertsFromOverview` — 监听告警
- `parseRecentTrends` — 趋势解析
- `normalizeCreators`, `fallbackCreatorsFromVideos` — 达人归一化
- `parseStrategyBlockFromRaw`, `parseStrategyVariantFromRaw`, `parseExecutionProgram` — 策略解析
- `inferRecommendControlFromConclusion`, `inferExecutionNature` — 推断辅助
- `sanitizeCommentTaskLang`, `mapTaskRowsToCommentTasks`, `buildFallbackCommentTasksFromVideos` — 评论任务
- `cloneCommentTasksForProfile`, `blockFromVariant`, `defaultStrategyProfilesFromBlock` — 策略组装
- `enrichStrategyVariant`, `mergeActionsFromStrategy`, `enrichStrategyPlanFields` — 策略增强
- `patchCommentTasksLegacy` — 旧数据兼容
- `rehydrateSnapshot` — 快照补全（最大的组装函数）

## 验证

- `npx tsc --noEmit` 通过，零错误
- 纯重构，无功能变化，无需端到端测试
