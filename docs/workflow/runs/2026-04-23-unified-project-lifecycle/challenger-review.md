# Challenger Review - unified project lifecycle

> Run: `2026-04-23-unified-project-lifecycle`
> Gate 1.5 artifact

---

## Must-fix Review

### 1. 不能只靠前端挡住未命名项目

如果只改前端，未来其他入口或旧前端仍然可能继续创建未命名项目。后端首次创建项目时必须补最小保护。

### 2. 高级制片必须保留本地草稿续写能力

“不创建正式项目”不等于“不保存任何内容”。高级制片仍要允许本地草稿保留，否则会明显破坏易用性。

### 3. 批量治理必须保守删除

空项目识别宁可保守，也不能误删有价值内容。建议只删除“确实无有效内容”的未命名项目。

## Decision

GO

All must-fix items are absorbed into the implementation approach.
