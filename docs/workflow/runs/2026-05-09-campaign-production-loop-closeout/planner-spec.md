# PlannerSpec - 2026-05-09-campaign-production-loop-closeout

## 1) Project Goal
- Business goal: Close the Campaign Creative production loop so an operator can move from a Campaign output item into Advanced Studio, generate a real video, and continue distribution from the same Campaign package without re-entering context.
- User value: A marketer sees fewer dead ends: Studio generation should update the package into a publishable state and the result page should lead back to `/distribute?package=<id>`.
- Success metrics: Stable identifiers survive Campaign -> Studio -> generation -> Result/Distribution, the package PATCH uses existing backend-safe fields, and Distribution intake sees the generated video as selected publishable media.

## 2) Scope
### In Scope
- Extend Campaign Studio handoff metadata with output plan id, production item id, optional distribution package id, and source requirement ids.
- Preserve the active Campaign handoff in `CreateFlowContext` while Studio is open.
- Add a small front-end helper that converts a Studio generation result into an existing `CampaignDistributionPackage` PATCH using only current package fields: `assets`, `assetReadiness`, and `review`.
- Call that helper from `StepVideo` when a video result becomes available and a campaign handoff package id exists.
- Route result and distribution CTAs with the active package id when available.
- Update source-level tests, run artifacts, `PRODUCT.md`, `CHANGELOG.md`, and `docs/TASK-INDEX.md`.

### Out of Scope
- Provider-level generation changes, including Dreamina/Kling/VEO/studioPipeline low-level services.
- New env vars or package schema fields that require backend migration.
- Global state library introduction.
- Scheduled publishing, approval flow, ad performance feedback, or A/B loop.
- Full output-plan server writeback if it requires expanding backend whitelist beyond existing safe fields.

## 3) Module Breakdown
- Campaign bridge helper:
  - Responsibilities: carry stable identifiers and source requirement ids in `CampaignStudioHandoffState`.
  - Dependencies: `outputPlan.ts`, CampaignCreative state.
- CampaignCreative page:
  - Responsibilities: pass current output plan id and created distribution package id into Studio handoff where available.
  - Dependencies: `buildCampaignStudioHandoff`, created output/package state.
- Studio / CreateFlow context:
  - Responsibilities: keep the campaign handoff available after React Router state is cleared.
  - Dependencies: existing `CreateFlowContext` only, no external store.
- StepVideo:
  - Responsibilities: on successful generation, persist video history, update context video result, patch linked package if present, then navigate to result with `package=<id>`.
  - Dependencies: `updateCampaignDistributionPackage`, package patch helper.
- Result / Distribution:
  - Responsibilities: continue to `/distribute?package=<id>` when the result was generated from a Campaign package.
  - Dependencies: query params and CreateFlow context.
- Tests/docs:
  - Responsibilities: prove bridge ids, package patch shape, and Result/Distribution source markers through source-level tests.

## 4) Technical Approach
- Use the existing React context as the short-lived Studio session carrier: add `campaignStudioHandoff` plus setter/clearer to `CreateFlowContext`.
- Keep Router state as the entry transport only. Once `Studio` consumes `location.state.campaignStudioHandoff`, it writes that payload into context and clears Router state to avoid duplicate asset loading.
- Avoid backend schema expansion. For linked package update, fetch the package by id, then PATCH:
  - `assets`: replace or prepend a ready video asset with `assetId=<safe task id>`, `type='video'`, `status='ready'`, and `path` or `url`.
  - `assetReadiness`: set `state='publishable'`, `primaryAssetId=<safe task id>`, and `publishableAsset { type:'video', source:'server_path' | 'verified_url', path/url }`.
  - `review`: preserve notes when available, set `status='needs_review'`.
- Sanitize generated `taskId` into a safe identifier before using it as `assetId`, because the backend package service rejects unsafe identifiers.
- Add query param `package=<id>` when navigating to `/result`, and update Result CTAs to route to `/distribute?package=<id>`.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Async job completion outside active Studio page | User leaves Studio before Dreamina/Kling async polling completes | Package might not be patched | This run covers the active-page happy path; leave durable server-side job callback for later | Planner |
| Backend drops unknown fields | Adding new package fields | Association silently lost | Use only existing package fields in PATCH | Builder |
| Unsafe `taskId` as asset id | Provider task ids contain unsupported characters | PATCH 400 | Add local safe-id sanitizer for generated asset ids | Builder |
| Duplicate package assets | User regenerates multiple times from same handoff | Distribution may show stale first asset | Patch helper replaces prior asset with same generated asset id and uses readiness primary id | Builder |
| Output plan not updated | Package gets video but output plan item still lacks outputAssetIds | Campaign Workbench may not show produced result after refresh | Accepted for this run; package/distribution continuity is P0, durable output-plan writeback is follow-up | Integrator |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Campaign Studio handoff carries stable output/package/source identifiers. | `campaignStudioBridge.test.ts` update. | Handoff includes `outputPlanId`, `productionItemId`, optional `distributionPackageId`, and `sourceAssetRequirementIds`. |
| AC-02 | Studio keeps Campaign context through generation. | Source-level tests and TypeScript build. | `CreateFlowContext` stores handoff after Router state is cleared and `StepVideo` can read it. |
| AC-03 | Studio-generated video patches linked Campaign package. | New package patch helper test. | Given `taskId/videoPath/videoUrl`, helper produces a PATCH that makes existing package publishable using existing fields only. |
| AC-04 | Result/Distribution navigation preserves package id. | Source-level presence test and manual smoke checklist. | Result page CTAs use `/distribute?package=<id>` when package id is known. |
| AC-05 | Docs and product history are updated. | Workflow guard and doc review. | Run docs, `PRODUCT.md`, `CHANGELOG.md`, and `TASK-INDEX.md` mention the closeout. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Campaign package exists -> Open in Studio -> generate sync video -> package PATCH sets publishable asset -> result CTA opens `/distribute?package=<id>`. |
| Happy path | Campaign handoff without package id still seeds Studio and generates normally without attempting package PATCH. |
| Edge case | Generated result has `videoPath`; patch uses `server_path`. |
| Edge case | Generated result only has `videoUrl`; patch uses `verified_url`. |
| Error path | Package PATCH fails; video result and history are still saved and result navigation still works. |
| Regression | Home -> Studio `autoSelectCustom` and `/studio?assetId=` flows keep working. |
| Regression | Direct Distribution package intake keeps using current `buildDistributeDraftFromPackage`. |
| Guardrail | No edits to provider services, no new env vars, no backend forbidden files. |

## 8) Delivery Artifacts
- Code changes: bridge metadata, CreateFlow context, package patch helper, StepVideo success hooks, Result package-aware CTAs, tests.
- Test evidence: targeted frontend source tests, frontend build, backend build if runtime dependencies allow, workflow guard output, `bash scripts/eval.sh 2026-05-09-campaign-production-loop-closeout`.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`.
