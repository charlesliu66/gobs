# PlannerSpec - 2026-05-11-campaign-text-production-pack

## 1) Project Goal
- Business goal: Implement comprehensive optimization Run B2: expand Campaign text outputs to structured caption, headline, CTA, hashtag, and platform post drafts without adding new ProductionItemType or real social publishing.
- User value: Let market/operators take a Campaign from brief to reusable copy candidates without hand-writing missing CTA or platform post drafts.
- Success metrics: One supported Campaign production run emits all five required text draft categories, preserves lineage/context, and feeds Distribution Package copy intake with tests.

## 2) Scope
### In Scope
- Extend `ProducedOutputKind` with `cta` and `platform_post` in frontend and backend validation.
- Add a pure prompt/context helper for Campaign text production with platform, angle, audience, tone, selling point, CTA intent, forbidden claims, and citation fields.
- Produce structured draft outputs for caption, headline, CTA, hashtag, post copy, and platform post through existing supported text items.
- Persist context snapshots on produced text drafts so each draft remains traceable to brief/angle/platform/selling point.
- Feed new produced text outputs into Campaign Distribution Package copy selection and downstream distribution draft intake.
- Update tests, run docs, PRODUCT.md, and CHANGELOG.md.

### Out of Scope
- Adding or renaming `ProductionItemType`.
- Real social publishing, account auto-selection, or platform API integration.
- Compliance approval guarantees for generated copy.
- Campaign coverage summary UI, Campaign page decomposition, Banner Prompt MVP, Team Asset, or Drive import work.
- Deployment to staging or prod from this Dev Worker window.

## 3) Module Breakdown
- Text production context:
  - Responsibilities: Build deterministic prompt/context metadata for caption/headline/CTA/hashtag/platform post drafts.
  - Dependencies: Campaign brief, strategy, selected variant, and knowledge context.
- Output production adapter:
  - Responsibilities: Extend existing supported production to emit `cta` and `platform_post` drafts without new item types.
  - Dependencies: `CampaignOutputPlan`, `ProductionItem`, `ProducedOutputDraft`.
- Persistence validation:
  - Responsibilities: Accept new output kinds and normalize persisted context snapshots.
  - Dependencies: Campaign output plan API service validation.
- Distribution bridge:
  - Responsibilities: Prefer platform post/post copy/caption/headline/hashtag drafts when creating Distribution Packages and preserve output ids.
  - Dependencies: Campaign distribution package builder and package-to-distribute adapter.

## 4) Technical Approach
- Architecture decisions: Treat CTA and platform post as `ProducedOutputKind` values because they share the existing copy production and distribution review path.
- Data flow: Brief/strategy/knowledge -> `TextProductionContext` -> produced draft bodies/variants/context -> output plan persistence -> Distribution Package copy/intake.
- API or interface changes: JSON payloads may include `textContext` on produced outputs; no database schema migration is required because output plans are stored as payload JSON.
- Migration or compatibility notes: Existing output kinds remain valid; backend validation still rejects unrelated kinds such as `video`.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Front/backend enum drift | `ProducedOutputKind` changes only on one side | Saved plans fail validation or UI type checks | Update frontend union and backend allowlist together; add backend route test | Builder |
| Type expansion becomes scope creep | CTA/platform post become a new item type or publishing action | Conflicts with plan and adjacent windows | Keep `ProductionItemType` unchanged and route through existing `fb_post`/copy outputs | Builder |
| Context gets dropped on save | Backend sanitizer strips new metadata | Drafts lose source brief/angle/selling point traceability | Normalize `textContext` explicitly and test round trip | Builder |
| Distribution picks weak copy | Package keeps old fallback caption when platform post exists | Operators do not see B2 value | Prefer `platform_post` then `post_copy` then caption; add distribution tests | Builder |
| Parallel-window collision | Window B edits Campaign page split or coverage map files | Merge conflicts | Stay inside anchor ownership and avoid broad `CampaignCreative.tsx` refactor | Integrator |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Supported Campaign production emits caption, headline, CTA, hashtag, and platform post drafts | Frontend adapter test | Produced output kinds include `caption`, `headline`, `cta`, `hashtag`, `platform_post` |
| AC-02 | No new production item type is introduced | Type/test inspection | `ProductionItemType` remains unchanged; CTA/platform post are only output kinds |
| AC-03 | Text drafts preserve brief/angle/platform/selling point/guardrail context | Prompt helper and adapter tests | `textContext` is present with expected fields and citation ids |
| AC-04 | Backend accepts and persists new kinds/context | API route test | POST/PATCH round trip `cta` and `platform_post` outputs |
| AC-05 | Distribution Package can consume produced text as copy candidates/context | Distribution package tests | Package copy prefers platform post and lineage carries produced output ids |
| AC-06 | Build/test evidence is recorded | Verifier report | Targeted tests and frontend/backend builds recorded with PASS/known limitations |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Campaign with supported copy items produces caption/headline/CTA/hashtag/platform post drafts and creates a Package with platform post copy. |
| Edge cases | Existing produced items remain idempotent; unavailable visual/video items stay untouched. |
| Error path | Backend still rejects invalid output kind values and invalid text context shapes. |
| Regression | Banner prompt output and quality marking keep working. |
| Stress/Stability | Distribution intake keeps publish blocked unless a real publishable asset exists. |

## 8) Delivery Artifacts
- Code changes: text production helper, output adapter, distribution bridge, backend validation, tests.
- Test evidence: targeted Node tests, frontend build, backend build, workflow guard build/verify, eval attempt when feasible.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`, and `docs/TASK-INDEX.md` status entry.
