# Unified Project Lifecycle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stop both editor and production from creating new unnamed formal projects, and add a batch governance entry for existing unnamed projects.

**Architecture:** Introduce a shared project-lifecycle helper layer that can detect unnamed projects, detect meaningful draft content, and generate fallback project names. Use that layer to gate first persistence on both front-end flows, then add minimal backend guards and batch governance actions in the existing project list surfaces.

**Tech Stack:** React, Vite, TypeScript, Express, existing editor project routes, existing production persistence routes, node:test, tsx-based frontend tests.

---

### Task 1: Add shared lifecycle policy helpers

**Files:**
- Create: `h5-video-tool/src/utils/projectLifecycle.ts`
- Test: `h5-video-tool/tests/projectLifecycle.test.ts`

**Step 1: Write the failing test**

Cover:
- unnamed editor / production title detection
- meaningful editor draft detection
- meaningful production draft detection
- suggested names for editor and production

**Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/projectLifecycle.test.ts`
Expected: FAIL because helper file does not exist

**Step 3: Write minimal implementation**

Add pure helpers for:
- `isUnnamedEditorProjectName`
- `isUnnamedProductionProjectTitle`
- `hasMeaningfulEditorDraft`
- `hasMeaningfulProductionDraft`
- `suggestEditorProjectName`
- `suggestProductionProjectTitle`

**Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/projectLifecycle.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add h5-video-tool/src/utils/projectLifecycle.ts h5-video-tool/tests/projectLifecycle.test.ts
git commit -m "feat: add shared project lifecycle helpers"
```

### Task 2: Gate editor project creation behind required naming

**Files:**
- Modify: `h5-video-tool/src/editor/hooks/useTimelineState.ts`
- Modify: `h5-video-tool/src/pages/EditorWorkbench.tsx`
- Modify: `h5-video-tool/src/editor/components/EditorProjectManager.tsx`
- Modify: `h5-video-tool/src/api/editor.ts`

**Step 1: Write the failing integration-facing test**

Extend `tests/projectLifecycle.test.ts` to cover the editor-specific policy:
- meaningful unnamed draft should require naming before first save
- suggested name should prefer source production title or first asset name

**Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/projectLifecycle.test.ts`
Expected: FAIL on the new editor lifecycle assertions

**Step 3: Write minimal implementation**

Implement:
- unnamed blank editor draft no longer autosaves
- meaningful unnamed draft sets a required-naming flag
- editor naming modal becomes mandatory for first save
- project manager adds a `治理未命名项目` entry that batch deletes empty unnamed projects and batch renames the rest

**Step 4: Run tests**

Run: `npx tsx --test tests/projectLifecycle.test.ts tests/stepInput.test.tsx tests/agentMemoryPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add h5-video-tool/src/editor/hooks/useTimelineState.ts h5-video-tool/src/pages/EditorWorkbench.tsx h5-video-tool/src/editor/components/EditorProjectManager.tsx h5-video-tool/src/api/editor.ts h5-video-tool/tests/projectLifecycle.test.ts
git commit -m "feat: require naming before first editor save"
```

### Task 3: Gate production formal persistence behind required naming

**Files:**
- Modify: `h5-video-tool/src/pages/ProductionWizard.tsx`
- Modify: `h5-video-tool/src/studio/ProductionWizardShell.tsx`
- Modify: `h5-video-tool/src/studio/components/ProductionProjectListModal.tsx`
- Modify: `h5-video-tool/src/api/production.ts`

**Step 1: Write the failing policy test**

Extend `tests/projectLifecycle.test.ts` to cover production-specific policy:
- meaningful unnamed production draft should block first server persistence
- suggested production name should prefer a real title-like signal before fallback

**Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/projectLifecycle.test.ts`
Expected: FAIL on the new production lifecycle assertions

**Step 3: Write minimal implementation**

Implement:
- production draft can still live locally, but unnamed meaningful draft cannot create a server project
- first transition to a formal server project requires naming
- project list modal adds the same `治理未命名项目` entry

**Step 4: Run tests**

Run: `npx tsx --test tests/projectLifecycle.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add h5-video-tool/src/pages/ProductionWizard.tsx h5-video-tool/src/studio/ProductionWizardShell.tsx h5-video-tool/src/studio/components/ProductionProjectListModal.tsx h5-video-tool/src/api/production.ts h5-video-tool/tests/projectLifecycle.test.ts
git commit -m "feat: require naming before first production save"
```

### Task 4: Add backend guard rails for unnamed first-save

**Files:**
- Create: `h5-video-tool-api/src/services/projectLifecyclePolicy.ts`
- Modify: `h5-video-tool-api/src/routes/editorProjects.ts`
- Modify: `h5-video-tool-api/src/routes/productionPersist.ts`
- Test: `h5-video-tool-api/tests/projectLifecyclePolicy.test.ts`

**Step 1: Write the failing backend test**

Cover:
- new editor project without name is rejected by policy
- new production project without title is rejected by policy
- existing projects may keep or reuse previous names without breaking updates

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/projectLifecyclePolicy.test.ts`
Expected: FAIL because policy helper does not exist

**Step 3: Write minimal implementation**

Add pure policy helpers and route guards for first-save validation.

**Step 4: Run tests**

Run: `node --import tsx --test tests/projectLifecyclePolicy.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add h5-video-tool-api/src/services/projectLifecyclePolicy.ts h5-video-tool-api/src/routes/editorProjects.ts h5-video-tool-api/src/routes/productionPersist.ts h5-video-tool-api/tests/projectLifecyclePolicy.test.ts
git commit -m "feat: guard unnamed project creation on the server"
```

### Task 5: Verify, document, release

**Files:**
- Modify: `PRODUCT.md`
- Modify: `docs/daily-reports/2026-04-23.md`
- Modify: `docs/workflow/runs/2026-04-23-unified-project-lifecycle/SESSION-ANCHOR.md`
- Modify: `docs/workflow/runs/2026-04-23-unified-project-lifecycle/builder-report.md`
- Modify: `docs/workflow/runs/2026-04-23-unified-project-lifecycle/verifier-report.md`
- Modify: `docs/workflow/runs/2026-04-23-unified-project-lifecycle/release-decision.md`

**Step 1: Run full verification**

Run:
- `node --import tsx --test tests/projectLifecyclePolicy.test.ts`
- `node --import tsx --test tests/editorAgentMemorySchema.test.ts tests/editorAgentMemoryStore.test.ts tests/editorUserProfileService.test.ts tests/editorMemoryCompression.test.ts tests/editorMemoryControls.test.ts`
- `npx tsx --test tests/projectLifecycle.test.ts tests/editorCreativeBrief.test.ts tests/stepInput.test.tsx tests/agentMemoryPanel.test.tsx`
- `h5-video-tool-api: npx tsc --noEmit`
- `h5-video-tool: npx tsc --noEmit`
- `h5-video-tool-api: npm run build`
- `h5-video-tool: npm run build`

**Step 2: Update product and workflow docs**

Document:
- lifecycle unification
- no new unnamed projects on either side
- batch unnamed-project governance entry

**Step 3: Commit and deploy**

Run:
- `git add ...`
- `git commit -m "feat: unify project lifecycle naming gates"`
- `git push origin main`
- rebuild frontend/backend
- deploy API and frontend
- verify `/api/system/version`

**Step 4: Manual smoke**

Check:
- opening editor no longer creates unnamed formal project
- opening production no longer creates unnamed formal project
- first meaningful action forces naming
- governance action processes unnamed projects

Plan complete and saved to `docs/plans/2026-04-23-unified-project-lifecycle-plan.md`.
