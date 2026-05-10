# PlannerSpec - 2026-05-10-banner-output-mvp

## 1) Project Goal
- Business goal: Make Banner/static ads a formal Campaign Output, so marketers can plan, prepare source assets, produce a first placeholder prompt, review quality, and send the item into distribution prep.
- User value: A user can see Banner requirements beside video/copy outputs, select reusable Asset Library images, generate a structured Banner prompt placeholder, mark it with the shared quality states, and create a non-publishable distribution package context for final rendering.
- Success metrics: Banner output plan items are generated deterministically, source assets use Asset Library IDs, produced placeholder outputs persist, quality marking persists, and distribution packages honestly show the Banner still needs a final image before publishing.

## 2) Scope
### In Scope
- Define first Banner specs:
  - `square_1_1`
  - `portrait_4_5`
  - `story_9_16`
  - `landscape_16_9`
- Extend frontend output-plan types and helpers so Banner items carry specs, short copy, CTA, selected/main visual asset IDs, and produced prompt placeholder metadata.
- Extend Asset Library source matching to use Run 1 team categories where available.
- Add a focused `BannerOutputCard` inside `CampaignOutputWorkbench`.
- Generate deterministic Banner prompt placeholder outputs during confirm production when source assets are available.
- Persist produced Banner placeholders and optional quality status through the existing campaign output plan service validator.
- Let operators mark produced Banner outputs with Run 0 `CreativeQualityStatus`.
- Map produced Banner placeholders into distribution package context as `generating`/not-yet-publishable image assets.
- Update tests, run docs, product docs, and changelog.

### Out of Scope
- Real image generation or Imagen/Compass calls.
- Full graphic editor, layers, cropping, text placement controls, or downloadable final images.
- Campaign output route rewrites.
- Distribution package route rewrites.
- Platform publish behavior changes.
- Run 4 next-version feedback generation.
- Any staging/prod deployment from this Dev Worker window.

## 3) Module Breakdown
- Campaign output plan model:
  - Responsibilities: Banner spec vocabulary, source requirements, prompt placeholder output, quality marking helper.
  - Dependencies: Run 0 quality status and Run 1 Asset Library category metadata.
- Campaign Output Workbench UI:
  - Responsibilities: display Banner target specs, main visual/source assets, prompt placeholder, and quality marking controls.
  - Dependencies: existing Workbench layout and AssetPicker callbacks.
- Distribution package helper:
  - Responsibilities: convert produced Banner placeholder into package context while keeping publishability honest.
  - Dependencies: existing `CampaignDistributionPackage` shape.
- Backend campaign output plan service:
  - Responsibilities: validate and persist new produced-output kind and quality status without route changes.
  - Dependencies: existing owner-scoped campaign output plan API.

## 4) Technical Approach
- Keep Banner production deterministic and local: produce a structured text prompt/placeholder only.
- Store Banner placeholder outputs in `producedOutputs` with a new `banner_prompt` kind.
- Add optional `qualityStatus` to produced outputs using Run 0 values only.
- Keep backend API paths unchanged and only broaden the existing validator so saved plans round-trip Banner placeholder data.
- Prefer existing source requirements and AssetPicker flow for source image selection.
- Keep distribution packages non-publishable for placeholder Banner outputs by using `assetReadiness.state = generating` and a clear reason.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Accidental claim of publishable image | Placeholder prompt treated as final image | Operators may publish an unfinished asset | Distribution package marks Banner placeholder as `generating`, not `publishable` | Builder |
| Route conflict | Editing campaign output/distribution routes while release window works | Multi-window merge risk | Keep routes read-only; change service validator/helper only | Builder |
| Banner scope creep | Adding real image generation/editor controls | Run gets too large and touches protected services | Stop at prompt placeholder and quality mark | Window A |
| Quality state drift | Banner uses custom labels | Run 4 cannot reuse reviews | Import/use Run 0 `CreativeQualityStatus` only | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Output plan can include Banner items with first four specs. | Frontend output plan tests | Banner item exposes `bannerDetails.specs` with all four spec IDs. |
| AC-02 | User can select Asset Library image IDs for Banner source/main visual. | Source asset mapping tests + Workbench source test | Run 1 `team_category`/`reuse_category` image assets map to `key_art`, `game_logo`, or `event_banner`; Workbench still routes to AssetPicker. |
| AC-03 | Confirm production creates Banner prompt placeholder output. | Production adapter tests + backend persistence tests | Ready Banner item becomes `produced` with `banner_prompt` output and output ID. |
| AC-04 | User can mark produced Banner quality using three shared states. | Helper/UI source tests + backend persistence tests | `usable`, `needs_fix`, and `unusable` round-trip as `qualityStatus`; invalid values reject. |
| AC-05 | Banner can enter distribution package context without claiming final publishability. | Distribution package tests | Package includes image asset context and `assetReadiness.state = generating`, not `publishable`. |
| AC-06 | Existing video/copy outputs remain unaffected. | Existing targeted tests and builds | Copy generation, source selection, Studio handoff, and package helper tests still pass. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Banner plan with selected key art/logo produces a prompt placeholder and can be marked `usable`. |
| Edge cases | Run 1 team categories map into source asset candidates; missing assets keep Banner blocked. |
| Empty state | No produced Banner output shows the card as planned/blocked with source guidance. |
| Error path | Invalid produced output kind or invalid quality status is rejected by backend validator. |
| Regression | Text/post output production and Studio video handoff stay unchanged. |
| Race/Concurrency | No campaign output route or distribution route files changed; deployment remains separate. |

## 8) Delivery Artifacts
- Frontend:
  - `h5-video-tool/src/components/campaign/outputPlan.ts`
  - `h5-video-tool/src/components/campaign/BannerOutputCard.tsx`
  - `h5-video-tool/src/components/campaign/CampaignOutputWorkbench.tsx`
  - `h5-video-tool/src/components/campaign/distributionPackage.ts`
  - `h5-video-tool/src/pages/CampaignCreative.tsx`
- Backend:
  - `h5-video-tool-api/src/services/campaignOutputPlan.ts`
  - `h5-video-tool-api/tests/campaignOutputPlan.test.ts`
- Tests/docs:
  - targeted frontend tests
  - `docs/plans/2026-05-10-banner-output-mvp.md`
  - run artifacts, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`
