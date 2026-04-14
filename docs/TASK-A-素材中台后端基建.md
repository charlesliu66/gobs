# TASK-A：资产中台后端基建

## 目标
提供可用的"导入-解析-打标-检索"后端能力，支持前端快速接入。

## 新增模块
- `routes/assetLibrary.ts`
- `services/assetIngestService.ts`
- `services/assetTaggingService.ts`
- `services/assetSearchService.ts`
- `services/assetHighlightService.ts`（视频高光候选，先占位）
- `types/assetLibrary.ts`

## API（第一版）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/asset-library/import` | 创建导入任务 |
| GET | `/api/asset-library/import/:jobId` | 任务状态 |
| GET | `/api/asset-library/assets` | 分页+筛选 |
| PATCH | `/api/asset-library/assets/:id/tags` | 编辑标签 |
| POST | `/api/asset-library/assets/batch-tags` | 批量打标 |
| GET | `/api/asset-library/search` | 关键词+筛选 |
| GET | `/api/asset-library/facets` | 标签维度统计 |

## 验收标准
- [ ] 能导入 200+ 文件并稳定完成
- [ ] 任务状态可轮询、可恢复
- [ ] 标签可批量编辑
- [ ] 按角色/场景/用途检索可用
