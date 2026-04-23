# Staging / Production Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first-stage same-host staging/prod deployment foundation for QAS, including target-aware deploy scripts, runtime environment visibility, and deployment notice banners for prod users.

**Architecture:** Keep the existing single-server Nginx + PM2 + SFTP model, but split deployment targets by environment and add a thin runtime deployment-state layer. Public users only read deployment state through `/api/system/*`, while admins write it through `/api/admin/*`. Frontend layout polls this state and shows a global banner without touching core video-generation services.

**Tech Stack:** Node.js + TypeScript + Express, React + Vite, Python + Paramiko, `node:test`, `python -m unittest`

---

### Task 1: Backend Deployment-State Domain

**Files:**
- Create: `h5-video-tool-api/src/services/deploymentState.ts`
- Create: `h5-video-tool-api/tests/deploymentState.test.ts`

**Step 1: Write the failing test**

Add tests that prove:

- missing deployment-state file returns a safe default state
- invalid or partial JSON is normalized to safe defaults
- updates preserve `updatedAt` and `updatedBy`
- runtime environment falls back to `unknown` when unset

**Step 2: Run test to verify it fails**

Run:

```bash
cd h5-video-tool-api
node --test --import tsx tests/deploymentState.test.ts
```

Expected:

- FAIL because `deploymentState.ts` does not exist yet

**Step 3: Write minimal implementation**

Implement:

- deployment-state type definitions
- default state resolver
- file read/write helpers based on `<API_DATA_DIR>/.data/deployment-state.json`
- environment-name resolver
- input normalization helper

**Step 4: Run test to verify it passes**

Run:

```bash
cd h5-video-tool-api
node --test --import tsx tests/deploymentState.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add h5-video-tool-api/src/services/deploymentState.ts h5-video-tool-api/tests/deploymentState.test.ts
git commit -m "feat: add deployment state domain service"
```

### Task 2: Backend Read/Write Routes

**Files:**
- Modify: `h5-video-tool-api/src/routes/system.ts`
- Modify: `h5-video-tool-api/src/routes/adminUsage.ts`
- Modify: `h5-video-tool-api/src/index.ts`
- Test: `h5-video-tool-api/tests/deploymentState.test.ts`

**Step 1: Write the failing test**

Extend backend tests to prove:

- public system payload includes `environment`
- public deployment-state response does not require admin-only fields
- admin update input is normalized correctly for `preparing`, `deploying`, `verifying`, and `idle`

**Step 2: Run test to verify it fails**

Run:

```bash
cd h5-video-tool-api
node --test --import tsx tests/deploymentState.test.ts
```

Expected:

- FAIL because route-facing helpers or payload shaping do not exist yet

**Step 3: Write minimal implementation**

Implement:

- `GET /api/system/version` append `environment`
- `GET /api/system/deployment-state`
- `GET /api/admin/deployment-state`
- `PUT /api/admin/deployment-state`

Constraints:

- admin write path must check `req.user?.username`
- do not move system routes out of their current auth model unless necessary
- keep payload backward-compatible for existing `/api/system/version` callers

**Step 4: Run test to verify it passes**

Run:

```bash
cd h5-video-tool-api
node --test --import tsx tests/deploymentState.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add h5-video-tool-api/src/routes/system.ts h5-video-tool-api/src/routes/adminUsage.ts h5-video-tool-api/src/index.ts h5-video-tool-api/tests/deploymentState.test.ts
git commit -m "feat: expose deployment state system endpoints"
```

### Task 3: Frontend Deployment Banner Domain

**Files:**
- Create: `h5-video-tool/src/utils/deploymentBanner.ts`
- Create: `h5-video-tool/tests/deploymentBanner.test.ts`

**Step 1: Write the failing test**

Add tests that prove:

- `idle` state hides the banner
- `preparing` and `deploying` map to different banner tones
- missing custom copy falls back to locale-aware default copy
- `deploying` maps to write-lock intent

**Step 2: Run test to verify it fails**

Run:

```bash
cd h5-video-tool
node --test --import tsx tests/deploymentBanner.test.ts
```

Expected:

- FAIL because `deploymentBanner.ts` does not exist yet

**Step 3: Write minimal implementation**

Implement:

- banner presentation type
- locale-aware fallback copy
- mapping from backend deployment-state payload to UI-ready banner props

**Step 4: Run test to verify it passes**

Run:

```bash
cd h5-video-tool
node --test --import tsx tests/deploymentBanner.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add h5-video-tool/src/utils/deploymentBanner.ts h5-video-tool/tests/deploymentBanner.test.ts
git commit -m "feat: add deployment banner presentation helper"
```

### Task 4: Frontend Layout Integration

**Files:**
- Modify: `h5-video-tool/src/components/Layout.tsx`
- Test: `h5-video-tool/tests/deploymentBanner.test.ts`

**Step 1: Write the failing test**

Extend frontend tests to prove:

- prod/staging runtime label formatting includes environment when present
- deployment banner resolver output is safe for direct rendering in layout

**Step 2: Run test to verify it fails**

Run:

```bash
cd h5-video-tool
node --test --import tsx tests/deploymentBanner.test.ts
```

Expected:

- FAIL because layout-facing formatting helper does not exist yet

**Step 3: Write minimal implementation**

Implement in layout:

- fetch runtime version with environment
- poll deployment-state on a timer
- render top-of-page banner outside editor-critical routing assumptions
- append environment tag to runtime footer label

Keep scope minimal:

- no business-page write blocking in this task
- no new global state library

**Step 4: Run test to verify it passes**

Run:

```bash
cd h5-video-tool
node --test --import tsx tests/deploymentBanner.test.ts
```

Expected:

- PASS

Then run:

```bash
cd h5-video-tool
npm run build
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add h5-video-tool/src/components/Layout.tsx h5-video-tool/tests/deploymentBanner.test.ts
git commit -m "feat: show deployment banner in layout"
```

### Task 5: Target-Aware Deploy Scripts

**Files:**
- Create: `scripts/deploy_config.py`
- Create: `scripts/tests/test_deploy_config.py`
- Modify: `scripts/deploy_all.py`
- Modify: `scripts/deploy_api.py`
- Modify: `scripts/deploy_frontend.py`
- Modify: `h5-video-tool-api/.env.example`

**Step 1: Write the failing test**

Add Python unit tests that prove:

- deploy target `staging` resolves to staging dirs and PM2 name
- deploy target `prod` resolves to prod dirs and PM2 name
- missing required config raises a clear error
- scripts no longer depend on hardcoded password literals

**Step 2: Run test to verify it fails**

Run:

```bash
python -m unittest scripts.tests.test_deploy_config
```

Expected:

- FAIL because `deploy_config.py` does not exist yet

**Step 3: Write minimal implementation**

Implement:

- shared config loader for deploy scripts
- `--target staging|prod`
- target-aware remote paths / PM2 names / version URLs
- local env loading from untracked env sources
- remove inline server password and hardcoded prod-only paths

**Step 4: Run test to verify it passes**

Run:

```bash
python -m unittest scripts.tests.test_deploy_config
```

Expected:

- PASS

Then smoke-check:

```bash
python scripts/deploy_all.py --target staging --frontend-only
python scripts/deploy_all.py --target prod --api-only
```

Expected:

- argument parsing succeeds locally
- no deploy is attempted unless config is present

**Step 5: Commit**

```bash
git add scripts/deploy_config.py scripts/tests/test_deploy_config.py scripts/deploy_all.py scripts/deploy_api.py scripts/deploy_frontend.py h5-video-tool-api/.env.example
git commit -m "feat: support staging and prod deploy targets"
```

### Task 6: Product/Docs Sync and Verification

**Files:**
- Modify: `PRODUCT.md`
- Create: `docs/plans/2026-04-23-staging-prod-deployment-design.md`
- Create: `docs/plans/2026-04-23-staging-prod-deployment-plan.md`

**Step 1: Write the verification-first checklist**

Prepare the final verification commands:

```bash
cd h5-video-tool-api && node --test --import tsx tests/deploymentState.test.ts
cd h5-video-tool && node --test --import tsx tests/deploymentBanner.test.ts
python -m unittest scripts.tests.test_deploy_config
cd h5-video-tool-api && npx tsc --noEmit
cd h5-video-tool && npm run build
```

**Step 2: Run all verification commands**

Expected:

- all tests pass
- backend TypeScript passes
- frontend build passes

**Step 3: Update docs and changelog**

Update:

- `PRODUCT.md` changelog
- deployment-related module description if needed

**Step 4: Stage release-ready files**

```bash
git add PRODUCT.md docs/plans/2026-04-23-staging-prod-deployment-design.md docs/plans/2026-04-23-staging-prod-deployment-plan.md
```

**Step 5: Commit**

```bash
git commit -m "docs: add staging prod deployment design and plan"
```
