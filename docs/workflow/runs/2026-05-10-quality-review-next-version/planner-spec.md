# PlannerSpec - 2026-05-10-quality-review-next-version

## 1) Project Goal
- Business goal: Add a human-quality review panel and next-version prompt/task loop for Banner and copy outputs using Run 0 contracts
- User value: Let operators turn first-version review feedback into a traceable next-version prompt/task without losing the original Campaign, assets, or parent output.
- Success metrics: Workbench shows honest quality diagnostics, next-version drafts are persisted, and invalid feedback metadata is rejected.

## 2) Scope
### In Scope
- Campaign Output Workbench quality panel for produced Banner and copy outputs.
- Fixed feedback-tag selection using the Run 4 vocabulary.
- Next-version draft generation for Banner prompt and copy outputs.
- Persistence of `parentOutputId`, feedback tags, note, inherited source asset ids, and campaign/brief context inside output-plan produced outputs.
- Focused frontend/backend tests and product docs.

### Out of Scope
- Automatic video understanding, scoring, or local video partial regeneration.
- New provider calls, image generation, or a Banner design editor.
- A new revision/version entity system.
- Distribution route rewrites, platform publishing behavior, and deployment.

## 3) Module Breakdown
- Feedback model:
  - Responsibilities: Define fixed feedback tags, map tags to Run 0 issue tags, and build static recommendations.
  - Dependencies: Run 0 `CreativeQualityStatus` and `CreativeIssueTag`.
- Next-version actions:
  - Responsibilities: Append a next-version `ProducedOutputDraft` with `parentOutputId`, source asset ids, campaign/brief metadata, tags, and note.
  - Dependencies: `CampaignOutputPlan`, `ProductionItem`, `ProducedOutputDraft`.
- Workbench UI:
  - Responsibilities: Render quality panel, feedback buttons, note input, and next-version action for Banner/copy outputs.
  - Dependencies: existing `CampaignOutputWorkbench`, `BannerOutputCard`, `CampaignCreative`.
- Persistence:
  - Responsibilities: Validate and round-trip new produced-output feedback fields without route rewrites.
  - Dependencies: `h5-video-tool-api/src/services/campaignOutputPlan.ts`.

## 4) Technical Approach
- Architecture decisions: Store next-version drafts in the existing `producedOutputs` array and link them by `parentOutputId`; do not add a `Version` table/entity.
- Data flow: human quality mark + feedback tags + optional note -> static recommendation -> next-version draft -> existing output-plan update API.
- API or interface changes: produced-output payload gains optional metadata fields; no route shape changes.
- Migration or compatibility notes: old produced outputs remain valid because all new metadata fields are optional.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Misleading diagnosis | UI wording implies AI watched the video | Users over-trust unsupported automation | State that signals come from human marks/tags/static rules only | Builder |
| Revision sprawl | Next-version work becomes a new entity system | Scope expands and persistence fragments | Keep drafts in existing `producedOutputs` with `parentOutputId` | Builder |
| Metadata stripping | Backend validator drops feedback fields | Next-version traceability is lost on refresh | Add round-trip tests for all new fields | Builder |
| Route collision | Run touches Campaign route files during parallel work | Merge conflict / ownership conflict | Only edit service validator, not route files | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Workbench shows quality diagnostics from human marks, feedback tags, and static rules only. | Frontend source/integration tests | `CreativeQualityPanel` renders status, tag summary, and static recommendation copy. |
| AC-02 | Operators can pick fixed feedback tags and create next-version drafts for Banner/copy. | Feedback action unit tests + Workbench source tests | Draft is appended for `banner_prompt`, `post_copy`, `caption`, `headline`, and `hashtag`. |
| AC-03 | Next-version drafts preserve traceability. | Feedback action unit tests | Draft includes `parentOutputId`, inherited `sourceAssetIds`, campaign id, brief id, tags, note, and createdAt. |
| AC-04 | Backend persistence round-trips and validates metadata. | API route tests | Valid payloads survive POST/PATCH; invalid feedback tags reject with 400. |
| AC-05 | Video wording stays honest. | Source test | UI contains no claim of automatic video understanding or local video partial regeneration. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Banner marked `needs_fix` with tags creates a child Banner prompt draft. |
| Edge cases | Copy output without Banner specs creates a copy rewrite draft and keeps parent id. |
| Error path | Unsupported feedback tag is rejected by backend validator. |
| Regression | Existing Banner quality mark and text production tests still pass. |
| Stress/Stability | Repeated next-version clicks create unique child draft ids without mutating the parent output. |

## 8) Delivery Artifacts
- Code changes: feedback model/actions, Workbench panel wiring, output-plan persistence metadata.
- Test evidence: targeted frontend/backend node tests, backend/frontend builds, workflow guards, `bash scripts/eval.sh 2026-05-10-quality-review-next-version`.
- Documents to update: run artifacts, `docs/plans/2026-05-10-quality-review-next-version.md`, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`.
