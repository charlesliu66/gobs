# SESSION-ANCHOR — <run-id>

> 每轮对话开始时 AI 必须先读这个文件，然后只读"允许读取"列表中的文件。

## 本轮目标（一句话）

[从 planner-spec.md 的 Goal 字段复制]

## 验收标准 ID

- AC-1: [描述]
- AC-2: [描述]
- AC-3: [描述]

## 本轮禁区（绝对不能改）

- [文件或目录]
- [文件或目录]

## 允许读取的文件（按需展开，其他不看）

```
docs/workflow/runs/<run-id>/planner-spec.md
h5-video-tool-api/src/routes/[相关路由].ts
h5-video-tool/src/[相关组件].tsx
```

## 当前进度

- [ ] AC-1: 未开始
- [ ] AC-2: 未开始
- [ ] AC-3: 未开始

---

> **使用说明**：
> 1. Planner 创建 run 文件夹后立即填写本文件
> 2. Builder 每轮开始时先读本文件，更新"当前进度"
> 3. Verifier 在验证前读本文件，确认 AC 覆盖完整
> 4. Integrator 在写 release-decision 前检查所有 AC 是否已勾选
