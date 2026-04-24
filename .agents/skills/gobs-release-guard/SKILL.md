---
name: gobs-release-guard
description: Guard the GOBS/QAS release workflow. Use when asked to run release preflight, check whether a staging or prod release is allowed, prepare staging/prod deployment, validate release readiness, or do post-release wrap-up for this repository.
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
3. Check release artifacts and blockers.
4. Run deterministic build/typecheck commands when appropriate.
5. Print a concise `GO / NO-GO / GO WITH WARNINGS` summary.
6. Keep prod actions gated.

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
- Do not bypass prod gates silently.
- Do not treat warnings as success without saying so clearly.
- If the user explicitly asks for emergency bypass, require explicit approval to be present in the current release context.
- If the script says `NO-GO`, surface the blockers first.

## Output Style

Return a short release summary:

- mode
- run id
- branch / HEAD SHA
- main alignment
- dirty working tree status
- artifact status
- build status
- final decision
- next action

If the script blocks release, say what must be fixed before retrying.

