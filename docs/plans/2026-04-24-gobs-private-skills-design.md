# GOBS Private Skills Design

**Date:** 2026-04-24

**Scope:** Create two repo-scoped private skills for GOBS/QAS:

- `gobs-release-guard`
- `gobs-h5-smoke-test`

---

## Goal

Turn the team's existing release SOP and H5 verification habits into reusable repo-local skills so future work is:

- harder to ship incorrectly
- easier to verify quickly
- less dependent on chat history and tribal knowledge

These skills should reduce repeated mistakes without becoming a second product to maintain.

---

## Why These Two Skills

GOBS currently has a real release workflow and a real H5 verification workflow, but both still depend too much on:

- remembering AGENTS rules from memory
- manually re-reading the same docs
- remembering which build/deploy commands to run
- remembering what must block a prod release
- remembering which H5 pages and APIs must be checked after staging/prod deploy

The highest-value move is not another generic coding skill. It is codifying GOBS-specific operating discipline.

---

## Design Principles

### 1. Repo-scoped, not user-scoped

The skills live under `.agents/skills/` inside this repository so:

- the whole team can use them
- behavior can evolve with the repo
- changes are reviewable in git

### 2. Automate aggressively, gate dangerous actions

We want a lazy-friendly workflow, but not an unsafe workflow.

The skills should automate:

- context loading
- preflight checks
- build checks
- status summaries
- smoke verification summaries

The skills should not silently force through dangerous production actions.

### 3. Prefer scripts for deterministic checks

Repeated shell logic should live in small PowerShell helper scripts under each skill's `scripts/` directory so the skill is:

- easier to reuse
- less token-heavy
- more deterministic than retyping command sequences

### 4. Keep the skill body lean

`SKILL.md` should contain:

- when to trigger
- required workflow
- how to choose modes
- what scripts/references to use

Longer policy and checklists should move to `references/`.

---

## Skill 1: gobs-release-guard

### Purpose

Provide a controlled release workflow assistant for:

- preflight checks
- staging release preparation
- prod release preparation
- post-release wrap-up

### Trigger examples

- "帮我做这次发版前检查"
- "帮我检查这次能不能发 staging"
- "帮我走 release guard"
- "帮我检查能不能发 prod"
- "帮我做发布收尾"

### Core behaviors

The skill should:

1. Load core project rules before acting:
   - `AGENTS.md`
   - `.claude/memory/feedback.md`
   - `docs/TASK-INDEX.md`
2. Determine the active run and check release artifacts.
3. Inspect git state:
   - current branch
   - HEAD SHA
   - relation to `origin/main`
   - working tree dirtiness
4. Check required docs and release evidence.
5. Run build and typecheck commands.
6. Produce a structured `GO / NO-GO / GO WITH WARNINGS` summary.
7. Only allow prod flow when staging flow prerequisites are satisfied.

### Modes

- `preflight`
- `staging-release`
- `prod-release`
- `post-release`

### Hard blockers

Examples of conditions that should result in `NO-GO`:

- missing active run planner artifacts
- missing release-decision evidence when required
- frontend build failure
- backend typecheck or build failure
- commit not pushed to `origin/main` when release requires pushed source
- attempting prod before staging verification
- attempting prod without release-ready marker
- emergency bypass requested without explicit approval
- clearly unrelated dirty files not covered by an allowed scope

### Warning-only conditions

Examples of conditions that should warn but not always block:

- `CHANGELOG.md` split not fully adopted yet
- low-risk doc drift
- known i18n follow-up items
- historical run formatting inconsistency

### Outputs

The skill should output a short `Release Guard Summary` containing:

- mode
- target
- run id
- branch and HEAD SHA
- `origin/main` relation
- artifact completeness
- build results
- final decision
- next recommended action

---

## Skill 2: gobs-h5-smoke-test

### Purpose

Provide a fast, repeatable H5 smoke-testing workflow for:

- local verification
- staging verification
- prod verification

### Trigger examples

- "帮我做 smoke test"
- "帮我验一下 staging"
- "帮我做 H5 冒烟"
- "帮我快速检查线上 H5"
- "帮我做发布后回归"

### Core behaviors

The skill should:

1. Support target environments:
   - `local`
   - `staging`
   - `prod`
2. Support depth levels:
   - `quick`
   - `full`
3. Automatically verify:
   - version endpoint
   - frontend reachability
   - key route reachability
   - environment identification
4. Produce a short smoke report suitable for pasting into verifier docs.
5. Add manual follow-up prompts for flows that still require human verification.

### Phase-1 automation scope

Phase 1 will automate:

- HTTP checks
- version checks
- route checks
- summary generation

Phase 1 will not automate:

- full browser-playwright end-to-end flow
- generated media creation
- authenticated user interaction beyond simple reachability

### Outputs

The skill should output a `Smoke Test Report` containing:

- environment
- base URL
- expected commit, if provided
- version result
- key route/API status table
- manual follow-up checklist
- final result: `PASS / PASS WITH WARNINGS / FAIL`

### Fail conditions

Examples:

- `/api/system/version` unreachable
- frontend root unreachable
- critical route returns 404/5xx
- wrong environment marker
- expected commit does not match deployed commit

### Warning conditions

Examples:

- non-critical page degraded
- response slow but reachable
- no run id provided for report insertion
- manual checks still pending

---

## Shared File Structure

Each skill should follow this structure:

```txt
.agents/skills/<skill-name>/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── ...
└── scripts/
    └── ...
```

Planned skill folders:

```txt
.agents/skills/gobs-release-guard/
.agents/skills/gobs-h5-smoke-test/
```

---

## Reference Files

### gobs-release-guard references

- `release-modes.md`
- `no-go-checklist.md`
- `release-artifacts-map.md`

### gobs-h5-smoke-test references

- `smoke-matrix.md`
- `env-targets.md`
- `manual-checks.md`

These files should keep the skill body small while preserving project-specific operating knowledge.

---

## Script Responsibilities

### release_guard.ps1

The first version should support:

- argument parsing for mode/target/run id
- git state checks
- artifact existence checks
- build command execution
- summary printing
- exit code signaling for pass/warn/fail

It should not directly deploy prod without an explicit mode and a clean prerequisite chain.

### smoke_http.ps1

The first version should support:

- environment/base-url resolution
- `/api/system/version` checks
- key route reachability checks
- optional expected commit comparison
- human-readable summary output

It should remain idempotent and safe to run repeatedly.

---

## Relationship to Existing Project Rules

These skills must reinforce, not replace:

- `AGENTS.md`
- `.claude/memory/feedback.md`
- staging -> mark_release_ready -> prod -> idle workflow
- required `PRODUCT.md` updates
- workflow run artifacts

The skills are execution accelerators, not policy exceptions.

---

## Non-Goals

- Rebuilding the entire deployment system
- Full browser automation in phase 1
- Creating a generic release framework for all repos
- Encoding fragile project logic inside giant scripts
- Bypassing release gates because the skill exists

---

## Validation Plan

The initial validation should use realistic prompts:

- "帮我做这次发版前检查"
- "帮我发 staging"
- "帮我做 staging quick smoke"
- "帮我做 prod full smoke"

Success means:

- the skill triggers on the right requests
- the skill reads the right docs
- the scripts produce stable summaries
- dangerous conditions are blocked clearly
- the output is concise and actionable

---

## Recommended Next Step

Create an implementation plan that:

1. writes the two skills
2. adds minimal deterministic scripts
3. generates `agents/openai.yaml`
4. validates both skills
5. leaves room for a later phase that adds Playwright-backed deep smoke automation

