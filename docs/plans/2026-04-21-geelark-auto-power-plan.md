# GeeLark Auto Power Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically start GeeLark phones before QAS video distribution and stop them after GeeLark reports successful publish completion.

**Architecture:** Keep the current `/api/geelark/publish` response shape unchanged. Move the phone lifecycle orchestration into `h5-video-tool-api/src/services/geelark.ts`, with pure helper functions covered by `node:test`, and run the task-success stop loop in the background after `task/add` succeeds.

**Tech Stack:** Node.js, TypeScript, Express, Axios, GeeLark OpenAPI, `node:test`

---

### Task 1: Lock the decision logic with failing tests

**Files:**
- Modify: `h5-video-tool-api/tests/geelarkAccounts.test.ts`
- Modify: `h5-video-tool-api/src/services/geelark.ts`

**Step 1: Write the failing test**

Add tests for:
- `getEnvIdsRequiringStart()` returning only off devices
- `areAllPhonesReady()` returning true only when all target envs are status `0`
- `buildTaskEnvMap()` preserving task-to-env index pairing
- `shouldStopPhoneForTaskStatus()` stopping only on GeeLark success status `3`

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/geelarkAccounts.test.ts`
Expected: FAIL because the new helpers do not exist yet.

**Step 3: Write minimal implementation**

Export minimal pure helpers from `h5-video-tool-api/src/services/geelark.ts`.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/geelarkAccounts.test.ts`
Expected: PASS

### Task 2: Add GeeLark phone lifecycle helpers

**Files:**
- Modify: `h5-video-tool-api/src/services/geelark.ts`

**Step 1: Write the failing test**

Use the pure helpers from Task 1 to define the intended orchestration decisions before wiring network calls.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/geelarkAccounts.test.ts`

**Step 3: Write minimal implementation**

Add:
- phone status query
- phone start
- phone stop
- wait loop for readiness
- background task monitor
- small `sleep()` helper

Keep the polling bounds explicit and conservative.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/geelarkAccounts.test.ts`

### Task 3: Integrate auto start/stop into publish flow

**Files:**
- Modify: `h5-video-tool-api/src/services/geelark.ts`

**Step 1: Write the failing test**

Use the pure task-env mapping and stop decision tests to protect the publish orchestration edges.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/geelarkAccounts.test.ts`

**Step 3: Write minimal implementation**

Update `publishVideo()` to:
- resolve target `envId`s
- ensure phones are ready before `task/add`
- start a detached monitor after `taskIds` are returned

Do not change the route response schema.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/geelarkAccounts.test.ts`

### Task 4: Verify compile safety

**Files:**
- Verify only

**Step 1: Run backend TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS in `h5-video-tool-api`

**Step 2: Run frontend TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS in `h5-video-tool`

**Step 3: Re-run focused backend test**

Run: `node --import tsx --test tests/geelarkAccounts.test.ts`
Expected: PASS
