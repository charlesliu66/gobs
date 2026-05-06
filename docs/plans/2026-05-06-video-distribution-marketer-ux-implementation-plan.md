# Video Distribution Marketer UX Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the current distribution page into a safer marketer-facing publishing workflow with asset-first entry, explicit account selection, platform-aware copy handling, and persistent publish history.

**Architecture:** Keep the existing GeeLark publish endpoints as the integration backbone. Evolve the frontend around `TabDistribute` into a small workspace composed of distinct sections for asset selection, account selection, platform copy, publish review, and recent publish history. Reuse existing backend routes where possible, and only add new route shape or persistence support where the current APIs cannot support the safer workflow.

**Tech Stack:** React, TypeScript, Vite, Express, node:test, tsx

---

### Task 1: Lock In P0 UX Rules With Frontend Tests

**Files:**
- Create: `h5-video-tool/tests/tabDistributeWorkflow.test.tsx`
- Modify: `h5-video-tool/src/pages/TabDistribute.tsx`

**Step 1: Write the failing test**

Add focused tests that express the new baseline rules:

- no target accounts are selected by default
- filter changes never silently re-select an account
- publish CTA can be enabled from a valid selected asset even when the asset source is not the current create-flow `videoUrl`
- generated multi-platform copy does not silently overwrite the global editor state with the first platform candidate

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/tabDistributeWorkflow.test.tsx`

Expected: FAIL because the page still auto-selects the first account and still assumes the old publish flow.

**Step 3: Write minimal implementation**

Refactor `TabDistribute.tsx` state so that:

- selected account state starts empty
- account filtering does not mutate the selection unexpectedly
- asset selection state is separate from raw create-flow state
- generated platform variants are stored independently from the main editable payload

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/tabDistributeWorkflow.test.tsx`

Expected: PASS

### Task 2: Add Asset-First Distribution Entry

**Files:**
- Create: `h5-video-tool/src/components/distribute/DistributeAssetPicker.tsx`
- Modify: `h5-video-tool/src/pages/TabDistribute.tsx`
- Modify: `h5-video-tool/src/utils/videoHistory.ts`
- Modify: `h5-video-tool/src/api/video.ts`

**Step 1: Write the failing test**

Extend `tabDistributeWorkflow.test.tsx` or add a dedicated test to cover:

- current create-flow asset appears as a suggestion, not the only source
- a recent asset from history or server outputs can become the selected publish asset
- a valid `videoPath` can drive the publish flow even if `videoUrl` is absent at first

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/tabDistributeWorkflow.test.tsx`

Expected: FAIL because the page currently blocks the workflow on `videoUrl`-centric rendering.

**Step 3: Write minimal implementation**

Build a small asset picker that can hydrate from:

- current `useCreateFlow()` result
- recent local history metadata
- recent server file outputs already exposed by existing video APIs

Update `TabDistribute.tsx` so the selected asset is a first-class object with:

- `videoPath`
- optional `videoUrl`
- `taskId`
- source label

Use that object everywhere publish and caption generation need video context.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/tabDistributeWorkflow.test.tsx`

Expected: PASS

### Task 3: Replace Risky Account Selection With Explicit Selection UX

**Files:**
- Modify: `h5-video-tool/src/pages/TabDistribute.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`

**Step 1: Write the failing test**

Add tests that verify:

- no checkbox is selected on first load
- "select all in current filter" only selects visible accounts
- "clear selection" fully clears the current selection
- publish is blocked with a clear error when no accounts are selected

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/tabDistributeWorkflow.test.tsx`

Expected: FAIL because the page currently preselects accounts and lacks explicit bulk controls.

**Step 3: Write minimal implementation**

Update the target-account section to:

- remove first-account auto-selection
- add selection summary text
- add `select visible` / `clear` controls
- keep region / platform filters but separate filtering from selection ownership

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/tabDistributeWorkflow.test.tsx`

Expected: PASS

### Task 4: Model Copy By Platform Instead Of Implicit Global Caption

**Files:**
- Modify: `h5-video-tool/src/pages/TabDistribute.tsx`
- Modify: `h5-video-tool/src/api/promptPolish.ts`
- Create: `h5-video-tool/tests/tabDistributeCopyCards.test.tsx`

**Step 1: Write the failing test**

Add tests for:

- generated `byPlatform` results stay isolated per platform card
- the first generated platform is not auto-promoted into the publish payload without user confirmation
- editing one platform card does not silently change the others
- language actions have a clear scope for the active platform card

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/tabDistributeCopyCards.test.tsx`

Expected: FAIL because the current page writes the first platform result directly into the main caption state.

**Step 3: Write minimal implementation**

Refactor copy state into a platform-indexed structure. Update the page so that:

- each platform gets its own editable card
- the user explicitly chooses the publish payload per platform
- the manual override path is visually distinct if you keep one
- language changes translate or regenerate only the intended active payload

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/tabDistributeCopyCards.test.tsx`

Expected: PASS

### Task 5: Promote Publish Status Into Persistent History

**Files:**
- Modify: `h5-video-tool/src/api/geelark.ts`
- Modify: `h5-video-tool/src/pages/TabDistribute.tsx`
- Create: `h5-video-tool/src/components/distribute/DistributePublishHistory.tsx`
- Create: `h5-video-tool/tests/distributePublishHistory.test.tsx`
- Modify: `h5-video-tool-api/src/routes/geelark.ts`
- Create: `h5-video-tool-api/tests/geelarkTaskHistoryShape.test.ts`

**Step 1: Write the failing test**

Add frontend and backend tests that cover:

- loading recent task history from `/api/geelark/tasks`
- reopening a finished or in-progress task detail after refresh
- grouping the latest server history into a useful publish-history list for the UI

**Step 2: Run test to verify it fails**

Run:

- `node --import tsx --test tests/distributePublishHistory.test.tsx` in `h5-video-tool`
- `node --import tsx --test tests/geelarkTaskHistoryShape.test.ts` in `h5-video-tool-api`

Expected: FAIL because the page currently only tracks a local in-memory batch and does not treat task history as a first-class UX surface.

**Step 3: Write minimal implementation**

Frontend:

- add a small publish-history panel or tab
- fetch recent task history on page load
- keep the current "latest batch" live polling path, but merge it into the persistent history model

Backend:

- adjust route shape only if needed so the frontend can render enough metadata cleanly
- keep backward compatibility where practical

**Step 4: Run test to verify it passes**

Run:

- `node --import tsx --test tests/distributePublishHistory.test.tsx`
- `node --import tsx --test tests/geelarkTaskHistoryShape.test.ts`

Expected: PASS

### Task 6: Add P1 Campaign Framing Inputs

**Files:**
- Modify: `h5-video-tool/src/pages/TabDistribute.tsx`
- Modify: `h5-video-tool/src/api/promptPolish.ts`
- Modify: `h5-video-tool-api/src/routes/prompt.ts`
- Modify: `h5-video-tool-api/src/services/promptPolish.ts`
- Create: `h5-video-tool-api/tests/promptCaptionCampaignContext.test.ts`

**Step 1: Write the failing test**

Add tests for prompt request shape and backend handling of:

- campaign objective
- target audience
- CTA
- target market / language
- compliance notes or phrase bans

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/promptCaptionCampaignContext.test.ts`

Expected: FAIL because the current request path does not model these marketer inputs explicitly.

**Step 3: Write minimal implementation**

Add lightweight campaign framing inputs to the UI and thread them through prompt-generation requests. Keep them optional but structured so they influence caption generation in a predictable way.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/promptCaptionCampaignContext.test.ts`

Expected: PASS

### Task 7: Surface Publish Presets And Checklist

**Files:**
- Modify: `h5-video-tool/src/pages/TabDistribute.tsx`
- Create: `h5-video-tool/src/components/distribute/DistributePreflightChecklist.tsx`
- Create: `h5-video-tool/src/components/distribute/DistributeAccountPresetPicker.tsx`
- Modify: `h5-video-tool/src/pages/SettingsAccounts.tsx`
- Modify: `h5-video-tool-api/src/routes/gobsAuth.ts`

**Step 1: Write the failing test**

Add tests that verify:

- a reusable account preset can populate the selection intentionally
- the preflight checklist reflects missing video / missing accounts / missing platform copy
- publish options such as share link or AI label are visible and reviewable when supported

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/tabDistributeWorkflow.test.tsx tests/distributePublishHistory.test.tsx`

Expected: FAIL because the current page has neither presets nor a structured preflight step.

**Step 3: Write minimal implementation**

Surface the most relevant grouping / preset capability in the distribution page, reusing existing admin-configured publish and matrix metadata where possible. Add a final review card that blocks obvious incomplete publishes.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/tabDistributeWorkflow.test.tsx tests/distributePublishHistory.test.tsx`

Expected: PASS

### Task 8: Optional P2 Scheduling And Handoff Design Spike

**Files:**
- Create: `docs/plans/2026-05-06-video-distribution-scheduling-design-spike.md`

**Step 1: Write the spike note**

Document:

- backend gaps for scheduling
- approval-state needs
- whether GeeLark supports the required timing semantics directly
- rollout constraints for future implementation

**Step 2: Do not implement scheduling in the same release**

Expected: this remains a follow-up design spike, not a surprise scope expansion.

### Task 9: Verify P0/P1 End To End

**Files:**
- Modify: `PRODUCT.md`
- Modify: `CHANGELOG.md`

**Step 1: Run frontend tests**

Run:

- `node --import tsx --test tests/tabDistributeWorkflow.test.tsx`
- `node --import tsx --test tests/tabDistributeCopyCards.test.tsx`
- `node --import tsx --test tests/distributePublishHistory.test.tsx`

**Step 2: Run backend tests**

Run:

- `node --import tsx --test tests/geelarkTaskHistoryShape.test.ts`
- `node --import tsx --test tests/promptCaptionCampaignContext.test.ts`

**Step 3: Run existing related regression tests**

Run:

- `node --import tsx --test tests/promptPolish.test.ts` in `h5-video-tool`
- `node --import tsx --test tests/promptCaptionRules.test.ts tests/geelarkAccounts.test.ts` in `h5-video-tool-api`

**Step 4: Run type checks**

Run:

- `npx tsc --noEmit` in `h5-video-tool`
- `npx tsc --noEmit` in `h5-video-tool-api`

**Step 5: Run builds**

Run:

- `npm run build` in `h5-video-tool`
- `npm run build` in `h5-video-tool-api`

**Step 6: Update product docs**

Update `PRODUCT.md` and `CHANGELOG.md` to describe:

- asset-first distribution entry
- safer target account selection
- platform-card copy editing
- persistent publish history
- campaign framing / checklist if P1 ships

**Step 7: Release with staging-first guard**

Run:

- `python scripts/deploy_all.py --target staging`
- manual staging smoke of the distribution page
- `python scripts/mark_release_ready.py --updated-by <your-name>`
- `python scripts/deploy_all.py --target prod --updated-by <your-name>`
- `python scripts/set_deployment_state.py --target prod --phase idle --updated-by <your-name>`

Plan complete and saved to `docs/plans/2026-05-06-video-distribution-marketer-ux-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
