---
name: gobs-h5-smoke-test
description: Run GOBS/QAS H5 smoke checks for local, staging, or prod. Use when asked to do smoke testing, verify staging or prod after deploy, check H5 reachability, compare deployed commit versions, or prepare a short verifier summary for the Release Owner in this repository.
metadata:
  author: wei.liu
  version: "0.1.0"
---

# GOBS H5 Smoke Test

Use this skill for fast, repeatable H5 verification on GOBS/QAS.

This skill is for requests such as:

- "run smoke test"
- "verify staging"
- "verify prod"
- "do H5 smoke"
- "check the deployed commit"
- Chinese requests like "帮我做 smoke test", "帮我验一下 staging", "帮我快速检查线上 H5"

## What This Skill Does

This skill helps with:

- local smoke checks
- staging smoke checks
- prod smoke checks
- quick route/API reachability checks
- simple version and environment validation
- producing a concise smoke summary

## Multi-Window Smoke Boundary

- Dev Worker windows should use this skill for local smoke only unless the user explicitly assigns them as Release Owner.
- Staging/prod smoke belongs to the Release Owner window after deployment.
- Always compare `/api/system/version` against the expected SHA supplied by the release handoff or release guard.
- If staging/prod smoke finds a commit mismatch, treat it as release failure and do not mark release-ready or idle until the Release Owner resolves it.
- Smoke checks prove reachability and version alignment; they do not prove real GeeLark posting unless the guarded real-post verifier is explicitly run with operator confirmation.

## Required Context

Before running smoke checks, read:

- `AGENTS.md`
- `.claude/memory/feedback.md`
- `docs/TASK-INDEX.md`

When smoke scope is unclear, read:

- `references/smoke-matrix.md`
- `references/env-targets.md`
- `references/manual-checks.md`

## Environments

Supported environments:

- `local`
- `staging`
- `prod`

## Depth Levels

- `quick`: deterministic HTTP and version checks
- `full`: quick checks plus manual follow-up checklist

## Deterministic Script

Use the helper script for deterministic checks:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-h5-smoke-test/scripts/smoke_http.ps1 -Env staging -Depth quick
```

Common examples:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-h5-smoke-test/scripts/smoke_http.ps1 -Env local -Depth quick

powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-h5-smoke-test/scripts/smoke_http.ps1 -Env staging -Depth quick -ExpectedCommit 449820d

powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-h5-smoke-test/scripts/smoke_http.ps1 -Env prod -Depth full -RunId 2026-04-23-production-wizard-usability-trim
```

## Guardrails

- Do not claim full end-to-end verification from HTTP reachability alone.
- If `Depth=full`, append manual checks from `references/manual-checks.md`.
- If the expected commit does not match the deployed commit, surface that as a failure.
- Do not change deployment state from this skill; deployment-state changes belong to `$gobs-release-guard`.
- Prefer short, actionable smoke reports over long prose.

## Output Style

Return a short `Smoke Test Report`:

- environment
- base URL
- expected SHA and actual SHA
- version result
- key route/API checks
- warnings
- final result
- next action

If `Depth=full`, end with a compact manual follow-up checklist.
