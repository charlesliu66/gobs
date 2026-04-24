# Production Design Asset Experience Design

**Date:** 2026-04-24
**Run ID:** `2026-04-24-production-design-asset-experience`

## Goal

Reduce friction in advanced production step 2 (`角色 / 场景 / 道具`) by making asset readiness legible, making missing-character generation one click, exposing wardrobe-state power features earlier, and making wardrobe state selection visible inside storyboard references.

## Product Decisions

### 1. Readiness board replaces count-only mental model

Keep the existing tab counts, but add a readiness board under the tabs:

- 角色 `ready / total`
- 场景 `ready / total`
- 道具 `ready / total`

Status definitions must be shared:

- `missing`: no confirmed image
- `generating`: generation in progress
- `review`: generated preview waiting for confirm
- `ready`: confirmed usable image exists
- `failed`: batch generation failed or explicit failure state exists

The primary batch CTA should become contextual:

- If anything is missing, show `一键补全缺图（还差 N 张）`
- If everything is ready, demote or hide the CTA

### 2. Character cards get a true fast path

For character cards only:

- If the active/default look is missing, clicking the card directly generates the default image
- While generating, the card stays in-place with spinner overlay
- When preview is ready, the card shows inline `确认使用 / 重试`
- `编辑形象变体` remains as the advanced path

This keeps the first-use flow to three steps: click, wait, confirm.

### 3. Scene and prop cards keep modal generation, but align visuals

Scene/prop generation stays modal-first for this run. We improve clarity instead of rewriting interaction:

- Ready cards show a small success badge
- Missing cards use dashed borders and `点击生图`
- Scene cards get stronger card-body labeling
- Prop cards get better hover preview / tooltip treatment and less cramped status communication

### 4. Wardrobe states become first-class

Inside `状态衣橱`:

- Base image can open in lightbox
- Each state image can open in lightbox
- Card subtitle surfaces counts like `1 个形象 · 3 个状态`
- Add a visible wardrobe entry button on the character card
- The star/default action is clarified as `设为分镜默认状态`

### 5. Storyboard state selection becomes explainable

The data model already supports:

- `activeStateId` as character default state
- `shot.characterStateOverrides` as per-shot manual override

This run makes the flow visible:

- In storyboard asset sidebar, each character shows current effective state and source (`自动` / `手动`)
- State thumbnails remain zoomable
- Manual select remains in the sidebar, but the main workspace gets a compact summary of current effective state choices

### 6. Batch generation feedback becomes outcome-oriented

Batch generation should report:

- estimated time at start
- current item label while running
- end-of-run summary with success/failure counts
- direct retry CTA for failed items

Use in-app summary UI rather than browser `confirm`.

### 7. Style anchor stays visible in step 2

Show the current style lock in the design header:

- optional thumbnail
- concise summary text
- subtle edit / revisit affordance

This reinforces that character, scene, and prop generations all inherit the same visual tone.

## Non-Goals

- No backend pipeline changes
- No changes to forbidden video/image service files
- No redesign of the overall Production Wizard shell
- No rewrite of scene/prop modal generation to inline generation in this run

## Files Expected To Change

- `h5-video-tool/src/pages/ProductionWizard.tsx`
- `h5-video-tool/src/studio/steps/StepDesignWorkspace.tsx`
- `h5-video-tool/src/studio/steps/StepDesignHeader.tsx`
- `h5-video-tool/src/studio/steps/StepDesignCharactersPanel.tsx`
- `h5-video-tool/src/studio/steps/StepDesignScenesPanel.tsx`
- `h5-video-tool/src/studio/steps/StepDesignPropsPanel.tsx`
- `h5-video-tool/src/components/production/CharacterWardrobePanel.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardAssetsSidebar.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardFieldsEditor.tsx`
- `h5-video-tool/src/studio/productionAssets.ts`
- `h5-video-tool/src/studio/productionTypes.ts`
- `h5-video-tool/src/i18n/messages.ts`
- tests under `h5-video-tool/tests/`

## Verification Strategy

- TDD for shared readiness/status helpers
- focused tests for state resolution and storyboard state display logic
- frontend build
- backend typecheck
- manual validation of:
  - character missing-card direct generation
  - wardrobe state zoom
  - storyboard effective state selection
  - batch completion summary

