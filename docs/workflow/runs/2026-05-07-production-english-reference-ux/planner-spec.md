# PlannerSpec - 2026-05-07-production-english-reference-ux

## 1) Project Goal
- Business goal: Audit and fix English-mode reference-image pairing UX and nearby storyboard prompt issues in Advanced Production.
- User value: English-mode operators can trust the multimodal reference panel without deciphering Chinese-only copy or false "not injected" warnings.
- Success metrics: English UI copy appears for the reference panel, valid English references inject @图片n into the prompt, nearby fallback reference tags are localized, and focused regression tests pass.

## 2) Scope
### In Scope
- Advanced Production storyboard multimodal reference panel copy and status labels.
- Frontend reference-pack matching/injection logic for English character and scene names.
- Passing content locale into multimodal prompt suffix generation where needed.
- Localizing the direct storyboard header fallback tag for English UI.
- Focused tests for partial English name injection and localized context copy.

### Out of Scope
- Backend provider service changes.
- New prompt-generation model behavior outside the multimodal reference-pack wrapper.
- Full-page visual redesign.
- Existing unrelated local daily report or agent skill files.

## 3) Module Breakdown
- Reference-pack builder:
  - Responsibilities: Pick reference images, compute stable labels, generate @图片n mapping text, and inject image tokens into the narrative.
  - Dependencies: `ProductionShot`, character/scene/prop sheets, manual overrides.
- Multimodal reference panel:
  - Responsibilities: Render selected references, injection status, manual overrides, and editable prompt preview in the active UI language.
  - Dependencies: `useLocale`, `extractAtImageContext`, `characterMentionedInShotBlob`.
- Production wizard integration:
  - Responsibilities: Pass current content locale into pack generation for preview and submit-time payloads.
  - Dependencies: `LocaleContext`, current shot/project assets.
- Storyboard header reference tags:
  - Responsibilities: Avoid Chinese fallback tags in English UI when no scene sheet matches.
  - Dependencies: `computeShotRefTags`, `StepStoryboardWorkspace`.

## 4) Technical Approach
- Architecture decisions: Keep the behavior in frontend studio helpers; do not touch backend provider service files. Reuse the existing `uiLocale/contentLocale` split.
- Data flow: `ProductionWizard` provides content locale to `buildShotMultimodalRefPackAsync`; the pack builder generates localized labels/suffixes and richer injection aliases; `StepStoryboardMultimodalRefPanel` renders UI copy from `uiLocale`; `StepStoryboardWorkspace` passes `uiLocale` to direct header tag rendering.
- API or interface changes: Add optional locale arguments to frontend helper functions only, preserving default Chinese behavior for existing callers.
- Migration or compatibility notes: Existing projects with saved manual overrides continue to work because the persisted shape does not change.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Over-broad name aliases | Common words like "Mexican" match multiple references | Multiple @图片 tags may stack on the same word | Use unique aliases per reference and ignore ambiguous shared aliases | Builder |
| Provider token compatibility | English UI might tempt changing `@图片n` tokens | Dreamina multimodal references could break | Keep provider prompt tokens as `@图片n`; only localize UI explanation | Builder |
| Scope creep | Nearby storyboard UI has many hard-coded strings | Large risky refactor | Fix only the multimodal reference panel, direct prompt-pack output, submit prompt path, and the raw scene fallback tag flagged by audit | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | English-mode reference panel uses English copy for headings, warnings, controls, and prompt-help text | Component review and build | No Chinese-only operational copy remains in `StepStoryboardMultimodalRefPanel` when `uiLocale === 'en'` |
| AC-02 | Valid English references inject @图片n when selected by partial name/role or scene phrase | `productionMultimodalRefs.test.ts` | Test shows `Mexican Gaming Son`, `Mexican Father`, and `Toothbrush Aisle` inject without false missing warnings |
| AC-03 | Prompt mapping suffix follows content locale while preserving provider tokens | `productionMultimodalRefs.test.ts` | English content uses English mapping prose but keeps `@图片1` token names |
| AC-04 | English storyboard header fallback uses `@scene:<sceneRef>` rather than `@场景:<sceneRef>` | `productionMultimodalRefs.test.ts` | Fallback tag test passes for `uiLocale === 'en'` |
| AC-05 | No backend forbidden service files are changed | `git status` and workflow guard | Changed paths stay within SESSION-ANCHOR editable scope |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | English shot text with partial character names and scene wording receives @图片 tags. |
| Edge cases | Shared adjective tokens across multiple references do not stack tags on one word. |
| Error path | Missing reference images still show localized guidance. |
| Regression | Existing Chinese default helper output remains available for callers without locale arguments; English fallback tags do not affect Chinese UI. |
| Stress/Stability | Build/typecheck confirms helper signature changes do not break callers. |

## 8) Delivery Artifacts
- Code changes: frontend reference helper, reference panel, production wizard integration, focused tests.
- Test evidence: Node tests for multimodal references, existing focused storyboard tests, frontend build, backend typecheck.
- Documents to update: run artifacts and `PRODUCT.md`.
