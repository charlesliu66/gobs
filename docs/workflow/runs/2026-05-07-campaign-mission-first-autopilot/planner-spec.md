# PlannerSpec - 2026-05-07-campaign-mission-first-autopilot

## 1) Project Goal
- Business goal: Simplify Campaign Mission Control into a mission-first flow with backend Gold and Glory Brain routing.
- User value: Market and operations users can start from one campaign mission, review a system-generated brief, and move to variant generation without selecting knowledge packs or filling expert fields.
- Success metrics: The default page removes user-facing pack selection, mission brief generation returns a usable Gold and Glory-aware brief, and the existing strategy/variant/editor handoff still works.

## 2) Scope
### In Scope
- Backend `campaign-creative` mission brief endpoint with automatic Gold and Glory Brain routing.
- Frontend mission composer, generated brief review, compact intent chips, and redesigned Mission Control layout.
- Tests, docs, PRODUCT/CHANGELOG updates, and release evidence.

### Out of Scope
- Advanced Studio and distribution publishing changes are out of scope.

## 3) Module Breakdown
- Backend mission brief generation:
  - Responsibilities: Validate mission input, route ready Gold and Glory knowledge packs, derive context, call Compass LLM, and provide deterministic fallback.
  - Dependencies: `campaignKnowledgeStore`, `campaignKnowledgeDerivation`, `compassLlm`.
- Frontend mission flow:
  - Responsibilities: Collect mission, call mission brief API, show generated brief review, and reuse existing strategy/variant/handoff pipeline after confirmation.
  - Dependencies: `CampaignCreative`, campaign model/strategy helpers, API client, i18n messages.
- Workflow/release artifacts:
  - Responsibilities: Record gate evidence, changelog entries, and staging/prod validation.

## 4) Technical Approach
- Architecture decisions: Put intelligence and knowledge routing in the backend; keep the frontend as a thin mission/review surface.
- Data flow: `mission + optional mode + uiLocale` -> backend routes `gold-and-glory` ready packs -> derive context -> LLM or fallback brief -> frontend review -> existing strategy/variant builder -> editor handoff.
- API change: Add `POST /api/campaign-creative/mission-brief`.
- Compatibility notes: Existing strategy, variant pack, and editor handoff shapes remain unchanged.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| LLM returns malformed JSON | Compass response is free-form or truncated | Brief generation fails | JSON extraction/repair plus deterministic fallback | Builder |
| Brain unavailable | No ready packs or store read failure | Brief becomes generic | Return fallback brief with warnings and keep UI usable | Builder |
| UX over-compression | Hiding too much removes user control | Operators cannot correct campaign direction | Keep generated brief review and advanced details collapsible | Builder |
| Handoff regression | New flow bypasses existing state assumptions | Editor receives incomplete campaign payload | Reuse current brief/strategy/variant/handoff helpers and add tests | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | POST /api/campaign-creative/mission-brief auto-routes Gold and Glory knowledge and returns generated brief context with fallback. | Backend targeted test, typecheck, route review | Non-empty mission returns `brief`, `knowledgeContext`, routed pack ids, source, warnings; empty mission returns 400-equivalent validation; LLM failure returns fallback brief. |
| AC-02 | Campaign Creative page hides user pack selection and uses mission composer plus generated brief review. | Frontend source guard test and browser/build check | Main Campaign Creative page imports mission components, does not render `CampaignKnowledgeSelector`, and shows generated brief review after mission generation. |
| AC-03 | Existing strategy, variant pack, and editor handoff continue to work from confirmed brief. | Frontend build plus static handoff guard | Confirmed generated brief feeds existing strategy/variant/handoff helpers and payload still includes brief, knowledge context, and variant pack. |
| AC-04 | Builds, targeted tests, browser happy path, staging smoke, and prod smoke are recorded. | Local test/build commands, browser happy path, release smoke scripts | Evidence is recorded in Builder/Verifier/ReleaseDecision with P0/P1 defects at zero before release. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Mission brief endpoint returns LLM-generated brief with routed Gold and Glory pack ids; frontend shows brief review and generates variant pack after confirmation. |
| Edge cases | Empty mission returns 400; no ready packs returns fallback warning; missing optional mode defaults safely. |
| Error path | LLM/network/malformed JSON falls back to deterministic brief instead of breaking the UI. |
| Regression | Strategy, variant pack, and editor handoff payload still include brief, knowledgeContext, and variantPack. |
| Release | Backend typecheck/build, frontend build, browser happy path, staging smoke, and prod smoke. |

## 8) Delivery Artifacts
- Code changes: backend route/service/tests; frontend API/components/page/tests; product docs.
- Test evidence: targeted Node tests, backend/frontend builds, workflow guard, browser happy path, staging/prod smoke.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
