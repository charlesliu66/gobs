# Run Template

每次 run 至少包含：

- planner-spec.md
- challenger-review.md
- builder-report.md
- verifier-report.md
- release-decision.md
# Run Template

Create a new folder per feature:

- `docs/workflow/runs/YYYY-MM-DD-<feature-name>/`

Inside it, create:

1. `planner-spec.md`
2. `challenger-review.md`
3. `builder-report.md`
4. `verifier-report.md`
5. `release-decision.md`

Optional:

- `defect-list.md`
- `test-evidence/`

Use contracts under `docs/workflow/contracts/` to keep outputs structured.

## SESSION-ANCHOR（必备，新增）

每个 run 目录还需要包含：

- `SESSION-ANCHOR.md` — 从 `SESSION-ANCHOR-template.md` 复制并填写

此文件是 AI 每轮开始时的第一个读取目标，用于防止目标漂移和无关文件占据 context。
