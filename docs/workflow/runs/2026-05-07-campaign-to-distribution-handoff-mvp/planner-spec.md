# Planner Spec - 2026-05-07-campaign-to-distribution-handoff-mvp

## North Star

> `Campaign Creative Agent` must start from a campaign mission, generate a brief with the backend-routed Gold and Glory Brain, produce usable creative variants, and send approved work into distribution without forcing marketers through a professional editor.

This run is in scope only if it shortens the marketer path from `Campaign Creative` to `Distribution` while preserving the existing advanced Editor path.

## 1) Project Goal

- Business goal: create the MVP handoff from a confirmed mission-first Campaign Creative variant to a pending distribution package.
- User value: marketers can move from strategy selection to publish preparation without entering the heavy Editor by default.
- Product outcome: GOBS starts behaving like a campaign operations workspace instead of a video-tool collection.
- Success metrics:
  - A confirmed generated brief plus selected/recommended campaign variant can become a pending distribution package.
  - The package carries mission/brief snapshot, CTA, copy, asset references, risk notes, and backend-routed knowledge context.
  - Distribution can load the package and prefill publish-facing fields.
  - Existing Campaign Creative -> Editor handoff remains available and compatible.

## 2) Background

- Landed mainline now supports mission-first Campaign Creative: `mission -> POST /api/campaign-creative/mission-brief -> generated brief review -> System Plan / Variant Pack -> Editor knowledge handoff`.
- Gold and Glory Brain routing is backend-owned; the default marketer path must not reintroduce a user-facing Knowledge Brain pack selector or multi-project brain chooser.
- OpenClaw's product review identified the biggest user-facing gap as `Campaign Creative -> Editor`断裂：运营完成策略后被带入过重的剪辑器。
- OpenClaw's code review identified `EditorWorkbench` size, API fragmentation, and backend service flattening as engineering drag, but those should be absorbed only where they support the business chain.
- Current `docs/TASK-INDEX.md` sets the next mainline direction as `Campaign Creative -> Distribution Handoff MVP`.
- Upstream design for this run: `docs/plans/2026-05-07-campaign-to-distribution-handoff-mvp-design.md`.

## 3) Scope

### In Scope

- Create a distribution package data contract that can be derived from the confirmed generated brief, selected/recommended variant, and routed knowledge context.
- Add backend package persistence/read/update seams for pending campaign distribution packages, filtered by current authenticated user.
- Add a Campaign Creative UI action that creates a pending package only after generated brief confirmation and selected/recommended variant availability.
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
- Reintroducing user-facing Knowledge Brain selection, multi-project/brain selection, or the old expert brief form as the default Campaign Creative path.

## 4) Module Breakdown

### 4.1 Shared Package Contract

- Responsibilities:
  - Define `CampaignDistributionPackage`.
  - Normalize confirmed generated brief + selected/recommended variant + asset references + routed knowledge context into a stable package payload.
  - Preserve a compact campaign snapshot: mission, brief id/objective when available, mode, generation source, and warnings.
  - Include server-owned `ownerId`, `createdBy`, and `updatedBy` fields; these are populated from the authenticated user, not trusted from the client body.
  - Split `review.status` from `assetReadiness.state`; `needs_asset` belongs only to asset readiness.
  - Keep brief-only / missing-asset fallback honest.
- Likely frontend files:
  - `h5-video-tool/src/components/campaign/distributionPackage.ts`
  - `h5-video-tool/src/components/campaign/model.ts`
- Likely backend files:
  - `h5-video-tool-api/src/services/campaignDistributionPackage.ts`

### 4.2 Backend Package API

- Responsibilities:
  - Create, list, read, and update pending distribution packages.
  - Enforce current-user ownership on list/read/update; packages owned by other users must not be returned or mutated.
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
  - Gate the action behind generated brief confirmation or an equivalent confirmed brief snapshot.
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
  - Show explicit `needs_asset` next actions, such as selecting an asset from the asset library, generating a video in Quick Film, or fine-tuning in Editor.
  - Use a `package -> distribute draft adapter` instead of scattering package-field mapping across `TabDistribute`.
  - If direct `TabDistribute` integration needs more than roughly 100-150 changed lines or touches unrelated publish/account logic, stop and split to a smaller `Pending Packages` entry/panel first.
- Likely files:
  - `h5-video-tool/src/pages/TabDistribute.tsx`
  - `h5-video-tool/src/components/distribution/PendingDistributionPackages.tsx`
  - `h5-video-tool/src/components/distribution/packageToDistributeDraft.ts`
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
  - Store V1 packages in the existing `assetDb.ts` better-sqlite3 database, not localStorage or ad hoc JSON files.
  - Use a `campaign_distribution_packages` table with indexed owner/status/time columns and a `payload_json` column for the full package body.
  - Treat Editor as an advanced path; do not route the default marketer flow through `EditorWorkbench`.
  - Define package-level asset readiness as `publishable | needs_asset | generating | failed`; do not add `needs_asset` to review status.
- Data flow:
  1. Campaign Creative has mission, confirmed generated brief, strategy, selected/recommended variant, routed knowledge pack ids, and derived knowledge context.
  2. User creates a distribution package.
  3. Backend persists a package with `draft` or `needs_review` state.
  4. UI navigates or links to Distribution with the package id.
  5. Distribution loads package, runs the package-to-draft adapter, prefills copy/CTA/platform hints/asset reference, and asks user to choose accounts explicitly.
- Package-to-draft adapter mapping:
  - Asset priority: `assetReadiness.publishableAsset.path` > `assetReadiness.publishableAsset.url` > first `assets[]` item with `status='ready'` and server-resolvable identity.
  - Copy priority: `copy.caption` + `copy.hashtags` become the initial platform copy draft; no generated platform card may silently override them.
  - Campaign context: `variant.angle`, `variant.hook`, `variant.cta`, `publishIntent.platforms`, `publishIntent.markets`, and `knowledgeContext` become distribution `campaignContext`.
  - Safety fallback: if `assetReadiness.state !== 'publishable'`, prefill copy/CTA/context only and keep publish disabled.
  - Needs-asset guidance: when safety fallback is active, show next actions for asset-library selection, Quick Film generation, or Editor fine-tuning.
- API or interface changes:
  - New campaign distribution package endpoints.
  - New frontend API wrapper for package calls.
  - Optional route/query contract for Distribution package intake, such as `/distribute?package=<id>`.
- Migration or compatibility notes:
  - Current mission-first Campaign Creative behavior must remain intact: mission composer first, generated brief review second, no main-flow pack selector.
  - Existing Campaign Creative -> Editor handoff must continue to work.
  - Existing Distribution flow from current create-flow asset must continue to work.
  - Missing package support should degrade to current Distribution behavior.

## 6) Risks

| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Scope creep | Builder tries to add approval, scheduling, analytics, and package handoff together | Delays and regressions | Hard-scope this run to package creation/intake only | Orchestrator |
| Mission-first regression | Builder starts from old `brief + selected knowledge packs` assumptions | Reintroduces the cluttered expert console and weakens the marketer-first path | Treat mission/generated brief as the only default package source; knowledge packs are backend-routed | Builder |
| Editor regression | Broad edits in `EditorWorkbench` affect timeline/export/apply behavior | Breaks advanced users | Only touch shared handoff helper if strictly necessary; no timeline/export changes | Builder |
| Knowledge schema drift | New package invents duplicate knowledge fields | Future writeback becomes brittle | Reuse existing knowledge-context names and tests | Builder |
| Publish safety regression | Package prefill accidentally publishes or auto-selects accounts | Real account risk | Account selection remains explicit; publish disabled without user confirmation | Builder |
| Cross-user leakage | Package list/read/update does not filter by current user | Exposes campaign strategy, asset paths, and knowledge context | Populate owner from auth context and test user isolation | Builder |
| Asset readiness ambiguity | Builder treats any URL/path as publishable | Broken publish payloads or accidental publish with local/transient assets | Centralize `assetReadiness` and adapter priority rules | Builder |
| Distribution over-integration | Builder tries to deeply rewire `TabDistribute` to accept packages | Regression in existing account/caption/publish flow | Use a 100-150 LOC integration budget; split to `Pending Packages` entry if exceeded | Builder |
| Fake dashboard temptation | Home/dashboard work begins before data exists | Misleading product surface | Dashboard is out of scope until packages generate real pending states | Planner |
| Persistence over-design | V1 package storage expands beyond one SQLite table/repository facade | Scope blow-up | Use existing `assetDb.ts`; add only the package table and focused indexes | Builder |

## 7) Acceptance Criteria

| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Campaign Creative can create a package from a confirmed mission-first brief and selected/recommended variant | Frontend integration test + manual check | After generated brief confirmation, clicking the new action calls the package API with mission/brief snapshot, variant, CTA, copy, asset references, risk notes, routed knowledge context, and asset readiness, then shows a success confirmation or route to Distribution |
| AC-02 | Backend persists and returns package records safely | Backend unit/seam tests | Create/list/read/update tests pass for ready-asset, missing-asset, partial-knowledge payloads, and malformed payload rejection |
| AC-03 | Package ownership is enforced | Backend auth/ownership seam tests | `ownerId/createdBy` are populated from the authenticated user, and user B cannot list/read/update user A's package |
| AC-04 | Distribution can intake a package through an adapter | Frontend integration test + adapter unit test | Opening Distribution with package id or package selection runs package-to-draft mapping and prefills asset/copy/CTA/platform hints/campaignContext, or falls back to a smaller Pending Packages panel if broad TabDistribute changes are required |
| AC-05 | Publish remains explicit and safe | Frontend regression test | No accounts are auto-selected because of package intake; direct publish is blocked unless `assetReadiness.state === 'publishable'` |
| AC-06 | Asset readiness is not review status | Backend/frontend unit tests | `needs_asset` appears only under `assetReadiness.state`; `review.status` remains limited to `draft/needs_review/approved/ready_to_distribute/rejected`; the UI shows at least two next-action options when asset is missing |
| AC-07 | Existing Editor handoff remains compatible | Existing editor handoff tests + targeted regression | `Open/Fine-tune in Editor` still carries knowledge-aware brief payload |
| AC-08 | The MVP stays within product truth | Docs review + UI test | No fake analytics, no fake publish performance, no hidden unfinished Platform modules exposed |
| AC-09 | Documentation and release evidence stay complete | Workflow guard + file review | Design doc, run docs, `PRODUCT.md`, and `CHANGELOG.md` are updated before release |
| AC-10 | Mission-first Campaign Creative remains the default UX | Frontend source test + browser check | The default Campaign page still starts with mission composer/generated brief review and does not render a Knowledge Brain pack selector, multi-project brain chooser, or blank expert brief form as the default path |

## 8) Test Matrix

| Category | Cases |
|---|---|
| Happy path | Mission -> generated brief review -> confirm -> Variant Pack -> selected/recommended variant with ready asset creates package; Distribution opens package and prefills fields. |
| Edge cases | No selected variant uses system-recommended variant; no ready asset creates `review.status='draft'` plus `assetReadiness.state='needs_asset'` without publish CTA. |
| Knowledge path | Backend-routed knowledge pack ids and structured context survive package creation and readback; no user-selected pack list is required. |
| Ownership path | User A's package is invisible and immutable to user B. |
| Adapter path | Package-to-draft adapter maps publishable path/url, copy, CTA, platforms, markets, and knowledge context deterministically. |
| Needs-asset guidance | Caption-only or missing-asset package shows next actions and does not imply it is publish-ready. |
| Storage path | SQLite table creation and indexed owner/status/time queries work through the package repository facade. |
| Error path | Package API validation rejects malformed payloads; frontend shows recoverable error. |
| Publish safety | Package intake does not auto-select accounts and does not bypass final publish confirmation. |
| Regression | Existing Campaign Creative mission-first strategy/variant flow and Editor knowledge handoff tests still pass; default Campaign page does not render old pack selector/project chooser. |
| Build | Frontend and backend production builds pass. |

## 9) Source Files To Inspect First

- `docs/plans/2026-05-07-campaign-to-distribution-handoff-mvp-design.md`
- `h5-video-tool/src/api/campaignCreative.ts`
- `h5-video-tool/src/components/campaign/MissionComposer.tsx`
- `h5-video-tool/src/components/campaign/GeneratedBriefReview.tsx`
- `h5-video-tool/src/components/campaign/model.ts`
- `h5-video-tool/src/pages/CampaignCreative.tsx`
- `h5-video-tool/src/pages/TabDistribute.tsx`
- `h5-video-tool/src/api/client.ts`
- `h5-video-tool/src/api/campaignKnowledge.ts`
- `h5-video-tool/src/api/editorCreative.ts`
- `h5-video-tool/src/i18n/messages.ts`
- `h5-video-tool-api/src/index.ts`
- `h5-video-tool-api/src/db/assetDb.ts`
- `h5-video-tool-api/src/routes/campaignCreative.ts`
- `h5-video-tool-api/src/services/campaignMissionBrief.ts`
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
- Stop and re-confirm if implementation would reintroduce the main-flow Knowledge Brain selector, multi-project brain chooser, or old expert brief form.
- Stop and re-confirm if the MVP needs real social auto-publish, scheduling, analytics, or a standalone approval workflow.
- Stop and re-confirm if broad `EditorWorkbench` decomposition becomes necessary to complete the handoff.
- Stop and re-confirm before prod release if staging verification is not clean.
