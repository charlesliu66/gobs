---
name: daily-review
description: 每日工作复盘。基于 git log、PRODUCT.md changelog、docs/daily-reports 和任务文档生成日报，总结产出、分析效率、提炼建议，并给出次日 TODO。
metadata:
  author: wei.liu
  version: "0.1.0"
---

# Daily Review

Use this skill when the user wants a daily review, a recap of today's or yesterday's work, a short work summary, or a suggested next-day plan.

Typical trigger phrases:

- `日报`
- `每日复盘`
- `复盘今天的工作`
- `复盘昨天做了什么`
- `今天做了什么`
- `昨天做了什么`
- `daily review`
- `yesterday summary`
- `/daily-review`

## What This Skill Does

This skill produces a compact but evidence-based daily report for the GOBS/QAS repository. It:

1. Collects the day's commits and version history.
2. Reviews newly added or updated docs and run artifacts.
3. Compares with the latest prior daily report when helpful.
4. Summarizes features, bug fixes, and architecture/dev-workflow work.
5. Identifies repeated issue patterns and root causes.
6. Recommends concrete next-day TODOs.
7. Writes a report into `docs/daily-reports/YYYY-MM-DD.md`.

## Required Context

Before generating the report, read:

- `AGENTS.md`
- `.claude/memory/feedback.md`
- `docs/TASK-INDEX.md`
- `PRODUCT.md`

When available, also read:

- the latest prior file in `docs/daily-reports/`
- any run docs or plans touched on the target date

## Data Collection

Collect, in parallel when practical:

1. `git log --oneline --since="<date> 00:00" --until="<next-date> 00:00"`
2. `PRODUCT.md` changelog entries for the target date
3. docs files touched that day, especially under:
   - `docs/plans/`
   - `docs/workflow/runs/`
   - `docs/daily-reports/`
4. `.claude/memory/feedback.md`
5. the latest previous daily report
6. `docs/TASK-INDEX.md`

## Analysis Rules

### 1. Work Classification

Classify the day's changelog/version work into:

- `新功能 / 体验优化`
- `Bug Fix / 修复`
- `架构 / Dev Workflow / 文档治理`

Treat `Bug Fix 占比` as a core signal. The goal is not zero bug fixes, but to reduce repeated reactive fixes over time.

### 2. Repetition Detection

Look for:

- the same module being modified multiple times in one day
- the same problem surfacing in slightly different symptoms
- a fix that required multiple follow-up patches

For each cluster, explain:

- what repeated
- likely root cause
- how to make the next fix more one-shot

### 3. Trend Comparison

If a previous daily report exists, compare:

- bug-fix ratio
- repeated-issue count
- verification rigor
- release discipline
- documentation completeness

If the prior report does not contain structured metrics, state that clearly and give only a qualitative comparison.

### 4. Memory Updates

Only update memory files if there is a genuinely reusable rule:

- `.claude/memory/feedback.md`
- `.claude/memory/project.md`
- `.claude/memory/MEMORY.md`
- `CLAUDE.md`

Do not force updates. If no durable rule emerged, leave memory untouched and say so.

### 5. PRODUCT Health Check

Check `PRODUCT.md` for:

- duplicate version headings
- malformed markdown
- last-updated marker drift
- changelog entries that do not match the day's actual work

You may report issues even if you do not fix them in the same pass.

## Output File

Write `docs/daily-reports/YYYY-MM-DD.md` with these sections:

```markdown
# 日报 · YYYY-MM-DD（周X）

> 协作模式：人 + AI Agent
> 统计口径：当日 git commit + PRODUCT.md changelog

## 一、今日产出概览

## 二、完成功能清单

## 三、经验教训

## 四、Changelog 效率分析

## 五、高效的方面

## 六、后续优化建议

## 七、协作效率评估

## 八、明日 TODO 建议
```

## Final User Response

After writing the report, return a short summary that includes:

- the report path
- commit/version counts
- a brief ratio summary
- whether memory files were updated
- top 3 suggested next actions

## Guardrails

- Do not invent data.
- Prefer precise counts over vague wording when counts are available.
- Keep the report concise; avoid turning it into a full changelog dump.
- If the day mixed shipped work and planning-only work, say that explicitly.
- If comparison data is weak, say so instead of pretending the trend is precise.
