# Planner Spec - 2026-05-07-campaign-to-distribution-handoff-mvp

## North Star

> `Campaign Creative Agent` must start from a campaign brief, use the Gold and Glory knowledge brain, produce usable creative variants, and send approved work into distribution without forcing marketers through a professional editor.

This run is in scope only if it shortens the marketer path from `Campaign Creative` to `Distribution` while preserving the existing advanced Editor path.

## 1) Project Goal

- Business goal: create the MVP handoff from Campaign Creative selected variant to a pending distribution package.
- User value: marketers can move from strategy selection to publish preparation without entering the heavy Editor by default.
- Product outcome: GOBS starts behaving like a campaign operations workspace instead of a video-tool collection.
- Success metrics:
  - A selected campaign variant can become a pending distribution package.
  - The package carries CTA, copy, asset references, risk notes, and applied knowledge context.
  - Distribution can load the package and prefill publish-facing fields.
  - Existing Campaign Creative -> Editor handoff remains available and compatible.

## 2) Background

- Landed mainline already supports `Knowledge Brain -> Campaign Creative -> Variant Pack -> Editor knowledge handoff`.
- OpenClaw's product review identified the biggest user-facing gap as `Campaign Creative -> Editor`断裂：运营完成策略后被带入过重的剪辑器。
- OpenClaw's code review identified `EditorWorkbench` size, API fragmentation, and backend service flattening as engineering drag, but those should be absorbed only where they support the business chain.
- Current `docs/TASK-INDEX.md` sets the next mainline direction as `Campaign Creative -> Distribution Handoff MVP`.
- Upstream design for this run: `docs/plans/2026-05-07-campaign-to-distribution-handoff-mvp-design.md`.

## 3) Scope

### In Scope

- Create a distribution package data contract that can be derived from Campaign Creative selected variant and knowledge context.
- Add backend package persistence/read/update seams for pending campaign distribution packages.
- Add a Campaign Creative UI action that creates a pending package from the selected/recommended variant.
- Add a Distribution UI entry that can load pending packages and prefill asset/copy/CTA/platform hints.
- Keep account selection and final publish confirmation explicit.
- Add targeted frontend/backend tests for package creation, knowledge-context preservation, and distribution prefill.
- Update docs, `PRODUCT.md`, `CHANGELOG.md`, and workflow run artifacts.

### Out of Scope

- Full Preview & Approve standalone route.
- Multi-user comments, approval routing, or reviewer assignment.
- Scheduling engine, batch publishing automation, or publish calendar.
- Post-publish analytics/performance dashboard.
- Full `EditorWorkbench` refactor, timeline changes, export changes, or media processing changes.
- GeeLark publish backend rewrite.
- SQLite -> PostgreSQL migration.
- New env vars.
- Any AGENTS.md forbidden files.

## 4) Module Breakdown

### 4.1 Shared Package Contract

- Responsibilities:
  - Define `CampaignDistributionPackage`.
  - Normalize selected variant + asset references + knowledge context into a stable package payload.
  - Keep brief-only / missing-asset fallback honest.
- Likely frontend files:
  - `h5-video-tool/src/components/campaign/distributionPackage.ts`
  - `h5-video-tool/src/components/campaign/model.ts`
- Likely backend files:
  - `h5-video-tool-api/src/services/campaignDistributionPackage.ts`

### 4.2 Backend Package API

- Responsibilities:
  - Create, list, read, and update pending distribution packages.
  - Persist package status without touching video-generation services.
  - Provide compatibility-safe validation and defaulting.
- Proposed endpoints:
  - `POST /api/campaign-distribution/packages`
  - `GET /api/campaign-distribution/packages`
  - `GET /api/campaign-distribution/packages/:id`
  - `PATCH /api/campaign-distribution/packages/:id`
- Likely files:
  - `h5-video-tool-api/src/routes/campaignDistribution.ts`
  - `h5-video-tool-api/src/services/campaignDistributionPackage.ts`
  - `h5-video-tool-api/src/index.ts`
  - `h5-video-tool-api/tests/campaignDistributionPackage.test.ts`

### 4.3 Campaign Creative Handoff UI

- Responsibilities:
  - Add `Create Distribution Package` / `生成待发布包` action near selected variant.
  - Show package preview with CTA, copy, platform hints, risk notes, and knowledge summary.
  - Keep `Fine-tune in Editor` as secondary advanced action.
- Likely files:
  - `h5-video-tool/src/pages/CampaignCreative.tsx`
  - `h5-video-tool/src/components/campaign/DistributionPackagePanel.tsx`
  - `h5-video-tool/src/api/campaignDistribution.ts`
  - `h5-video-tool/src/i18n/messages.ts`
  - `h5-video-tool/tests/campaignDistributionHandoff.test.tsx`

### 4.4 Distribution Package Intake

- Responsibilities:
  - Load pending packages.
  - Open a selected package and prefill publish-facing fields.
  - Preserve explicit account selection and publish confirmation.
  - Block direct publish when package has no ready asset.
- Likely files:
  - `h5-video-tool/src/pages/TabDistribute.tsx`
  - `h5-video-tool/src/components/distribution/PendingDistributionPackages.tsx`
  - `h5-video-tool/tests/distributionPackageIntake.test.tsx`

### 4.5 Documentation and Release Evidence

- Responsibilities:
  - Keep design/run docs aligned.
  - Record product-history changes.
  - Capture build, guard, eval, staging, and prod evidence if implementation proceeds.
- Files:
  - `docs/plans/2026-05-07-campaign-to-distribution-handoff-mvp-design.md`
  - `docs/workflow/runs/2026-05-07-campaign-to-distribution-handoff-mvp/*`
  - `docs/TASK-INDEX.md`
  - `docs/plans/README.md`
  - `PRODUCT.md`
  - `CHANGELOG.md`

## 5) Technical Approach

- Architecture decisions:
  - Add the new package seam under campaign/distribution naming instead of overloading editor-specific handoff payloads.
  - Reuse the landed knowledge-context field names: `marketTruth`, `audienceTension`, `toneRules`, `forbiddenClaims`, `visualCues`, `approvedAngles`, `hookCandidates`.
  - Store V1 packages as lightweight server-side records using existing local persistence patterns; do not introduce database migration.
  - Treat Editor as an advanced path; do not route the default marketer flow through `EditorWorkbench`.
- Data flow:
  1. Campaign Creative has brief, strategy, selected variant, selected knowledge packs, and derived knowledge context.
  2. User creates a distribution package.
  3. Backend persists a package with `draft` or `needs_review` state.
  4. UI navigates or links to Distribution with the package id.
  5. Distribution loads package, prefills copy/CTA/platform hints/asset reference, and asks user to choose accounts explicitly.
- API or interface changes:
  - New campaign distribution package endpoints.
  - New frontend API wrapper for package calls.
  - Optional route/query contract for Distribution package intake, such as `/distribute?package=<id>`.
- Migration or compatibility notes:
  - Existing Campaign Creative -> Editor handoff must continue to work.
  - Existing Distribution flow from current create-flow asset must continue to work.
  - Missing package support should degrade to current Distribution behavior.

## 6) Risks

| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Scope creep | Builder tries to add approval, scheduling, analytics, and package handoff together | Delays and regressions | Hard-scope this run to package creation/intake only | Orchestrator |
| Editor regression | Broad edits in `EditorWorkbench` affect timeline/export/apply behavior | Breaks advanced users | Only touch shared handoff helper if strictly necessary; no timeline/export changes | Builder |
| Knowledge schema drift | New package invents duplicate knowledge fields | Future writeback becomes brittle | Reuse existing knowledge-context names and tests | Builder |
| Publish safety regression | Package prefill accidentally publishes or auto-selects accounts | Real account risk | Account selection remains explicit; publish disabled without user confirmation | Builder |
| Fake dashboard temptation | Home/dashboard work begins before data exists | Misleading product surface | Dashboard is out of scope until packages generate real pending states | Planner |
| Persistence over-design | V1 package storage becomes a database migration project | Scope blow-up | Use lightweight repository/facade only | Builder |

## 7) Acceptance Criteria

| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Campaign Creative can create a package from the selected/recommended variant | Frontend integration test + manual check | Clicking the new action calls the package API with variant, CTA, copy, asset references, risk notes, and knowledge context |
| AC-02 | Backend persists and returns package records safely | Backend unit/seam tests | Create/list/read/update tests pass for ready-asset, missing-asset, and partial-knowledge payloads |
| AC-03 | Distribution can intake a package | Frontend integration test + manual check | Opening Distribution with package id or package selection prefills asset/copy/CTA/platform hints |
| AC-04 | Publish remains explicit and safe | Frontend regression test | No accounts are auto-selected because of package intake; direct publish is blocked if no ready asset exists |
| AC-05 | Existing Editor handoff remains compatible | Existing editor handoff tests + targeted regression | `Open/Fine-tune in Editor` still carries knowledge-aware brief payload |
| AC-06 | The MVP stays within product truth | Docs review + UI test | No fake analytics, no fake publish performance, no hidden unfinished Platform modules exposed |
| AC-07 | Documentation and release evidence stay complete | Workflow guard + file review | Design doc, run docs, `PRODUCT.md`, and `CHANGELOG.md` are updated before release |

## 8) Test Matrix

| Category | Cases |
|---|---|
| Happy path | Campaign Creative selected variant with ready asset creates package; Distribution opens package and prefills fields. |
| Edge cases | No selected variant uses system-recommended variant; no ready asset creates draft/needs_asset state without publish CTA. |
| Knowledge path | Selected knowledge packs and structured context survive package creation and readback. |
| Error path | Package API validation rejects malformed payloads; frontend shows recoverable error. |
| Publish safety | Package intake does not auto-select accounts and does not bypass final publish confirmation. |
| Regression | Existing Campaign Creative strategy/variant flow and Editor knowledge handoff tests still pass. |
| Build | Frontend and backend production builds pass. |

## 9) Source Files To Inspect First

- `docs/plans/2026-05-07-campaign-to-distribution-handoff-mvp-design.md`
- `h5-video-tool/src/components/campaign/model.ts`
- `h5-video-tool/src/pages/CampaignCreative.tsx`
- `h5-video-tool/src/pages/TabDistribute.tsx`
- `h5-video-tool/src/api/client.ts`
- `h5-video-tool/src/api/campaignKnowledge.ts`
- `h5-video-tool/src/api/editorCreative.ts`
- `h5-video-tool/src/i18n/messages.ts`
- `h5-video-tool-api/src/index.ts`
- `h5-video-tool-api/src/routes/campaignKnowledge.ts`
- `h5-video-tool-api/src/services/campaignKnowledgeDerivation.ts`
- `h5-video-tool-api/src/services/campaignKnowledgeStore.ts`
- `h5-video-tool-api/src/services/editorCreativeBrief.ts`

## 10) Delivery Artifacts

- Product/technical design: `docs/plans/2026-05-07-campaign-to-distribution-handoff-mvp-design.md`
- Run artifacts:
  - `SESSION-ANCHOR.md`
  - `planner-spec.md`
  - `challenger-review.md`
  - `builder-report.md`
  - `verifier-report.md`
  - `release-decision.md`
  - `eval-result.json`
- Code changes after Gate 1 approval:
  - campaign package contract/helper
  - campaign distribution backend route/service
  - Campaign Creative package CTA/panel
  - Distribution package intake UI
  - targeted tests
- Test evidence after implementation:
  - targeted backend tests
  - targeted frontend tests
  - backend build
  - frontend build
  - workflow guard build/verify/release
  - staging/prod smoke if released

## 11) Exit Rule

- Stop and re-confirm if implementation requires touching AGENTS.md forbidden files.
- Stop and re-confirm if the MVP needs real social auto-publish, scheduling, analytics, or a standalone approval workflow.
- Stop and re-confirm if broad `EditorWorkbench` decomposition becomes necessary to complete the handoff.
- Stop and re-confirm before prod release if staging verification is not clean.
