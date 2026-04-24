# Production Design Asset Experience Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve Production Wizard step 2 so asset readiness is obvious, missing character generation is one-click, wardrobe states are inspectable, and storyboard state references are explicit.

**Architecture:** Add a shared frontend-only asset readiness model, thread it through the design header and asset cards, then wire wardrobe-state visibility through the storyboard sidebar using the existing `activeStateId` and `characterStateOverrides` data model. Keep modal-heavy advanced flows intact and add the missing direct path only where it materially reduces friction.

**Tech Stack:** React 19, TypeScript, Vite, local component state, existing Production Wizard helpers and `node:test`.

---

### Task 1: Shared readiness model and tests

**Files:**
- Create: `h5-video-tool/src/studio/designAssetStatus.ts`
- Create: `h5-video-tool/tests/designAssetStatus.test.ts`
- Modify: `h5-video-tool/src/studio/productionTypes.ts`

**Step 1: Write the failing test**

Cover:
- character ready vs review vs generating vs missing
- scene/prop ready vs missing
- aggregate counts for readiness board

**Step 2: Run test to verify it fails**

Run: `node --test tests/designAssetStatus.test.ts`
Expected: FAIL because helper does not exist yet

**Step 3: Write minimal implementation**

Implement helper functions that:
- resolve per-card status
- compute readiness counters for characters/scenes/props
- expose missing totals for batch CTA

**Step 4: Run test to verify it passes**

Run: `node --test tests/designAssetStatus.test.ts`
Expected: PASS

**Step 5: Commit**

Commit after Task 1 is verified.

### Task 2: Header readiness board, style chip, and batch feedback

**Files:**
- Modify: `h5-video-tool/src/studio/steps/StepDesignHeader.tsx`
- Modify: `h5-video-tool/src/pages/ProductionWizard.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`

**Step 1: Write the failing test**

Add or extend focused tests for:
- readiness summary formatting
- batch summary state transitions if extracted into helper logic

**Step 2: Run test to verify it fails**

Run the targeted test file

**Step 3: Write minimal implementation**

Add:
- readiness board under tabs
- style anchor chip
- batch ETA copy
- end-of-run summary state and retry CTA plumbing

**Step 4: Run tests and build**

Run:
- focused tests
- `npm run build` in `h5-video-tool`

**Step 5: Commit**

Commit after Task 2 verification.

### Task 3: Character/scenes/props card UX polish

**Files:**
- Modify: `h5-video-tool/src/studio/steps/StepDesignCharactersPanel.tsx`
- Modify: `h5-video-tool/src/studio/steps/StepDesignScenesPanel.tsx`
- Modify: `h5-video-tool/src/studio/steps/StepDesignPropsPanel.tsx`
- Modify: `h5-video-tool/src/pages/ProductionWizard.tsx`

**Step 1: Write the failing test**

Add a focused helper/UI test where practical for direct character generation decision logic.

**Step 2: Run test to verify it fails**

Run the targeted test file

**Step 3: Write minimal implementation**

Implement:
- character missing-card direct generate
- inline confirm/retry overlay for character previews
- status badges and dashed missing-card treatment across all three asset types
- stronger state count / wardrobe entry exposure on character cards
- scene/prop visual density improvements

**Step 4: Run tests and build**

Run targeted tests and frontend build.

**Step 5: Commit**

Commit after Task 3 verification.

### Task 4: Wardrobe zoom and storyboard state reference flow

**Files:**
- Modify: `h5-video-tool/src/components/production/CharacterWardrobePanel.tsx`
- Modify: `h5-video-tool/src/studio/steps/StepStoryboardAssetsSidebar.tsx`
- Modify: `h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`
- Modify: `h5-video-tool/src/studio/steps/StepStoryboardFieldsEditor.tsx`
- Modify: `h5-video-tool/src/studio/productionAssets.ts`
- Create or modify targeted test files under `h5-video-tool/tests/`

**Step 1: Write the failing test**

Cover:
- effective character state resolution priority
- auto vs manual storyboard state label behavior

**Step 2: Run test to verify it fails**

Run the targeted test file

**Step 3: Write minimal implementation**

Implement:
- wardrobe image lightbox entry
- clearer default-state labeling
- storyboard sidebar effective-state summary (`自动` / `手动`)
- main workspace compact summary of current state references

**Step 4: Run tests and build**

Run:
- targeted tests
- `node --test tests/shotUserStatus.test.ts`
- `npm run build`
- `npx tsc --noEmit` in `h5-video-tool-api`

**Step 5: Commit**

Commit after Task 4 verification.

### Task 5: Docs, reports, and release prep

**Files:**
- Modify: `PRODUCT.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/daily-reports/2026-04-24.md` (or current daily report if project convention differs)
- Modify: run docs under `docs/workflow/runs/2026-04-24-production-design-asset-experience/`

**Step 1: Update builder/verifier/release docs**

Record actual implementation, verification evidence, and open risks.

**Step 2: Run final verification**

Run:
- `node --test tests/designAssetStatus.test.ts`
- any new targeted tests
- `npm run build`
- `npx tsc --noEmit`

**Step 3: Commit**

Commit docs and final prep changes.

