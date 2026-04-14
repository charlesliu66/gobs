# 任务包模板

每份任务包必须包含以下部分：

---

## 标准格式

```markdown
# {方案名} — {Agent名} 任务包

> 分支：`feat/{方案名}-{agent}`
> 基于：`main` @ commit `{hash}`
> 并行分支：`feat/{方案名}-{另一个agent}`（由对方负责，不要动）

## 任务目标

{一句话概括}

## 改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/NewPage.tsx` | 新建 | {描述} |
| `src/components/Layout.tsx` | 修改 | {具体改什么} |

## 详细步骤

### Step 1: {步骤名}

{具体代码或伪代码}

### Step 2: {步骤名}

...

## 不要动的文件

以下文件由另一个 Agent 负责，**严禁修改**：

- `src/xxx.tsx` — 由 {另一个Agent} 在 `feat/xxx` 分支修改
- `src/yyy.ts` — 同上

## 验收标准

- [ ] `npm run build` 通过（0 error）
- [ ] {功能验证点 1}
- [ ] {功能验证点 2}

## 完成后

```bash
git add -A
git commit -m "{约定的 commit message}"
git push origin feat/{分支名}
```

然后通知用户"完成了"。
```
