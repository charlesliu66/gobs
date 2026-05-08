# Campaign Output Workbench Game Source Assets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the default post-brief Campaign Mission Control surface with an output workbench that shows what GOBS will produce, which game source assets are required, what GOBS can produce now, and which unsupported items become capability gaps.

**Architecture:** Add a C-ready output planning layer before the existing distribution package layer. `CampaignOutputPlan` and `ProductionItem` describe campaign deliverables and source asset readiness; existing `CampaignDistributionPackage` remains the publish-prep handoff object. Phase 1 should generate deterministic output plans from the confirmed brief, routed knowledge context, and selected strategy/variant without touching forbidden video-generation services.

**Tech Stack:** React + TypeScript in `h5-video-tool/`, Node.js + TypeScript + Express in `h5-video-tool-api/`, existing better-sqlite3 `assetDb.ts`, existing node test runner, existing Vite build.

---

### Task 1: Frontend Output Plan Types and Deterministic Builder

**Files:**
- Create: `h5-video-tool/src/components/campaign/outputPlan.ts`
- Modify: `h5-video-tool/tests/campaignDistributionPackage.test.ts`
- Test: `h5-video-tool/tests/campaignOutputPlan.test.ts`

**Step 1: Write the failing test**

Create `h5-video-tool/tests/campaignOutputPlan.test.ts` with cases for:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCampaignOutputPlan } from '../src/components/campaign/outputPlan.ts';

test('buildCampaignOutputPlan creates visible deliverables with source asset requirements', () => {
  const plan = buildCampaignOutputPlan({
    mission: 'Promote the new hero launch',
    brief: {
      briefId: 'brief_hero',
      platform: 'tiktok',
      mode: 'tiktok_content',
      objective: 'Build awareness for the new hero',
      audience: 'Gold and Glory players',
      sellingPoints: ['New hero joins the arena', 'High-impact skill reveal'],
      cta: 'Try the new hero today',
      referenceStyle: 'premium game launch',
      region: 'Global',
      forbiddenClaims: ['No guaranteed rewards'],
    },
    strategy: {
      strategyId: 'strategy_hero',
      briefId: 'brief_hero',
      platform: 'tiktok',
      mode: 'tiktok_content',
      objective: 'Build awareness for the new hero',
      targetAudience: 'Gold and Glory players',
      sellingPointFocus: 'High-impact skill reveal',
      hookApproach: 'benefit_first',
      hookOptions: ['Open with the new hero skill'],
      recommendedHook: 'Open with the new hero skill',
      cta: 'Try the new hero today',
      ctaType: 'direct_response',
      rationale: 'Show output, not planning.',
      angle: 'New hero launch',
      tone: 'Premium and urgent',
      assetNeeds: ['hero character art', 'skill gameplay clip'],
      riskNotes: ['Avoid unsupported reward claims'],
      knowledgePackIds: ['gold-market'],
      marketTruth: ['Players react to visible power spikes.'],
      audienceTension: ['They need proof the hero feels strong.'],
      toneRules: ['Keep claims concrete.'],
      forbiddenClaims: ['No guaranteed rewards'],
      visualCues: ['hero skill burst'],
      approvedAngles: ['lead with gameplay proof'],
      hookCandidates: ['watch the skill land'],
    },
    selectedVariantId: 'variant_hero',
  });

  assert.equal(plan.items.some((item) => item.type === 'short_video'), true);
  assert.equal(plan.items.some((item) => item.type === 'fb_post'), true);
  assert.equal(plan.sourceAssetRequirements.some((asset) => asset.assetType === 'character_art'), true);
  assert.equal(plan.capabilityGaps.length >= 1, true);
});
```

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/campaignOutputPlan.test.ts`

Expected: FAIL because `outputPlan.ts` does not exist.

**Step 3: Write minimal implementation**

Implement `outputPlan.ts` with:

- `CampaignOutputPlan`
- `ProductionItem`
- `GameSourceAssetRequirement`
- `CapabilityGap`
- `buildCampaignOutputPlan(args)`

Keep Phase 1 deterministic:

- always include a caption/headline set as `supported`
- include FB post items for content mode
- include short video items as `supported_with_source_assets`
- include banner items as `manual_recommended` unless enough source assets exist
- create source requirements from strategy `assetNeeds`, visual cues, and campaign mode
- create capability gaps for unsupported banner/video cases

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/campaignOutputPlan.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add h5-video-tool/src/components/campaign/outputPlan.ts h5-video-tool/tests/campaignOutputPlan.test.ts
git commit -m "feat: add campaign output plan model"
```

### Task 2: Backend Output Plan Persistence API

**Files:**
- Create: `h5-video-tool-api/src/services/campaignOutputPlan.ts`
- Create: `h5-video-tool-api/src/routes/campaignOutputPlan.ts`
- Modify: `h5-video-tool-api/src/index.ts`
- Test: `h5-video-tool-api/tests/campaignOutputPlan.test.ts`

**Step 1: Write the failing test**

Create backend tests that mirror `campaignDistributionPackage.test.ts`:

- `POST /api/campaign-output/plans` creates a plan with server-owned `ownerId/createdBy/updatedBy`
- `GET /api/campaign-output/plans` lists only current user's plans
- `GET /api/campaign-output/plans/:id` blocks cross-user reads
- `PATCH /api/campaign-output/plans/:id` updates status/items/source requirements while preserving owner
- malformed status or item type returns 400

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/campaignOutputPlan.test.ts`

Expected: FAIL because route/service do not exist.

**Step 3: Implement service and route**

Use existing `assetDb.ts` and mirror the package repository style:

- table: `campaign_output_plans`
- indexes:
  - `owner_id, updated_at DESC`
  - `owner_id, status`
  - `owner_id, game_id`
- store full payload as `payload_json`
- validate enum fields with explicit allowlists
- use field-aware validation; do not add broad recursive data stripping

API:

```text
POST /api/campaign-output/plans
GET  /api/campaign-output/plans
GET  /api/campaign-output/plans/:id
PATCH /api/campaign-output/plans/:id
```

**Step 4: Mount route**

Modify `h5-video-tool-api/src/index.ts`:

```ts
import campaignOutputPlanRouter from './routes/campaignOutputPlan.js';
app.use('/api/campaign-output', campaignOutputPlanRouter);
```

**Step 5: Run test to verify it passes**

Run: `node --import tsx --test tests/campaignOutputPlan.test.ts`

Expected: PASS.

**Step 6: Commit**

```bash
git add h5-video-tool-api/src/services/campaignOutputPlan.ts h5-video-tool-api/src/routes/campaignOutputPlan.ts h5-video-tool-api/src/index.ts h5-video-tool-api/tests/campaignOutputPlan.test.ts
git commit -m "feat: persist campaign output plans"
```

### Task 3: Campaign Creative Output Workbench UI

**Files:**
- Create: `h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx`
- Create: `h5-video-tool/src/api/campaignOutputPlan.ts`
- Modify: `h5-video-tool/src/pages/CampaignCreative.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`
- Test: `h5-video-tool/tests/campaignOutputWorkbenchPresence.test.ts`

**Step 1: Write the failing tests**

Add source presence tests for:

- `CampaignCreative.tsx` imports `CampaignOutputWorkbench`
- `CampaignCreative.tsx` does not show System Plan as the primary post-brief surface
- `CampaignOutputWorkbench.tsx` includes sections for output summary, source asset readiness, capability gaps, and confirm production
- i18n includes Chinese and English labels for `outputWorkbench`

**Step 2: Run tests to verify failure**

Run: `node --test tests/campaignOutputWorkbenchPresence.test.ts`

Expected: FAIL before files/strings exist.

**Step 3: Implement API wrapper**

Create `h5-video-tool/src/api/campaignOutputPlan.ts` with:

- `createCampaignOutputPlan`
- `listCampaignOutputPlans`
- `getCampaignOutputPlan`
- `updateCampaignOutputPlan`

Follow `h5-video-tool/src/api/campaignDistribution.ts`.

**Step 4: Implement workbench component**

`CampaignOutputWorkbench` props:

- `plan`
- `createdPlan`
- `isCreating`
- `errorMessage`
- `onCreatePlan`
- `onConfirmProduction`
- `onOpenAssetLibrary`
- `onOpenQuickFilm`
- `onCreateDistributionPackage`
- `copy`

Primary UI:

- output summary counts
- grouped production items
- source asset readiness list
- capability gaps as compact lower-priority list
- next action area

**Step 5: Wire CampaignCreative**

In `CampaignCreative.tsx`:

- build `campaignOutputPlanDraft` from mission, brief, strategy, selected variant, knowledge context
- show `CampaignOutputWorkbench` where `CampaignStrategyCard` currently dominates
- move `CampaignStrategyCard` and `CampaignStrategyTuningPanel` into advanced details
- keep `DistributionPackagePanel`, but make it the downstream action after output plan confirmation
- keep `Fine-tune in Editor` as advanced action

**Step 6: Run tests**

Run:

```bash
node --test tests/campaignOutputWorkbenchPresence.test.ts
node --import tsx --test tests/campaignOutputPlan.test.ts
```

Expected: PASS.

**Step 7: Commit**

```bash
git add h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx h5-video-tool/src/api/campaignOutputPlan.ts h5-video-tool/src/pages/CampaignCreative.tsx h5-video-tool/src/i18n/messages.ts h5-video-tool/tests/campaignOutputWorkbenchPresence.test.ts
git commit -m "feat: show campaign output workbench"
```

### Task 4: Distribution Package Bridge from Produced Items

**Files:**
- Modify: `h5-video-tool/src/components/campaign/distributionPackage.ts`
- Modify: `h5-video-tool/src/components/distribution/packageToDistributeDraft.ts`
- Test: `h5-video-tool/tests/campaignDistributionPackage.test.ts`
- Test: `h5-video-tool/tests/distributionPackageIntake.test.ts`

**Step 1: Extend tests**

Add tests proving:

- a produced `ProductionItem` can map to a `CampaignDistributionPackage` draft
- blocked/unsupported production items do not claim `publishable`
- source asset requirements are preserved in `assetReadiness.reason` or package metadata where needed
- account selection remains explicit in Distribution

**Step 2: Run tests to verify failure**

Run:

```bash
node --import tsx --test tests/campaignDistributionPackage.test.ts
node --test tests/distributionPackageIntake.test.ts
```

Expected: FAIL for new production item mapping expectations.

**Step 3: Implement bridge**

Add helper:

```ts
buildCampaignDistributionCreateInputFromProductionItem(args)
```

Rules:

- only `produced` items with real output assets can become `publishable`
- caption/headline-only items remain draft unless tied to a publishable visual asset
- preserve mission, brief, selected variant, and routed knowledge context
- include practical source-asset reason for missing assets

**Step 4: Run tests**

Expected: PASS.

**Step 5: Commit**

```bash
git add h5-video-tool/src/components/campaign/distributionPackage.ts h5-video-tool/src/components/distribution/packageToDistributeDraft.ts h5-video-tool/tests/campaignDistributionPackage.test.ts h5-video-tool/tests/distributionPackageIntake.test.ts
git commit -m "feat: bridge campaign outputs to distribution packages"
```

### Task 5: Full Verification and Docs

**Files:**
- Modify: `PRODUCT.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/TASK-INDEX.md`
- Modify: `docs/plans/README.md`
- Create or update: `docs/workflow/runs/2026-05-08-campaign-output-workbench-game-source-assets/`

**Step 1: Create run docs**

Bootstrap a new run directory:

```text
docs/workflow/runs/2026-05-08-campaign-output-workbench-game-source-assets/
```

Create:

- `SESSION-ANCHOR.md`
- `planner-spec.md`
- `challenger-review.md`

Scope should explicitly allow:

- output plan docs
- Campaign Creative output workbench files
- output plan backend route/service/tests
- distribution package bridge tests
- product/changelog/index docs

Scope should explicitly forbid:

- AGENTS.md forbidden video generation service files
- real automatic publishing
- scheduling engine
- analytics dashboard
- broad EditorWorkbench refactor

**Step 2: Run targeted tests**

Run:

```bash
cd h5-video-tool-api
node --import tsx --test tests/campaignOutputPlan.test.ts tests/campaignDistributionPackage.test.ts
npm run build
```

Expected: PASS.

Run:

```bash
cd h5-video-tool
node --import tsx --test tests/campaignOutputPlan.test.ts tests/campaignDistributionPackage.test.ts
node --test tests/campaignOutputWorkbenchPresence.test.ts tests/distributionPackageIntake.test.ts
npm run build
```

Expected: PASS, allowing the existing Vite dynamic import warning if unchanged.

**Step 3: Run workflow guard**

Run:

```bash
python scripts/workflow_guard.py --run-id 2026-05-08-campaign-output-workbench-game-source-assets --stage build
python scripts/workflow_guard.py --run-id 2026-05-08-campaign-output-workbench-game-source-assets --stage verify
```

Expected: PASS.

**Step 4: Update docs**

Update:

- `PRODUCT.md` latest version
- `CHANGELOG.md`
- `docs/TASK-INDEX.md`
- `docs/plans/README.md`
- run `builder-report.md`, `verifier-report.md`, `eval-result.json`, `release-decision.md` after verification

**Step 5: Commit**

```bash
git add PRODUCT.md CHANGELOG.md docs/TASK-INDEX.md docs/plans/README.md docs/workflow/runs/2026-05-08-campaign-output-workbench-game-source-assets
git commit -m "docs: plan campaign output workbench release"
```

### Task 6: Release Sync

**Files:**
- No code edits expected.

**Step 1: Push**

Run:

```bash
git push origin main
```

Expected: current HEAD exists on `origin/main`.

**Step 2: Deploy staging**

Run:

```bash
python scripts/deploy_all.py --target staging
```

Expected: `/api/system/version` returns staging at current SHA.

**Step 3: Smoke staging**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-h5-smoke-test/scripts/smoke_http.ps1 -Env staging -Depth full -ExpectedCommit <short-sha> -RunId 2026-05-08-campaign-output-workbench-game-source-assets
```

Expected: PASS or PASS WITH WARNINGS only for manual visual follow-up.

**Step 4: Mark release ready**

Run:

```bash
python scripts/mark_release_ready.py --updated-by codex
```

Expected: release-ready payload records current SHA.

**Step 5: Deploy prod and restore idle**

Run:

```bash
python scripts/deploy_all.py --target prod --updated-by codex
powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-h5-smoke-test/scripts/smoke_http.ps1 -Env prod -Depth full -ExpectedCommit <short-sha> -RunId 2026-05-08-campaign-output-workbench-game-source-assets
python scripts/set_deployment_state.py --target prod --phase idle --updated-by codex
```

Expected: prod version matches current SHA and prod state is `idle`.
