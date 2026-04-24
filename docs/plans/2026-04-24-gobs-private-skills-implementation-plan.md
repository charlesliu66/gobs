# GOBS Private Skills Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create two repo-scoped private skills, `gobs-release-guard` and `gobs-h5-smoke-test`, with concise skill docs, references, deterministic PowerShell helper scripts, UI metadata, and basic validation.

**Architecture:** Implement this in small slices. First add design and plan docs, then create skill skeletons, then add scripts and reference files, then generate `agents/openai.yaml`, then validate by dry-running the scripts and checking the skill file structure. Keep phase 1 limited to deterministic checks and summaries; defer full Playwright automation.

**Tech Stack:** Markdown skill docs, YAML metadata, PowerShell scripts, Python helper utilities from `skill-creator`, and existing repo conventions from `AGENTS.md`.

---

### Task 1: Create the design and plan docs

**Files:**

- Create: `docs/plans/2026-04-24-gobs-private-skills-design.md`
- Create: `docs/plans/2026-04-24-gobs-private-skills-implementation-plan.md`

**Step 1: Write the design doc**

Include:

- goals
- why these two skills
- design principles
- each skill's purpose, triggers, inputs, outputs, blockers
- shared structure
- non-goals

**Step 2: Write the implementation plan**

Include:

- exact file paths
- validation steps
- phased rollout notes

**Step 3: Verify files exist**

Run:

```bash
Get-Item docs/plans/2026-04-24-gobs-private-skills-design.md
Get-Item docs/plans/2026-04-24-gobs-private-skills-implementation-plan.md
```

Expected: both files exist.

---

### Task 2: Create the gobs-release-guard skill skeleton

**Files:**

- Create: `.agents/skills/gobs-release-guard/SKILL.md`
- Create: `.agents/skills/gobs-release-guard/references/release-modes.md`
- Create: `.agents/skills/gobs-release-guard/references/no-go-checklist.md`
- Create: `.agents/skills/gobs-release-guard/references/release-artifacts-map.md`
- Create: `.agents/skills/gobs-release-guard/scripts/release_guard.ps1`

**Step 1: Write `SKILL.md`**

It must contain:

- valid frontmatter with `name` and `description`
- trigger phrases
- a simple decision flow by mode
- instruction to read the reference files only when needed
- instruction to run `release_guard.ps1` for deterministic checks

**Step 2: Write the references**

Each file should be short and task-specific:

- `release-modes.md` explains the 4 modes
- `no-go-checklist.md` lists blockers and warnings
- `release-artifacts-map.md` maps run artifacts to gates

**Step 3: Write the first script version**

`release_guard.ps1` should support:

- `-Mode`
- `-RunId`
- `-Target`
- `-ExpectedUpdatedBy`
- `-AllowDirtyScope`
- `-SkipBuild`

The script should:

- inspect git branch/sha
- inspect dirty files
- inspect run artifacts
- optionally run frontend/backend checks
- print a structured summary
- exit non-zero on hard blockers

**Step 4: Dry-run the script**

Run:

```bash
powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-release-guard/scripts/release_guard.ps1 -Mode preflight -RunId 2026-04-23-production-wizard-usability-trim -Target staging -SkipBuild
```

Expected: summary output, non-crashing behavior, sensible warnings or failures.

---

### Task 3: Create the gobs-h5-smoke-test skill skeleton

**Files:**

- Create: `.agents/skills/gobs-h5-smoke-test/SKILL.md`
- Create: `.agents/skills/gobs-h5-smoke-test/references/smoke-matrix.md`
- Create: `.agents/skills/gobs-h5-smoke-test/references/env-targets.md`
- Create: `.agents/skills/gobs-h5-smoke-test/references/manual-checks.md`
- Create: `.agents/skills/gobs-h5-smoke-test/scripts/smoke_http.ps1`

**Step 1: Write `SKILL.md`**

It must contain:

- valid frontmatter
- trigger phrases
- `local / staging / prod`
- `quick / full`
- instruction to use `smoke_http.ps1`
- instruction to append manual checks for full verification

**Step 2: Write references**

- `smoke-matrix.md` defines quick vs full checks
- `env-targets.md` defines URLs and version expectations
- `manual-checks.md` defines page-level human verification steps

**Step 3: Write the first script version**

`smoke_http.ps1` should support:

- `-Env`
- `-Depth`
- `-BaseUrl`
- `-ApiUrl`
- `-ExpectedCommit`
- `-RunId`

The script should:

- resolve environment URLs
- check frontend root
- check `/api/system/version`
- check a small set of key routes
- compare commit if provided
- print a structured smoke report
- exit non-zero on hard failures

**Step 4: Dry-run the script**

Run:

```bash
powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-h5-smoke-test/scripts/smoke_http.ps1 -Env staging -Depth quick
```

Expected: report output with pass/warn/fail.

---

### Task 4: Generate `agents/openai.yaml` for both skills

**Files:**

- Create: `.agents/skills/gobs-release-guard/agents/openai.yaml`
- Create: `.agents/skills/gobs-h5-smoke-test/agents/openai.yaml`

**Step 1: Generate metadata for `gobs-release-guard`**

Run:

```bash
python C:/Users/wei.liu/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py .agents/skills/gobs-release-guard --interface display_name="GOBS Release Guard" --interface short_description="Guard GOBS staging and prod release workflow" --interface default_prompt="Use $gobs-release-guard to run a safe GOBS release preflight or release check."
```

Expected: `agents/openai.yaml` created.

**Step 2: Generate metadata for `gobs-h5-smoke-test`**

Run:

```bash
python C:/Users/wei.liu/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py .agents/skills/gobs-h5-smoke-test --interface display_name="GOBS H5 Smoke Test" --interface short_description="Run GOBS H5 smoke checks for local, staging, or prod" --interface default_prompt="Use $gobs-h5-smoke-test to run a quick or full GOBS H5 smoke test."
```

Expected: `agents/openai.yaml` created.

**Step 3: Review the generated YAML**

Check that:

- strings are quoted
- display names are sensible
- descriptions fit UI limits
- default prompts mention `$skill-name`

---

### Task 5: Validate both skills

**Files:**

- Validate: `.agents/skills/gobs-release-guard`
- Validate: `.agents/skills/gobs-h5-smoke-test`

**Step 1: Run quick validation**

Run:

```bash
python C:/Users/wei.liu/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/gobs-release-guard
python C:/Users/wei.liu/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/gobs-h5-smoke-test
```

Expected: `Skill is valid!`

**Step 2: Review for trigger quality**

Check manually:

- descriptions are specific enough to trigger on real GOBS requests
- no unsafe wording suggests bypassing release gates
- scripts are referenced clearly

**Step 3: Record any known phase-1 gaps**

Examples:

- no Playwright yet
- manual checks still required for some pages
- prod deploy remains gated

---

### Task 6: Optional documentation sync

**Files:**

- Modify: `docs/plans/README.md` if needed
- Modify: `PRODUCT.md` only if the user wants the new private skills reflected now

**Step 1: Decide whether to surface the new skills in product docs**

Do not force this if the user only wants internal tooling.

**Step 2: If documenting, add a short internal tooling note**

Keep it short and scoped to internal developer workflow.

---

### Task 7: Final verification and commit

**Files:**

- All newly created skill files
- Design and implementation plan docs

**Step 1: Inspect final diff**

Run:

```bash
git diff -- .agents/skills/gobs-release-guard .agents/skills/gobs-h5-smoke-test docs/plans/2026-04-24-gobs-private-skills-design.md docs/plans/2026-04-24-gobs-private-skills-implementation-plan.md
```

Expected: only intended files in scope.

**Step 2: Stage and commit**

Run:

```bash
git add .agents/skills/gobs-release-guard .agents/skills/gobs-h5-smoke-test docs/plans/2026-04-24-gobs-private-skills-design.md docs/plans/2026-04-24-gobs-private-skills-implementation-plan.md
git commit -m "feat: add private skills for release guard and smoke test"
```

Expected: one clean commit.

**Step 3: Report remaining gaps**

Include:

- Playwright deep smoke deferred
- more run artifact automation can be added later
- prod deploy remains explicitly gated by design

