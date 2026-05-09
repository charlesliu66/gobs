---
name: gobs-multi-agent-dev-loop
description: Run GOBS/QAS development tasks through the repo's guarded 4+1 multi-agent workflow with run bootstrap, SESSION-ANCHOR scope control, Planner/Challenger/Builder/Verifier handoff, and a development-only handoff by default. Use when starting a scoped implementation run, when a task touches multiple files or subsystems, when multiple Codex windows are developing in parallel, or when requests mention 多 Agent、自循环开发、4+1、run 初始化、scope guard、planner/challenger/builder/verifier.
---

# GOBS Multi-Agent Dev Loop

Use this skill for repo-specific, lower-touch development on GOBS/QAS.

Invoke it explicitly with `$gobs-multi-agent-dev-loop` when you want the guarded workflow to take over.

If the client supports repo-local plugin slash entries, the same workflow may also be exposed through `/gobs-loop`.

This skill is for requests such as:

- "用这套流程跑这个需求"
- "帮我开一个 run 并按 4+1 推进"
- "多 Agent 自循环开发"
- "use the guarded workflow for this task"
- "bootstrap a new run and keep me out of the loop"

## Required Context

Read these files before acting:

- `AGENTS.md`
- `.claude/memory/feedback.md`
- `docs/TASK-INDEX.md`

If continuing an existing run, also read:

- `docs/workflow/runs/<run-id>/SESSION-ANCHOR.md`
- `docs/workflow/runs/<run-id>/planner-spec.md`

If workflow details are unclear, read:

- `docs/workflow/README.md`
- `docs/workflow/contracts/SessionAnchor.md`
- `docs/workflow/prompts/orchestrator.md`
- `references/invocation.md`
- `references/workflow-map.md`

## What This Skill Does

1. Decide whether to reuse an existing run or initialize a new one.
2. Define editable scope and escalation boundaries in `SESSION-ANCHOR.md`.
3. Keep Planner -> Challenger -> Builder -> Verifier gates explicit.
4. Run deterministic workflow guard checks before build and verify.
5. Commit and push verified development work, then hand off to the release-owner window instead of deploying by default.

## Multi-Window Role Boundary

Default role for this skill: **Dev Worker**.

- Dev Worker windows may implement, test, update docs, commit, and push.
- Dev Worker windows must not run `scripts/deploy_all.py`, `scripts/deploy_api.py`, `scripts/deploy_frontend.py`, `scripts/mark_release_ready.py`, or `scripts/set_deployment_state.py` unless the user explicitly assigns this same window as the release owner.
- Dev Worker windows should stop after a clean push with a handoff summary: branch/SHA, run id, verification commands, risk notes, and whether staging/prod is recommended.
- Release Owner work belongs to `$gobs-release-guard`; only that window should serialize staging, smoke, release-ready marking, prod promotion, prod smoke, and idle restore.
- If another window pushes while this window is working, fetch first and reconcile with the newest `origin/main`; never overwrite or force-push.
- Prefer a task branch named `codex/<run-id>` for parallel feature work. If the user requires direct `main` commits, fetch/rebase before push and keep commits small so the release owner can inspect them.

## Deterministic Commands

Bootstrap a run:

```bash
python scripts/init_workflow_run.py \
  --slug <feature-name> \
  --goal "<one sentence goal>"
```

Run workflow guard:

```bash
python scripts/workflow_guard.py --run-id <run-id> --stage build
python scripts/workflow_guard.py --run-id <run-id> --stage verify
```

Run mechanical verification:

```bash
bash scripts/eval.sh <run-id>
```

## Operating Rules

- Finalize `SESSION-ANCHOR.md` before Builder starts.
- Let Builder edit only `Editable Files (Builder Ownership)`.
- Treat `WARN` as "continue carefully but do not stage unrelated files."
- Treat `FAIL` as a hard stop until blockers are fixed.
- If `eval.sh` cannot run because `npm`, `npx`, or project dependencies are missing, record a verifier `NO-GO`; do not claim build success.
- Do not perform staging/prod readiness checks from a Dev Worker window. Instead, hand off to the Release Owner window with the pushed SHA and verification evidence.
- Use `.agents/skills/gobs-release-guard/SKILL.md` and `.agents/skills/gobs-h5-smoke-test/SKILL.md` only when this window has explicitly become the Release Owner.
- Keep all references repo-relative so this skill still works after `git clone` or `git pull` on another computer.

## Escalate Only For

- forbidden-file changes
- new env vars
- product behavior tradeoffs
- staging/prod deployment request while acting as Dev Worker
- prod release approval

## Output Style

Return a compact progress update with:

- run id
- current gate
- blockers or warnings
- pushed branch/SHA when development is complete
- release-owner handoff notes
- next command or next artifact to update
