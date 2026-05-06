# PlannerSpec - 2026-05-06-campaign-creative-knowledge-consumption

## 1) Project Goal
- Business goal: Make Campaign Creative knowledge-aware by selecting knowledge packs, deriving structured context, and using it in strategy generation.
- User value: Let operators reuse imported game knowledge instead of restating tone, market truths, and compliance constraints every time they write a campaign brief.
- Success metrics:
  - The Campaign Creative page can read current-game knowledge packs and show a visible selected-pack state.
  - Generated strategies surface knowledge-driven fields such as market truth, tone rules, forbidden claims, and visual cues.
  - With zero selected packs, strategy generation still behaves like the current heuristic-only flow and does not break the variant pack path.

## 2) Scope
### In Scope
- Campaign Creative page integration with the existing Knowledge Brain context and current selected game.
- A lightweight knowledge selector UI for choosing which packs feed strategy generation.
- Strategy-builder changes so `derive-context` output enriches the generated strategy object and visible strategy card.
- Variant-pack generation compatibility after the strategy object gains knowledge-driven fields.
- Targeted tests, run artifacts, and product/changelog updates for this slice.

### Out of Scope
- Editor handoff payload changes
- Editor prompt or memory injection changes
- Backend campaign knowledge storage/import/derive contract changes
- Persistent custom game registry or non-seeded game support
- New deployment automation behavior

## 3) Module Breakdown
- Campaign Creative page:
  - Responsibilities: Load current-game knowledge packs, manage selected pack ids, and request enriched strategy generation.
  - Dependencies: `PlatformMemoryContext`, `campaignKnowledge` API helpers, `CampaignStrategyCard`.
- Knowledge selector UI:
  - Responsibilities: Show available packs, selected state, and empty/unsupported guidance without taking over the page.
  - Dependencies: `CampaignKnowledgePack` shape, locale copy.
- Strategy derivation:
  - Responsibilities: Convert `DerivedCampaignKnowledgeContext` into richer strategy fields while preserving existing tuning and variant-pack behavior.
  - Dependencies: `strategy.ts`, `model.ts`, existing variant-pack builder.
- Verification/docs:
  - Responsibilities: Guard scope, record builder/verifier evidence, and keep product history current.
  - Dependencies: workflow run artifacts, `PRODUCT.md`, `CHANGELOG.md`.

## 4) Technical Approach
- Architecture decisions:
  - Reuse the existing frontend `deriveKnowledgeContext(gameId, selectedPackIds)` API instead of duplicating knowledge reduction logic in the page.
  - Keep selected pack ids page-local for this run so we do not widen `PlatformMemoryContext` again unless the selection state needs cross-page reuse later.
  - Extend `CampaignCreativeStrategy` with additive knowledge-driven fields rather than replacing existing hook/tone/CTA tuning fields.
  - Keep the no-pack path purely local and synchronous so the page still works when no knowledge packs exist or the selected game is unsupported.
- Data flow:
  - Campaign Creative reads `selectedGameId`, `knowledgePacks`, `knowledgeLoading`, and `knowledgeGameSupported` from `PlatformMemoryContext`.
  - User selects zero or more packs in the new selector panel.
  - On generate, the page builds the brief as before.
  - If supported game + selected packs are present, the page calls `derive-context` and passes the returned structure into `buildStrategyFromBrief`.
  - The strategy card and variant-pack builder consume the enriched strategy object.
- API or interface changes:
  - No new backend routes.
  - Extend frontend `CampaignCreativeStrategy` to include:
    - `knowledgePackIds`
    - `marketTruth`
    - `audienceTension`
    - `toneRules`
    - `forbiddenClaims`
    - `visualCues`
    - `approvedAngles`
    - `hookCandidates`
- Migration or compatibility notes:
  - Existing session handoff should tolerate additive strategy fields.
  - Unsupported or ad-hoc games should show guidance instead of an error state.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Async derivation slows page flow | `derive-context` adds network latency before strategy appears | Feels slower or flaky compared with the current local-only path | Only call derive when there are selected packs; otherwise keep current local path | Builder |
| Knowledge fields overwhelm the strategy card | Too many new sections make the page noisy | Operators ignore the extra knowledge instead of trusting it | Show only the highest-signal knowledge outputs and group them clearly | Builder |
| Variant-pack drift | New strategy fields accidentally change existing variant differentiation behavior | Regression in the downstream creative compare flow | Keep variant-pack generation additive and cover it with a targeted test | Builder |
| Unsupported game confusion | Selected game is ad-hoc and has no persisted knowledge | User thinks the feature is broken | Render explicit unsupported guidance and preserve the fallback strategy path | Builder |
| Product history drift | Feature ships without product/changelog updates | Lost traceability for this slice | Update `PRODUCT.md` and `CHANGELOG.md` before verify/release | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Campaign Creative can show current-game knowledge packs and let the operator select which packs feed strategy generation. | Frontend render test plus manual page inspection | The page renders a knowledge selector with pack summaries for supported games, shows explicit guidance for unsupported games, and keeps a stable selected-pack state. |
| AC-02 | Strategy generation enriches the strategy object with derived knowledge context when packs are selected. | Targeted strategy test plus manual generate flow | The generated strategy includes additive knowledge-driven fields and the strategy card shows them without breaking existing hook/tone/CTA fields. |
| AC-03 | When no packs are selected or no supported game is present, Campaign Creative still behaves like the previous local heuristic flow. | Targeted strategy fallback test plus frontend build | Strategy generation completes without API dependency in the zero-pack case and variant-pack generation still succeeds. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Supported game with imported packs selected -> generate strategy -> strategy card shows knowledge-driven outputs. |
| Edge cases | No packs selected; unsupported game selected; selected pack ids become stale after list refresh. |
| Error path | `derive-context` request fails; page should keep the previous strategy untouched or show a recoverable error instead of crashing. |
| Regression | Existing strategy tuning and variant-pack generation still work with additive knowledge fields. |
| Stress/Stability | Re-generating strategy after repeated tuning changes does not accumulate duplicate knowledge arrays or break stable ids. |

## 8) Delivery Artifacts
- Code changes: Campaign Creative page/card/model/strategy updates, selector component, i18n copy, targeted tests, run docs.
- Test evidence:
  - `h5-video-tool` targeted test(s) for knowledge-aware strategy generation
  - `cd h5-video-tool && npm run build`
  - `cd h5-video-tool-api && npx tsc --noEmit`
  - workflow guard build/verify/release checks
  - `bash scripts/eval.sh 2026-05-06-campaign-creative-knowledge-consumption`
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
