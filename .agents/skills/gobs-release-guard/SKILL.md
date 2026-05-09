---
name: gobs-release-guard
description: Guard the GOBS/QAS release workflow as the single Release Owner window. Use when asked to run release preflight, check whether staging or prod release is allowed, deploy staging/prod, validate release readiness, keep local/GitHub/cloud in sync, or do post-release wrap-up for this repository.
metadata:
  author: wei.liu
  version: "0.1.0"
---

# GOBS Release Guard

Use this skill for repo-specific release control on GOBS/QAS.

This skill is for requests such as:

- "help me do release preflight"
- "check whether this can go to staging"
- "check whether this can go to prod"
- "run release guard"
- "finish release wrap-up"
- Chinese requests like "帮我发版前检查", "帮我检查能不能发 staging", "帮我检查能不能发 prod"

## What This Skill Does

This skill turns the repo's release SOP into a repeatable workflow:

1. Read the project rules before acting.
2. Inspect the current git and run state.
3. Pull/fetch the development commits that Dev Worker windows have pushed.
4. Check release artifacts, blockers, and dirty working tree status.
5. Run deterministic build/typecheck commands when appropriate.
6. Serialize staging deploy, staging smoke, release-ready marking, prod promotion, prod smoke, and idle restore.
7. Print a concise `GO / NO-GO / GO WITH WARNINGS` summary.
8. Keep prod actions gated.

## Multi-Window Release Ownership

Default role for this skill: **Release Owner**.

- Exactly one active window should own staging/prod deployment at a time.
- Dev Worker windows may commit and push code, but should not deploy. This window consumes their pushed branch/SHA and performs the release sequence.
- Before any deploy, fetch `origin`, verify HEAD/target SHA is on `origin/main`, and require a clean release-blocking working tree.
- If Dev Worker windows are still pushing, pause deployment until the intended release SHA is explicit.
- Do not make product feature edits in the Release Owner window unless fixing release tooling or an approved release blocker; any such fix must be committed and pushed before deployment.
- Keep deployment state authoritative: `preparing -> deploying -> verifying -> idle` for prod.
- If another window changes `main`, deployment scripts, release-ready metadata, or deployment state during release, stop and re-evaluate the release target SHA before continuing.

## Required Context

Before making a release decision, read:

- `AGENTS.md`
- `.claude/memory/feedback.md`
- `docs/TASK-INDEX.md`

When release mode details are needed, read:

- `references/release-modes.md`
- `references/no-go-checklist.md`
- `references/release-artifacts-map.md`

## Modes

Supported modes:

- `preflight`
- `staging-release`
- `prod-release`
- `post-release`

If the user did not specify a mode, infer the closest one from the request and say which mode you chose.

## Deterministic Script

Use the helper script for deterministic checks:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-release-guard/scripts/release_guard.ps1 -Mode preflight
```

Common examples:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-release-guard/scripts/release_guard.ps1 -Mode preflight -RunId 2026-04-23-production-wizard-usability-trim -Target staging

powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-release-guard/scripts/release_guard.ps1 -Mode staging-release -RunId 2026-04-23-production-wizard-usability-trim -Target staging

powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-release-guard/scripts/release_guard.ps1 -Mode prod-release -RunId 2026-04-23-production-wizard-usability-trim -Target prod -ExpectedUpdatedBy wei.liu
```

## Guardrails

- Do not treat this skill as permission to skip release policy.
- Do not deploy uncommitted local code.
- Do not deploy a SHA that is not pushed to `origin/main`.
- Do not bypass prod gates silently.
- Do not treat warnings as success without saying so clearly.
- If the user explicitly asks for emergency bypass, require explicit approval to be present in the current release context.
- If the user explicitly approves skipping staging, state that this is an emergency/direct-prod path and still run prod smoke plus idle restore.
- If the script says `NO-GO`, surface the blockers first.

## Output Style

Return a short release summary:

- mode
- run id
- branch / HEAD SHA
- main alignment
- dirty working tree status
- release owner status
- artifact status
- build status
- final decision
- next action

If the script blocks release, say what must be fixed before retrying.
