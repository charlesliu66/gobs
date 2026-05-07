# Campaign Mission Control Phase 0 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** After the Knowledge Brain foundation lands, reframe the default product surface from tool-first to campaign-first so marketers and operators can create, review, and distribute campaign content with fewer decisions and fewer clicks.

**Architecture:** Treat `Knowledge Brain -> Campaign Creative -> Editor` as the new base layer, not a future assumption. Keep the existing `Campaign Creative -> strategy -> variant -> Editor` foundation, but reorganize it around a `Campaign Mission Control` shell after knowledge-aware strategy generation is already in place. Move professional controls behind an `Advanced Studio` boundary, add explicit `Campaign` / `Campaign Plan` / `Feedback Record` objects, and make human feedback the short-term learning loop instead of performance analytics.

**Tech Stack:** React 19 + Vite + TypeScript (`h5-video-tool/`), Express + TypeScript (`h5-video-tool-api/`), Node built-in test runner for pure TypeScript logic, existing editor handoff and distribution routes.

---

## Execution Prerequisite

Do not start this plan until `2026-05-06-campaign-knowledge-brain-foundation` is merged or otherwise stabilized in the active working branch.

Before Task 1, verify the actual landed shape of:

- `h5-video-tool/src/components/campaign/model.ts`
- `h5-video-tool/src/components/campaign/strategy.ts`
- `h5-video-tool/src/pages/CampaignCreative.tsx`
- `h5-video-tool-api/src/services/campaignKnowledgeDerivation.ts`
- `h5-video-tool-api/src/services/editorCreativeBrief.ts`

This plan assumes the current creative flow can already consume:

- `selectedKnowledgePackIds`
- `DerivedCampaignKnowledgeContext`
- knowledge-aware strategy fields such as `marketTruth`, `toneRules`, `forbiddenClaims`, `approvedAngles`, or equivalent stable outputs

If the finished Knowledge Brain run lands the same concepts under different field names, adapt this plan to the shipped names instead of adding duplicate structures.

---

### Task 1: Freeze the mission-control domain model

**Files:**
- Modify: `h5-video-tool/src/components/campaign/model.ts`
- Modify: `h5-video-tool/src/components/campaign/strategy.ts`
- Modify: `h5-video-tool/src/editor/utils/editorCreativeBrief.ts`
- Modify: `h5-video-tool-api/src/services/editorCreativeBrief.ts`
- Test: `h5-video-tool-api/tests/editorCreativeBrief.test.ts`

**Step 1: Write the failing test**

Add coverage for three new ideas:

- `CampaignProfile.automationLevel`
- `CampaignProfile.selectedKnowledgePackIds` and a stable knowledge-context slot that reuses the landed Knowledge Brain shape
- `CampaignPlan` summary fields that describe what the system decided to produce from both brief and knowledge context
- `FeedbackRecord` summary lines that must survive handoff serialization

Use the existing `node:test` style in `h5-video-tool-api/tests/editorCreativeBrief.test.ts`.

**Step 2: Run test to verify it fails**

Run:

```bash
cd h5-video-tool-api
node --import tsx --test tests/editorCreativeBrief.test.ts
```

Expected: FAIL because the new fields are missing from the current types or serialization output.

**Step 3: Write minimal implementation**

Add the new type fields in `model.ts`, then teach the front-end and API `editorCreativeBrief` serializers how to preserve them without changing forbidden provider files.

Keep it DRY:

- add shared field names once
- reuse the landed knowledge-context keys instead of inventing parallel mission-control copies
- reuse the same summary keys on both front end and API
- default to empty arrays / null-safe strings instead of optional nested objects exploding downstream

**Step 4: Run test to verify it passes**

Run:

```bash
cd h5-video-tool-api
node --import tsx --test tests/editorCreativeBrief.test.ts
```

Expected: PASS with the new mission-control fields preserved in the handoff payload.

**Step 5: Commit**

```bash
git add h5-video-tool/src/components/campaign/model.ts h5-video-tool/src/components/campaign/strategy.ts h5-video-tool/src/editor/utils/editorCreativeBrief.ts h5-video-tool-api/src/services/editorCreativeBrief.ts h5-video-tool-api/tests/editorCreativeBrief.test.ts
git commit -m "feat: add campaign mission control domain fields"
```

---

### Task 2: Turn the homepage into a Mission Control entry

**Files:**
- Modify: `h5-video-tool/src/pages/Home.tsx`
- Modify: `h5-video-tool/src/components/Layout.tsx`
- Modify: `h5-video-tool/src/App.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`

**Step 1: Write the failing test**

Add copy assertions to an existing message test file for the new user-facing labels:

- `Campaign Mission Control`
- `Create Campaign`
- `Needs Your Review`
- `Advanced Studio`

Use:

- `h5-video-tool/src/i18n/locale.test.ts`

**Step 2: Run test to verify it fails**

Run:

```bash
cd h5-video-tool
node --import tsx --test src/i18n/locale.test.ts
```

Expected: FAIL because the new message keys do not exist yet.

**Step 3: Write minimal implementation**

Update `messages.ts`, then reframe `Home.tsx`, `Layout.tsx`, and route labels in `App.tsx` so the default surface emphasizes:

- campaign list / campaign creation
- system status
- pending decisions
- knowledge-aware campaign planning as the primary path

Do not remove advanced routes. Instead, demote them visually and label them as advanced / studio-oriented.

**Step 4: Run test to verify it passes**

Run:

```bash
cd h5-video-tool
node --import tsx --test src/i18n/locale.test.ts
npm run build
```

Expected: PASS for copy assertions and PASS for the production build.

**Step 5: Commit**

```bash
git add h5-video-tool/src/pages/Home.tsx h5-video-tool/src/components/Layout.tsx h5-video-tool/src/App.tsx h5-video-tool/src/i18n/messages.ts h5-video-tool/src/i18n/locale.test.ts
git commit -m "feat: reframe home as campaign mission control"
```

---

### Task 3: Rebuild `CampaignCreative` as a marketer-first campaign shell on top of knowledge-aware inputs

**Files:**
- Modify: `h5-video-tool/src/pages/CampaignCreative.tsx`
- Modify: `h5-video-tool/src/components/campaign/CampaignBriefForm.tsx`
- Modify: `h5-video-tool/src/components/campaign/CampaignStrategyCard.tsx`
- Modify: `h5-video-tool/src/components/campaign/CampaignStrategyTuningPanel.tsx`
- Modify: `h5-video-tool/src/components/campaign/CampaignKnowledgeSelector.tsx`
- Create: `h5-video-tool/src/components/campaign/CampaignPlanCard.tsx`
- Create: `h5-video-tool/src/components/campaign/CampaignPendingActionsCard.tsx`
- Test: `h5-video-tool/src/components/campaign/strategy.test.ts`

**Step 1: Write the failing test**

Create a pure logic test around `strategy.ts` that proves the planner can derive:

- a short campaign plan summary
- an explicit automation level summary
- a knowledge-aware plan summary that reacts to selected pack context
- a short pending-actions list when the campaign is high risk

Use `node:test` with `tsx` so the test remains lightweight.

**Step 2: Run test to verify it fails**

Run:

```bash
cd h5-video-tool
node --import tsx --test src/components/campaign/strategy.test.ts
```

Expected: FAIL because the current strategy helpers do not expose these mission-control summaries.

**Step 3: Write minimal implementation**

Add planner helpers in `strategy.ts`, then update `CampaignCreative.tsx` and the new cards so the page defaults to:

- brief input
- selected knowledge packs / derived context summary
- system plan
- asset pack preview
- pending decisions

Do not lead with tuning controls. Keep `CampaignStrategyTuningPanel.tsx` available, but collapse it under an advanced section.

**Step 4: Run test to verify it passes**

Run:

```bash
cd h5-video-tool
node --import tsx --test src/components/campaign/strategy.test.ts
npm run build
```

Expected: PASS for the new planner helpers and PASS for the build.

**Step 5: Commit**

```bash
git add h5-video-tool/src/pages/CampaignCreative.tsx h5-video-tool/src/components/campaign/CampaignBriefForm.tsx h5-video-tool/src/components/campaign/CampaignStrategyCard.tsx h5-video-tool/src/components/campaign/CampaignStrategyTuningPanel.tsx h5-video-tool/src/components/campaign/CampaignPlanCard.tsx h5-video-tool/src/components/campaign/CampaignPendingActionsCard.tsx h5-video-tool/src/components/campaign/strategy.ts h5-video-tool/src/components/campaign/strategy.test.ts
git commit -m "feat: add marketer-first campaign shell"
```

---

### Task 4: Sink professional controls behind `Advanced Studio`

**Files:**
- Modify: `h5-video-tool/src/pages/EditorWorkbench.tsx`
- Modify: `h5-video-tool/src/components/campaign/CampaignStrategyCard.tsx`
- Modify: `h5-video-tool/src/pages/ProjectList.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`

**Step 1: Write the failing test**

Add message assertions for:

- `Open In Advanced Studio`
- `Fine-Tune In Editor`
- `Review Before Publish`

Use `h5-video-tool/src/i18n/locale.test.ts`.

**Step 2: Run test to verify it fails**

Run:

```bash
cd h5-video-tool
node --import tsx --test src/i18n/locale.test.ts
```

Expected: FAIL because these labels do not exist yet.

**Step 3: Write minimal implementation**

Re-label the editor-first affordances so the default experience stays campaign-first:

- editor entry is still available, but clearly “advanced”
- the current variant and knowledge-aware rationale stay visible as context, not as the primary screen goal
- project / studio links are still reachable, but visually secondary

**Step 4: Run test to verify it passes**

Run:

```bash
cd h5-video-tool
node --import tsx --test src/i18n/locale.test.ts
npm run build
```

Expected: PASS for labels and PASS for the build.

**Step 5: Commit**

```bash
git add h5-video-tool/src/pages/EditorWorkbench.tsx h5-video-tool/src/components/campaign/CampaignStrategyCard.tsx h5-video-tool/src/pages/ProjectList.tsx h5-video-tool/src/i18n/messages.ts h5-video-tool/src/i18n/locale.test.ts
git commit -m "feat: demote studio controls behind advanced entry"
```

---

### Task 5: Add the short-term human feedback loop

**Files:**
- Modify: `h5-video-tool/src/components/campaign/model.ts`
- Modify: `h5-video-tool/src/pages/CampaignCreative.tsx`
- Create: `h5-video-tool/src/components/campaign/CampaignFeedbackBar.tsx`
- Modify: `h5-video-tool-api/src/routes/geelark.ts`
- Modify: `h5-video-tool-api/src/routes/prompt.ts`
- Test: `h5-video-tool-api/tests/promptCaptionCampaignContext.test.ts`

**Step 1: Write the failing test**

Add API-side coverage to prove campaign feedback context can be forwarded into downstream publish or caption preparation without breaking existing request shape.

Focus on fields like:

- `continueDirection`
- `changeAngle`
- `moreAggressive`
- `moreBrandSafe`
- `pauseChannel`

**Step 2: Run test to verify it fails**

Run:

```bash
cd h5-video-tool-api
node --import tsx --test tests/promptCaptionCampaignContext.test.ts
```

Expected: FAIL because the current prompt/distribution context does not understand feedback records yet.

**Step 3: Write minimal implementation**

Add a light feedback bar in `CampaignCreative.tsx`, store the chosen feedback actions in the campaign model, and thread that context into prompt / publish preparation routes.

Do not build analytics dashboards. This task is only about remembering human judgment and making it available to the next round.

Where possible, attach the feedback to the shipped knowledge-aware campaign object instead of inventing a separate memory silo. The next round should be able to see:

- which knowledge packs were active
- which direction the human approved or rejected
- which channels were paused or allowed

**Step 4: Run test to verify it passes**

Run:

```bash
cd h5-video-tool-api
node --import tsx --test tests/promptCaptionCampaignContext.test.ts
npx tsc --noEmit
cd ..\\h5-video-tool
npm run build
```

Expected: PASS for the new context test, PASS for API type-check, PASS for the front-end build.

**Step 5: Commit**

```bash
git add h5-video-tool/src/components/campaign/model.ts h5-video-tool/src/pages/CampaignCreative.tsx h5-video-tool/src/components/campaign/CampaignFeedbackBar.tsx h5-video-tool-api/src/routes/geelark.ts h5-video-tool-api/src/routes/prompt.ts h5-video-tool-api/tests/promptCaptionCampaignContext.test.ts
git commit -m "feat: add human feedback loop to campaign flow"
```

---

### Task 6: Verify the new default experience end-to-end

**Files:**
- Update: `docs/workflow/runs/<run-id>/builder-report.md`
- Update: `docs/workflow/runs/<run-id>/verifier-report.md`
- Update: `docs/workflow/runs/<run-id>/release-decision.md`

**Step 1: Run pure test coverage**

Run:

```bash
cd h5-video-tool
node --import tsx --test src/i18n/locale.test.ts src/components/campaign/strategy.test.ts
cd ..\\h5-video-tool-api
node --import tsx --test tests/editorCreativeBrief.test.ts tests/promptCaptionCampaignContext.test.ts
```

Expected: PASS.

**Step 2: Run build verification**

Run:

```bash
cd h5-video-tool-api
npx tsc --noEmit
npm run build
cd ..\\h5-video-tool
npm run build
```

Expected: PASS.

**Step 3: Run manual happy path**

Validate this exact path:

1. Open `/campaign-creative`
2. Select one or more knowledge packs and create a campaign with minimal brief input
3. Confirm the page shows knowledge-aware system plan + asset pack + pending actions
4. Confirm advanced tuning stays collapsed / secondary
5. Send one variant into editor
6. Confirm editor still receives campaign plus knowledge context
7. Add one short feedback action
8. Confirm the next prompt / publish preparation sees both the feedback and the originating knowledge-aware campaign context

**Step 4: Stage release evidence**

Run:

```bash
bash scripts/eval.sh <run-id>
```

Expected: PASS or documented WARN with explanation in verifier output.

**Step 5: Commit**

```bash
git add docs/workflow/runs/<run-id>/builder-report.md docs/workflow/runs/<run-id>/verifier-report.md docs/workflow/runs/<run-id>/release-decision.md
git commit -m "docs: record mission control verification evidence"
```

---

Plan complete and saved to `docs/plans/2026-05-06-campaign-mission-control-phase0-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
