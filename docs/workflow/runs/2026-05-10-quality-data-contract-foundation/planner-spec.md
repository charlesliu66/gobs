# PlannerSpec - 2026-05-10-quality-data-contract-foundation

## 1) Project Goal
- Business goal: Create the minimal quality and data-contract foundation required before Window B writes validation code and before Window A starts Asset Library or Banner MVP work.
- User value: Future runs can share one small vocabulary for output type, quality status, and Campaign -> Asset -> Output -> Review -> Package IDs instead of inventing incompatible local shapes.
- Success metrics: Three-state quality rubric, five-entity contract, and fixture-backed tests are importable from frontend TypeScript modules.

## 2) Scope
### In Scope
- Frontend-only TypeScript quality vocabulary and deterministic rubric helpers.
- Frontend-only TypeScript contracts for Campaign, Asset, Output, Review, and Package.
- Minimal fixtures for one usable Banner, one needs-fix story video, and one unusable platform-copy or Banner example.
- Markdown plan documenting how Run 1, Run 2, Run 3, and Run 4 should consume this foundation.
- Targeted node:test coverage for three quality states and required ID relationships.
- Product changelog updates for this code-facing foundation.

### Out of Scope
- `CampaignOutputWorkbench.tsx` UI changes.
- `h5-video-tool-api/src/routes/campaignOutputPlans.ts` or `campaignDistributionPackages.ts` changes.
- Asset Library upload/preprocessing UI or API work from Run 1.
- Banner Workbench UI, prompt production, or distribution package wiring from Run 2.
- Quality diagnosis panel, feedback bar, or next-version generation from Run 4.
- Any deployment, staging, prod, or release-owner action.

## 3) Module Breakdown
- Creative quality:
  - Responsibilities: define `CreativeOutputType`, `CreativeQualityStatus`, issue tags, and deterministic rubric helpers.
  - Dependencies: none; this must remain provider-free and UI-free.
- Campaign output contracts:
  - Responsibilities: define five entity contracts, fixtures, and graph validation for required IDs.
  - Dependencies: imports quality status/output type only.
- Documentation:
  - Responsibilities: explain the three-state rubric and entity relationship rules in a short markdown plan.
  - Dependencies: source checklist `docs/plans/2026-05-10-gobs-next-optimization-checklist.md`.

## 4) Technical Approach
- Keep quality states limited to `usable`, `needs_fix`, and `unusable`; no scores, weights, confidence, or automatic video understanding.
- Use plain TypeScript union types and interfaces so later frontend modules can import the contract without runtime dependencies.
- Encode the rubric as deterministic predicates over human/operator-visible signals: brief alignment, selling-point clarity, source-asset correctness, blocking publish issues, and issue tags.
- Encode ID relation checks as a pure `validateCampaignOutputContractGraph` helper returning structured validation issues rather than throwing.
- Put fixtures next to the contract so tests and future runs can copy known-good shapes without reading UI components.
- Do not modify any shared Campaign Output Workbench or backend route files while Window B is active.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Contract overreach | Adding revision, publish batch, score, or AI diagnosis fields | Later runs inherit too much complexity | Keep only the checklist-required entities and relationships | Window A |
| Window collision | Touching shared Workbench/backend routes while Window B is preparing validation | Merge conflicts and inconsistent contract adoption | Mark those paths forbidden in SESSION-ANCHOR and avoid imports from them | Window A |
| Weak validation | Fixtures exist but relationships are not checked | Run 1/2/4 may still create broken IDs | Tests must cover missing campaign, missing asset, review link, and package output links | Verifier |
| Misleading quality language | Rubric suggests AI has watched video or judged quality automatically | Operator trust risk | Documentation states this is deterministic/human-signal-only foundation | Window A |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Quality status is limited to `usable`, `needs_fix`, and `unusable` with deterministic rules. | `node --test` targeted quality test plus TypeScript build | Tests cover all three statuses and the exported status list contains exactly three values. |
| AC-02 | Campaign, Asset, Output, Review, and Package contracts expose required ID relationships. | Contract fixture test | Fixtures validate with zero issues and tests prove invalid campaign/asset/output links are detected. |
| AC-03 | Markdown documentation explains the rubric and five-entity graph in under ten minutes. | Manual doc review | `docs/plans/2026-05-10-creative-quality-and-data-contract.md` includes usage boundaries and downstream run handoff notes. |
| AC-04 | Scope respects window-collision constraints. | Workflow guard build/verify | No changes to `CampaignOutputWorkbench.tsx`, `campaignOutputPlans.ts`, or `campaignDistributionPackages.ts`. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Usable Banner fixture returns `usable`; valid five-entity graph returns no validation issues. |
| Edge cases | Needs-fix story video with non-blocking issue tags returns `needs_fix`; output with `parentOutputId` links to prior output. |
| Error path | Brief mismatch, core asset mismatch, missing selling point, or blocking issue returns `unusable`; missing asset/output references return validation issues. |
| Regression | Frontend build still passes without importing shared Workbench or backend route code. |
| Stress/Stability | Validation handles empty arrays and duplicate IDs deterministically. |
| Race/Concurrency | Guard confirms no shared Window B paths changed. |

## 8) Delivery Artifacts
- Code changes:
  - `h5-video-tool/src/components/campaign/quality/creativeQualityTypes.ts`
  - `h5-video-tool/src/components/campaign/quality/creativeQualityRubric.ts`
  - `h5-video-tool/src/components/campaign/quality/creativeQualityRubric.test.ts`
  - `h5-video-tool/src/components/campaign/contracts/campaignOutputContracts.ts`
  - `h5-video-tool/src/components/campaign/contracts/campaignOutputContracts.test.ts`
- Documents:
  - `docs/plans/2026-05-10-creative-quality-and-data-contract.md`
  - Run artifacts, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`
- Test evidence:
  - `python scripts/workflow_guard.py --run-id 2026-05-10-quality-data-contract-foundation --stage build`
  - Targeted node tests
  - `npm run build` for backend and frontend via `bash scripts/eval.sh 2026-05-10-quality-data-contract-foundation`
