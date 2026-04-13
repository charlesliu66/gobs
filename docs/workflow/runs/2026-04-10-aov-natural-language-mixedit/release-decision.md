# Release Decision - AOV 自然语言混剪适配

状态：`go (Gate 5)`

- GO / NO-GO: **GO（开发环境）**
- Blockers: 无 P0/P1 阻塞项
- Accepted Risks:
  - 仅 AOV 深适配，暂不泛化全 MOBA
  - 事件识别准确率尚无完整量化基准报告（P2）
- Release Boundary:
  - 本次交付覆盖后端能力与接口（ruleset/plan/rollback/benchmark）；
  - 前端仅新增 API 封装，尚未提供完整 AOV 专属操作台页面。
- Next Actions:
  1) 接入 AOV 真实标注集并输出准确率报告；
  2) 在编辑器 UI 增加 AOV 模板切换与 trace 可视化；
  3) 补并发发布规则与回滚的冲突保护（锁/队列）。
