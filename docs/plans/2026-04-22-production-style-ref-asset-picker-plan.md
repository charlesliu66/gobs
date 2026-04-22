# Production Style Ref Asset Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let Advanced Production users pick a style-reference image from Asset Library without leaving Step 0.

**Architecture:** Keep the new UI and picker state inside `StepInput`, then convert the selected asset into a `File` and hand it to the existing `onStyleRefFileChange` pipeline in `ProductionWizard`. This keeps preview, upload, and style-reference extraction on a single code path.

**Tech Stack:** React 19, TypeScript, Vite, node:test, existing asset-library frontend API

---

### Task 1: Lock the new entry point with a failing test

**Files:**
- Create: `h5-video-tool/src/studio/steps/StepInput.test.tsx`
- Modify: none
- Test: `h5-video-tool/src/studio/steps/StepInput.test.tsx`

**Step 1: Write the failing test**

- Render `StepInput` with minimal props using `react-dom/server`
- Assert the HTML includes `从素材库选择`

**Step 2: Run test to verify it fails**

Run: `..\\h5-video-tool-api\\node_modules\\.bin\\tsx.cmd --test src/studio/steps/StepInput.test.tsx`

Expected: FAIL because the button does not exist yet

**Step 3: Commit**

- Keep test local until implementation is green

### Task 2: Add picker UI and reuse the existing file-processing pipeline

**Files:**
- Modify: `h5-video-tool/src/studio/steps/StepInput.tsx`

**Step 1: Add local picker state**

- `showAssetPicker`
- `loadingAssets`
- `assetPickerError`
- `assetList`
- `selectingAssetId`

**Step 2: Implement asset-list loading**

- Lazily import `listAssets`
- Filter image assets only
- Keep errors inside the modal instead of breaking the page

**Step 3: Implement asset selection**

- Lazily import `buildAssetFileUrl` and `recordUsage`
- Fetch the selected asset as `Blob`
- Convert it into a browser `File`
- Call `onStyleRefFileChange(file)`

**Step 4: Render the picker UI**

- Keep the existing local file input
- Add a sibling button `从素材库选择`
- Add a modal grid showing image assets and selection status

### Task 3: Re-run targeted verification and full build checks

**Files:**
- Modify: `PRODUCT.md`
- Create: `docs/workflow/runs/2026-04-22-production-style-ref-asset-picker/*`

**Step 1: Run the targeted test**

Run: `..\\h5-video-tool-api\\node_modules\\.bin\\tsx.cmd --test src/studio/steps/StepInput.test.tsx`

Expected: PASS

**Step 2: Run TypeScript/build verification**

Run:
- `cd h5-video-tool-api && npx tsc --noEmit`
- `cd h5-video-tool && npm run build`

Expected: PASS

**Step 3: Update docs and changelog**

- Add a changelog entry in `PRODUCT.md`
- Record planner/builder/verifier/release notes under the new run directory
