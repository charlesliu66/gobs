# PlannerSpec - 2026-05-06-campaign-variant-pack-mvp

## 1) Project Goal
- Business goal: Turn one campaign strategy into a 3-variant pack with clear hook, selling-point, and CTA differences that can be handed off to Editor.
- User value: Let operators compare three testable creative directions before editing, instead of jumping from a single strategy card straight into the timeline.
- Success metrics: Variant pack is generated deterministically from brief plus strategy, differences are legible in UI, and first Editor apply receives the selected variant context without re-entry.

## 2) Scope
### In Scope
- Extend the campaign model with `CampaignCreativeVariant` and `CampaignCreativeVariantPack`.
- Generate exactly three differentiated variants from one brief plus strategy via pure logic in the campaign layer.
- Render the variant pack in `Campaign Creative`, with a clear selected variant path into Editor.
- Extend Editor handoff normalization and prompt context so the selected variant is preserved on first apply.
- Add targeted tests for variant generation and handoff normalization.
- Update run docs plus product changelog/docs required by repo workflow.

### Out of Scope
- Auto-rendering multiple complete videos from the variant pack.
- Publish/distribution execution, feedback ingestion, or performance attribution.
- New API endpoints, database storage, or backend job orchestration for variants.
- Expanding mode support beyond the existing `tiktok_content` and `tiktok_ua`.

## 3) Module Breakdown
- Campaign model and generator:
  - Responsibilities: Define variant/pack types and derive 3 variants from brief plus strategy with visible differences.
  - Dependencies: `h5-video-tool/src/components/campaign/model.ts`, `strategy.ts`.
- Campaign page presentation:
  - Responsibilities: Show the pack, variant summaries, current selection, and variant-specific Editor launch.
  - Dependencies: `CampaignCreative.tsx`, `CampaignStrategyCard.tsx`, `messages.ts`.
- Editor handoff and prompt context:
  - Responsibilities: Normalize variant payloads, preserve selected variant on first apply, and surface minimal variant context in the Agent panel.
  - Dependencies: `EditorWorkbench.tsx`, `AgentPanel.tsx`, `editorCreativeBrief.ts`, `editorCreative.ts`, backend `editorCreativeBrief.ts`, `editorAgent.ts`.
- Verification and docs:
  - Responsibilities: Cover pure generator and handoff regressions, document shipped behavior, and complete 4+1 artifacts.
  - Dependencies: test files, `PRODUCT.md`, `CHANGELOG.md`, run docs.

## 4) Technical Approach
- Architecture decisions:
  - Keep variant generation in pure campaign-layer logic rather than Editor UI so one strategy always expands into the same 3 comparison objects.
  - Reuse the existing brief/strategy handoff path and extend the payload with pack plus selected variant metadata instead of introducing a new transport.
- Data flow:
  - `CampaignBriefForm` -> `buildBriefFromForm`
  - `buildStrategyFromBrief` -> `buildVariantPackFromStrategy`
  - Selected variant -> `CampaignCreativeHandoffPayload`
  - `EditorWorkbench` normalize handoff -> `AgentPanel` preview -> first `applyEditorAgentCreativeStream` call
- API or interface changes:
  - Frontend and backend `EditorCreative*` types accept optional variant payloads.
  - No new route; existing `/api/editor/agent/apply-stream` request body expands compatibly.
- Migration or compatibility notes:
  - Legacy handoffs containing only brief plus strategy must still parse correctly.
  - If no variant exists, Editor behavior must remain unchanged.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Variant differences look cosmetic | Generator only changes labels, not underlying fields | Pack feels fake and not useful for testing | Make difference summary, opening beat, CTA, and selling-point focus vary together per variant | Builder |
| Handoff bloats or breaks compatibility | Editor expects only brief plus strategy | First apply loses context or old flows regress | Keep variant payload optional and normalize legacy payloads first | Builder |
| UI becomes too dense | Pack display copies the full strategy card three times | Comparison becomes noisy and hard to scan | Keep shared strategy above, move variant pack into concise comparable cards | Builder |
| Existing strategy tests regress | Shared generator helpers are refactored carelessly | Previously shipped strategy tuning behavior breaks | Add targeted tests and retain current strategy outputs for non-variant paths | Verifier |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | A generated strategy produces exactly one 3-item variant pack with stable pack/variant IDs and structured variant fields. | Frontend unit tests for generator logic. | Tests assert length `3`, differing hooks/focus/CTA intent, and deterministic links to `briefId` and `strategyId`. |
| AC-02 | Campaign page renders the pack as a comparable output and lets the user launch Editor from one chosen variant. | Manual UI validation plus build. | Generated pack is visible after strategy generation; selected variant state updates; launch action is variant-specific. |
| AC-03 | Editor handoff preserves brief, strategy, selected variant, and pack metadata for the first apply. | Frontend/back-end normalization tests and manual first-apply verification. | First apply request can include normalized variant context without breaking legacy brief/strategy-only requests. |
| AC-04 | Existing strategy-only behavior stays compatible. | Regression tests and successful TypeScript/build checks. | Existing tests still pass; builds succeed; no forbidden file or env change is needed. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Generate brief -> strategy -> variant pack -> choose variant -> launch Editor with handoff. |
| Edge cases | Missing audience/CTA uses defaults; legacy handoff with no variant still normalizes; selected variant remains valid after tuning refresh. |
| Error path | Invalid or partial handoff payload ignores variant gracefully instead of crashing Editor. |
| Regression | Existing strategy generation, strategy tuning, and editor creative brief tests remain green. |
| Stress/Stability | Repeated retuning regenerates the same 3-slot pack structure without leaking stale selected variant state. |

## 8) Delivery Artifacts
- Code changes: campaign model/generator/UI, Editor handoff types, tests, workflow docs, product docs.
- Test evidence: frontend unit tests, backend tests, `npm run build` for frontend, `npx tsc --noEmit` plus tests for backend, `bash scripts/eval.sh 2026-05-06-campaign-variant-pack-mvp`.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
