# Release Guard Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add script-enforced release guardrails so production deploys only promote a staging-verified GitHub commit, while automating the main prod deployment-state transitions.

**Architecture:** Keep the current `scripts/deploy_all.py` entrypoint, but move the new policy checks into testable helpers. Persist the staging verification result in a small remote JSON marker under `shared-data/.data/`, and let the prod deploy path validate that marker plus the live staging version before proceeding. Reuse the existing deployment-state mechanism for `preparing -> deploying -> verifying`.

**Tech Stack:** Python 3, `unittest`, `paramiko`, git CLI, existing QAS deploy scripts

---

### Task 1: Define release marker and guard helper tests

**Files:**
- Create: `scripts/tests/test_release_guard.py`
- Modify: `scripts/tests/test_set_deployment_state.py`

**Step 1: Write the failing tests**

- Add tests for the remote staging verification marker path.
- Add tests for a pure function that validates whether a prod promotion is allowed:
  - passes when local SHA, staging live SHA, and verified staging SHA all match
  - fails when staging live SHA mismatches
  - fails when verified staging SHA mismatches
- Add tests for a pure function that filters risky local git changes:
  - fails when changed files touch release-critical paths
  - ignores unrelated archive/temp paths

**Step 2: Run the test file to verify it fails**

Run: `python -m unittest scripts.tests.test_release_guard`

Expected: FAIL because the helper module/functions do not exist yet.

**Step 3: Write minimal helper implementation**

- Create `scripts/release_guard.py`
- Add:
  - release marker path helper
  - verified release payload builder
  - promotion eligibility validator
  - release-critical git path filter

**Step 4: Run tests to verify they pass**

Run: `python -m unittest scripts.tests.test_release_guard scripts.tests.test_set_deployment_state`

Expected: PASS

### Task 2: Add staging verification CLI

**Files:**
- Create: `scripts/mark_release_ready.py`
- Modify: `scripts/release_guard.py`
- Modify: `scripts/tests/test_release_guard.py`

**Step 1: Write the failing tests**

- Add tests for the verified release payload shape and timestamps.
- Add tests for target-specific remote marker path generation.

**Step 2: Run tests to verify they fail correctly**

Run: `python -m unittest scripts.tests.test_release_guard`

Expected: FAIL on missing payload/marker behavior.

**Step 3: Write minimal implementation**

- Add a CLI that:
  - loads staging deploy config
  - reads live staging version
  - writes `release-ready.json` to staging shared-data
  - records `verifiedBy`, `verifiedAt`, `commitSha`, `commitShort`

**Step 4: Run tests to verify they pass**

Run: `python -m unittest scripts.tests.test_release_guard`

Expected: PASS

### Task 3: Enforce release guardrails in `deploy_all.py`

**Files:**
- Create: `scripts/tests/test_deploy_all.py`
- Modify: `scripts/deploy_all.py`
- Modify: `scripts/release_guard.py`

**Step 1: Write the failing tests**

- Add tests for release guard checks:
  - release-critical dirty paths are rejected
  - `HEAD` not on `origin/main` is rejected
  - prod deployment rejects when staging has not been verified for the same SHA
  - prod deployment accepts when staging live/verified SHAs match local SHA
- Add tests for prod auto phase plan:
  - defaults to `preparing -> deploying -> verifying`
  - skips phase automation on staging

**Step 2: Run tests to verify they fail**

Run: `python -m unittest scripts.tests.test_deploy_all`

Expected: FAIL because the functions/options do not exist yet.

**Step 3: Write minimal implementation**

- Refactor `deploy_all.py` into testable helpers.
- Before deployment:
  - inspect git status for release-critical paths
  - fetch/check `origin/main`
  - on prod, compare local SHA with staging live version and verified marker
- For prod:
  - auto-write `preparing`
  - optionally wait
  - auto-write `deploying`
  - deploy
  - poll version endpoint and auto-write `verifying`

**Step 4: Run tests to verify they pass**

Run: `python -m unittest scripts.tests.test_deploy_all scripts.tests.test_release_guard`

Expected: PASS

### Task 4: Tighten runtime deployment verification

**Files:**
- Modify: `scripts/deploy_all.py`
- Modify: `scripts/deploy_api.py`
- Modify: `scripts/tests/test_deploy_all.py`

**Step 1: Write the failing tests**

- Add tests for version verification:
  - matching target environment + SHA passes
  - mismatched environment or SHA fails
- Add tests for PM2 status parsing:
  - `online` passes
  - missing process / non-online status fails

**Step 2: Run tests to verify they fail**

Run: `python -m unittest scripts.tests.test_deploy_all`

Expected: FAIL on missing stricter verification behavior.

**Step 3: Write minimal implementation**

- Make `deploy_all.py` treat version mismatch as hard failure.
- Add a small parser/helper in `deploy_api.py` so non-`online` PM2 status becomes a deploy failure.

**Step 4: Run tests to verify they pass**

Run: `python -m unittest scripts.tests.test_deploy_all scripts.tests.test_release_guard scripts.tests.test_deploy_config scripts.tests.test_server_layout scripts.tests.test_init_dual_env_server scripts.tests.test_set_deployment_state`

Expected: PASS

### Task 5: Update docs and product record

**Files:**
- Modify: `docs/guides/2026-04-23-single-owner-staging-prod-release-runbook.md`
- Modify: `docs/CODEX-CLI-PROJECT-GUIDE.md`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `PRODUCT.md`

**Step 1: Document the new operator flow**

- Add the new “mark staging verified” command.
- Document that `deploy_all.py --target prod` now performs release guard checks and phase automation.
- Clarify that `idle` still closes after final manual acceptance unless explicitly automated later.

**Step 2: Run verification**

Run:
- `python -m unittest scripts.tests.test_deploy_all scripts.tests.test_release_guard scripts.tests.test_deploy_config scripts.tests.test_server_layout scripts.tests.test_init_dual_env_server scripts.tests.test_set_deployment_state`
- `cd h5-video-tool-api && npx tsc --noEmit`
- `cd h5-video-tool && npm run build`

Expected: PASS

**Step 3: Commit**

```bash
git add scripts docs PRODUCT.md AGENTS.md CLAUDE.md
git commit -m "ops: automate release guardrails"
```
