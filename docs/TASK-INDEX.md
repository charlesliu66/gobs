# GOBS 优化任务总览

> 给 Cursor 用的任务执行指南
> 按优先级排列，建议按顺序执行

## 执行顺序

| 优先级 | 任务 | 文件 | 预估工时 | 依赖 |
|--------|------|------|----------|------|
| P0 | 拆分 ProductionWizard | TASK-01 | 1-2 天 | 无 |
| P0 | 统一视频生成服务层 | TASK-02 | 1-2 天 | 建议在 TASK-01 之后 |
| P0 | 多用户数据隔离 | TASK-05 | 1 天 | 无（独立改动） |
| P1 | 剪辑器持久化 + 撤销 | TASK-03 | 1-2 天 | 无（独立模块） |
| P1 | 多镜头异步化 | TASK-04 | 1 天 | 建议在 TASK-02 之后 |
| P1 | 即梦登录态检测 | TASK-06 | 半天 | 无（独立改动） |

## 建议执行策略

**串行优先**（避免冲突）:
- TASK-01 → TASK-02 → TASK-04（前端重构链）
- TASK-05 和 TASK-06 可以任意时间插入，与其他任务无文件冲突

**可并行**:
- TASK-03（剪辑器）与 TASK-01/02（Studio）无交集
- TASK-05（数据隔离）主要改后端路由，与前端任务可并行
- TASK-06（登录态检测）改动量小，随时可做

## 通用规则

1. **每个任务完成后必须 `npm run build` 通过**
2. **不要动 .env 和部署配置**
3. **不要改后端底层服务**（dreaminaVideo.ts、klingVideo.ts、veoPython.ts、studioPipeline.ts）
4. **不要改 productionTypes.ts 和 productionAssets.ts**
5. **新文件用 TypeScript，遵循现有代码风格**
6. **import 路径用相对路径（前端）或 .js 后缀（后端 ESM）**

## 审查报告

详见 [REVIEW-视频生成与剪辑.md](./REVIEW-视频生成与剪辑.md)

## 文件结构

```
docs/
├── REVIEW-视频生成与剪辑.md        ← 架构审查（问题 + 建议）
├── TASK-01-拆分ProductionWizard.md  ← P0: 3994行巨石文件拆分
├── TASK-02-统一视频生成服务层.md    ← P0: 消除三处重复逻辑
├── TASK-03-剪辑器持久化与撤销.md    ← P1: 刷新不丢 + Ctrl+Z
├── TASK-04-多镜头异步化.md          ← P1: 同步阻塞→Job队列
├── TASK-05-多用户数据隔离.md        ← P0: 按 username 分目录
├── TASK-06-即梦登录态检测.md        ← P1: 防止"假完成"
└── TASK-INDEX.md                    ← 本文件（总览）
```
