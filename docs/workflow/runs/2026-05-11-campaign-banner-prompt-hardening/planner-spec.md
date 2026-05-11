# PlannerSpec - 2026-05-11-campaign-banner-prompt-hardening

## 1) Project Goal
- Business goal: Implement comprehensive optimization Run B3 by hardening Campaign Banner prompt output into a structured template-ready artifact that can be saved and carried into Distribution Package context without adding preview or image publishing.
- User value: Reduce operator involvement while improving delivery stability.
- Success metrics: Fewer scope collisions, faster run setup, and repeatable pre-release checks.

## 2) Scope
### In Scope
- Structured Banner prompt generation from existing Campaign Output Plan Banner items, selected source asset IDs, copy fields, specs, strategy signals, forbidden claims, and knowledge citations.
- Persisted `bannerPromptContext` metadata on `ProducedOutputDraft`, including `template_ready` classification, source/spec lineage, asset-fit warnings, and copy snapshot.
- Backend Output Plan validation/round-trip support for `bannerDetails` and `bannerPromptContext` without changing persisted production item enums.
- Campaign Output Workbench readiness summary that separates direct/auto text coverage from template-ready Banner prompt coverage.
- Distribution Package handoff wording that keeps Banner prompt context non-publishable until a final image is rendered elsewhere.
- Focused frontend/API tests plus production builds.

### Out of Scope
- Banner template preview, canvas, drag/drop layers, design editor, or rendered image thumbnail.
- Provider/image generation calls or any real publish path for Banner prompts.
- Asset Library DB/routes/schema work, Drive import work, or team permission changes.
- Replacement of `ProductionCapability`, `ProductionItemType`, or existing Output Plan rows.
- Deployment to staging/prod from this Dev Worker window.

## 3) Module Breakdown
- Banner prompt builder:
  - Responsibilities: Build deterministic structured prompt text and readiness context from existing Banner details.
  - Dependencies: `outputPlan.ts` types, Campaign strategy/brief signals, knowledge references.
- Coverage view model:
  - Responsibilities: Map existing capabilities to UI readiness buckets without changing persisted enums.
  - Dependencies: Campaign Output Plan items.
- Workbench display:
  - Responsibilities: Show Direct/Template readiness counts and Banner prompt metadata/warnings.
  - Dependencies: `CampaignOutputWorkbench.tsx`, `BannerOutputCard.tsx`, i18n copy.
- Output Plan persistence:
  - Responsibilities: Round-trip Banner item details and produced prompt context through backend validation.
  - Dependencies: `h5-video-tool-api/src/services/campaignOutputPlan.ts`.
- Distribution context:
  - Responsibilities: Carry Banner prompt as non-publishable package context with honest readiness reason.
  - Dependencies: `distributionPackage.ts`.

## 4) Technical Approach
- Architecture decisions: Add pure frontend helpers for prompt/readiness logic so behavior is testable without React rendering or provider calls.
- Data flow: Existing Banner `ProductionItem.bannerDetails` -> `buildStructuredBannerPrompt` -> `ProducedOutputDraft.bannerPromptContext` -> backend normalized payload -> Workbench/Distribution context.
- API or interface changes: Existing Output Plan payload accepts two additive optional fields: `ProductionItem.bannerDetails` and `ProducedOutputDraft.bannerPromptContext`.
- Migration or compatibility notes: Existing plans without these optional fields continue to validate; old Banner prompt outputs remain valid.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Banner hardening drifts into designer | Adding preview/layout controls | Scope and test burden explode | Only prompt text/context and metadata; preview explicitly out of scope | Builder |
| Coverage metric inflation | Banner prompt counted as direct/auto output | Misleading product readiness | Dedicated view model maps Banner to `template_ready` only | Builder |
| Backend strips Banner fields | Normalizer omits additive fields | Saved plans lose selected source assets or context | Add round-trip tests for `bannerDetails` and `bannerPromptContext` | Builder |
| Distribution publishes a prompt as media | Package treats prompt as publishable image | Operators may think final asset is ready | Keep `assetReadiness.state = generating` and reason requires final render/export | Builder |
| Dirty worktree | Existing unrelated plan edit remains | Accidental staging | Stage only B3-owned files; record warning | Integrator |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Banner item with selected main visual and logo generates structured prompt sections. | `bannerPrompt.test.ts` and production adapter test. | Prompt includes objective, format list, asset IDs, copy lock, composition rules, forbidden claims, checklist. |
| AC-02 | Produced Banner output saves context as `template_ready`. | Frontend adapter test and backend round-trip test. | `bannerPromptContext.readiness`, `specIds`, `sourceAssetIds`, `copy`, and warnings persist. |
| AC-03 | Workbench separates Direct and Template coverage. | `outputCoverageViewModel.test.ts` plus source build. | Banner prompt-only contributes to `templateReady`, not `directReady`. |
| AC-04 | Distribution Package carries Banner prompt only as non-publishable context. | `campaignDistributionPackage.test.ts`. | Asset readiness remains `generating`, reason mentions template prompt/final render, no publishable asset is produced. |
| AC-05 | No forbidden/deploy paths touched. | Workflow guard + git diff review. | Guard passes or only warns for unrelated pre-existing dirty file; no deploy commands run. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Banner with key art + logo produces `template_ready` structured prompt and Distribution context. |
| Edge cases | Missing logo/main visual emits warnings and does not claim auto/final readiness. |
| Error path | Backend rejects invalid `bannerPromptContext.readiness` or unsafe asset/spec ids. |
| Regression | Existing text output kinds and Distribution copy preference remain unchanged. |
| Stress/Stability | Multi-spec Banner prompt handles all 1:1 / 4:5 / 9:16 / 16:9 specs without provider calls. |

## 8) Delivery Artifacts
- Code changes: Banner prompt helper, coverage view model, Workbench UI labels, Output Plan/Distribution metadata, API normalizer.
- Test evidence: targeted node tests, API route test, frontend/API `npm run build`, workflow guard.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`.
