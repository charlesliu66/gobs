# PlannerSpec - 2026-05-09-campaign-studio-production-bridge

## 1) Project Goal
- Business goal: Turn Campaign Output Workbench from a planning/confirmation surface into a launchpad for Advanced Studio production, so market operators can move selected campaign deliverables into video creation with fewer copy/paste steps.
- User value: A marketer can review a TikTok/short-video output, open it in the right Studio mode, see the campaign brief already translated into a prompt, and reuse matched game source assets without hunting through folders.
- Success metrics: Workbench has a clear Studio action for eligible video outputs, Studio imports campaign context deterministically, and the remaining Studio quality work is visible without blocking the parallel Distribution Center run.

## 2) Scope
### In Scope
- Add a typed Campaign Output -> Advanced Studio handoff helper for eligible production items.
- Add Workbench UI action and CampaignCreative navigation state for opening eligible items in Studio.
- Let Studio read the handoff state/query, choose the target template, seed prompt/duration/aspect defaults, and import safe Asset Library references.
- Add a reusable Asset Library-backed `UnifiedAssetSelector` component and wire it into Studio creation templates as a foundation.
- Add lightweight Studio quality presets for prompt guidance only, using local bilingual labels to avoid the parallel Distribution Center i18n edit.
- Update run/product/task docs and tests for this bridge.

### Out of Scope
- Distribution Center implementation or copy cleanup; another chat owns that work.
- Provider-level backend changes for Dreamina, Kling, VEO, Studio Pipeline, production asset config/types, or any real env file.
- Shipping a new production video adapter in this run.
- Replacing all legacy Drive material picker flows; legacy flows may remain as fallback.
- Prod deployment without a later release approval gate.

## 3) Module Breakdown
- Campaign bridge helper:
  - Responsibilities: map production item type to Studio template, build prompt seed, carry matched source asset IDs.
  - Dependencies: `outputPlan.ts` types only.
- Campaign Output Workbench:
  - Responsibilities: render an additional action for eligible video items and call a parent callback.
  - Dependencies: existing copy/i18n and item cards.
- CampaignCreative page:
  - Responsibilities: build bridge payload from the current output plan and navigate to `/studio`.
  - Dependencies: React Router state and campaign plan state.
- Studio entry page:
  - Responsibilities: parse bridge state/query, preselect templates, import Asset Library references, and avoid clearing existing Home handoff behavior.
  - Dependencies: `CreateFlowContext`, `assetLibraryApi`, `TabGenerate`.
- Studio creation UI:
  - Responsibilities: expose reusable Asset Library slots and prompt quality chips without changing generation providers.
  - Dependencies: existing `AssetPicker`, `DreaminaMultimodalItem`, local bilingual copy.
- Documentation and verification:
  - Responsibilities: reflect current run status, add tests, and record release decision.
  - Dependencies: `PRODUCT.md`, `CHANGELOG.md`, run reports.

## 4) Technical Approach
- Use React Router `navigate('/studio?templateId=<id>', { state: { campaignStudioHandoff } })` instead of URL-encoding campaign payloads. The query param remains a light fallback for direct template selection.
- Import only safe Asset Library files into Studio references. Images become Dreamina multimodal items with `role` or `scene` semantic hints. Videos are used as Motion Transfer reference URLs when the selected template is Motion Transfer; otherwise they are not force-converted into hidden payloads.
- Keep `UnifiedAssetSelector` as a presentation/controller wrapper over the existing `AssetPicker`, so it inherits existing Asset Library auth, filtering, thumbnails, and usage recording.
- Quality presets append operator-readable prompt hints. They do not create new provider fields, env vars, or backend routing.
- `SESSION-ANCHOR.md` explicitly forbids Distribution Center paths. Existing dirty files in that area are treated as unrelated parallel work and must not be staged by this run.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Parallel Distribution Center conflict | This run edits distribution files or stages unrelated dirty files | Other chat loses work or commit scope becomes mixed | Mark distribution paths forbidden and verify staged paths before commit | Integrator |
| Oversized media import | Studio auto-loads video or large files into base64 | Browser memory pressure | Only auto-import images; use video URL for Motion Transfer references | Builder |
| Provider mismatch | Campaign source assets need Kling `image_list` support | Handoff appears richer than backend supports | Keep provider changes out of scope and document limitation | Planner |
| Existing Home Studio handoff regression | Campaign state overwrites `autoSelectCustom` flow | Home -> Studio quick start breaks | Campaign handoff takes priority only when present; existing state path remains | Builder |
| i18n collision | New buttons/sections need copy while another chat is editing shared messages | Merge conflict or lost Distribution work | Use local zh/en copy in touched components and avoid `messages.ts` in this run | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Eligible Campaign Output video items can open Advanced Studio from Workbench. | Unit/source test for bridge mapping and Workbench callback presence. | TikTok/short-video items expose the action; non-video text sets do not. |
| AC-02 | Studio consumes campaign handoff context. | Source test plus manual build verification. | Template, prompt, and safe reference assets are seeded without requiring manual copy/paste. |
| AC-03 | Studio has reusable Asset Library selector slots. | Component source test and frontend build. | `UnifiedAssetSelector` wraps `AssetPicker` and supports per-slot selection. |
| AC-04 | Studio quality presets are visible and append prompt guidance. | Preset module test and frontend build. | Character Showcase, Motion Transfer, and BGM mood prompts are available without backend changes. |
| AC-05 | Docs accurately describe current status and boundaries. | Run docs, `TASK-INDEX`, `PRODUCT.md`, `CHANGELOG.md` review. | Distribution Center work is explicitly parked outside this run; changelog records the bridge. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Campaign short-video item with matched character/key art opens Studio Character Showcase with seeded prompt and image references. |
| Happy path | Campaign TikTok video item opens Studio Quick Single with seeded prompt. |
| Edge case | Item has no matched source assets; Studio still opens with prompt and template. |
| Edge case | Source asset is video and target template is not Motion Transfer; handoff avoids hidden base64 import. |
| Error path | Asset Library file fetch fails; Studio shows a recoverable warning while preserving prompt/template. |
| Regression | Existing Home -> Studio `autoSelectCustom` and `/studio?assetId=` handoffs continue to work. |
| Regression | Workbench save/produce/distribution actions remain present. |
| Guardrail | No forbidden files or Distribution Center files are modified/staged by this run. |

## 8) Delivery Artifacts
- Code changes: Campaign bridge helper, Workbench action, CampaignCreative navigation, Studio handoff handling, UnifiedAssetSelector, Studio quality presets, local bilingual labels.
- Test evidence: targeted Node tests, frontend build, backend build when dependencies are available, workflow guard output, `bash scripts/eval.sh 2026-05-09-campaign-studio-production-bridge` if feasible.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`.
