# PlannerSpec - 2026-05-11-knowledge-traceability

## 1) Project Goal
- Business goal: Add campaign knowledge traceability with visible citations, feedback states, and reuse suppression for rejected knowledge
- User value: Campaign operators can see which Gold and Glory knowledge shaped the brief/output plan, give feedback on specific knowledge entries, and trust that rejected knowledge will not reappear in later generations.
- Success metrics: Brief review renders cited knowledge, citation feedback persists, rejected citation ids are excluded from later mission-brief context, and output plan items carry visible knowledge references.

## 2) Scope
### In Scope
- Add deterministic citation ids to derived Campaign knowledge context.
- Persist per-user citation feedback under the existing campaign-knowledge storage root.
- Add API helpers/routes for citation feedback.
- Show citations and feedback controls in Campaign Brief review.
- Add knowledge references to Campaign Output Plan items and produced outputs where applicable.
- Filter rejected citation ids from future mission-brief context.

### Out of Scope
- No changes to Dreamina/Kling/VEO/studio provider services.
- No new knowledge-pack ingestion pipeline.
- No semantic vector search, scoring model, or ranking UI.
- No heavy component refactor of CampaignOutputWorkbench.
- No direct production release before staging verification and release-ready marking.

## 3) Module Breakdown
- Backend knowledge derivation:
  - Responsibilities: Create stable per-entry citations and suppress rejected citation ids.
  - Dependencies: `campaignKnowledgeStore`, `campaignKnowledgeDerivation`, `campaignMissionBrief`.
- Backend feedback persistence:
  - Responsibilities: Save/list citation feedback states by user/game.
  - Dependencies: resolver-managed campaign-knowledge storage and `campaignKnowledge` routes.
- Frontend traceability UI:
  - Responsibilities: Render citation evidence in Brief review and save feedback.
  - Dependencies: `CampaignCreative`, `GeneratedBriefReview`, `campaignKnowledge` API helper.
- Output plan traceability:
  - Responsibilities: Attach visible knowledge references to planned/producible outputs.
  - Dependencies: `outputPlan`, `CampaignOutputWorkbench`, output-plan backend validation.

## 4) Technical Approach
- Architecture decisions: Keep traceability deterministic and ID-based. Citation ids are derived from pack id, section, and entry value; feedback is stored separately from pack content.
- Data flow: ready packs -> derived context with citations -> mission brief and output plan -> user feedback -> persisted feedback -> later derivation suppresses `do_not_use_again` citation ids.
- API or interface changes: add `citations` to `DerivedCampaignKnowledgeContext`; add `/api/campaign-knowledge/games/:gameId/citation-feedback` list/save endpoint; add frontend helpers for these routes.
- Migration or compatibility notes: existing contexts without `citations` stay valid; output-plan validators preserve optional `knowledgeReferences`.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Citation id drift | Ids include non-stable text formatting | Saved feedback stops suppressing entries | Hash normalized pack/section/value strings | Builder |
| Data loss | Feedback overwrites pack/source manifests | Knowledge store corruption | Use a separate feedback file and atomic writes | Builder |
| UI clutter | Brief review shows too many knowledge rows | Marketer flow becomes noisy | Show compact first citations with explicit count/no-citation message | Builder |
| Output-plan persistence strip | Backend validator drops new references | References disappear after save | Update validator and tests for optional references | Builder |
| Prompt bloat | Full citation payload enters LLM prompt | Regression in compact prompt guard | Only arrays feed the prompt; citations stay returned for UI | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Brief review displays at least 3 cited knowledge entries or explicit no-citation text. | Frontend unit/source test and manual render path review. | `GeneratedBriefReview` receives context citations and renders citation cards or no-citation fallback. |
| AC-02 | Citation feedback can be saved as useful / inaccurate / do not use again. | API helper tests and backend store tests. | Feedback persists under campaign-knowledge storage and round-trips through API helpers. |
| AC-03 | Later generation does not reuse rejected citation ids. | Backend derivation/mission brief tests. | `deriveCampaignKnowledgeContext` excludes suppressed citation ids and `generateCampaignMissionBrief` applies stored rejects. |
| AC-04 | Output Plan marks knowledge-derived selling points/hooks/guardrails. | Output-plan tests and UI source presence check. | Production items/produced outputs carry `knowledgeReferences` and Workbench renders them. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Ready packs derive citations; Brief review shows citation cards; feedback save updates the active state. |
| Edge cases | No ready packs or all citations suppressed shows explicit no-citation messaging. |
| Error path | Invalid feedback state/id is rejected before writing. |
| Regression | Existing mission-brief compact prompt stays under guard limits; existing output-plan tests still pass. |
| Stress/Stability | Multiple repeated feedback saves for the same citation update deterministically without duplicating entries. |

## 8) Delivery Artifacts
- Code changes: backend citation/feedback APIs, frontend traceability UI/helpers, output plan reference metadata, tests.
- Test evidence: targeted node tests, backend/frontend build, workflow guard, `bash scripts/eval.sh 2026-05-11-knowledge-traceability`.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
