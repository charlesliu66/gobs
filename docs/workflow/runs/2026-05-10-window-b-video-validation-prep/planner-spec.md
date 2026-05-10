# PlannerSpec - 2026-05-10-window-b-video-validation-prep

## 1) Project Goal

- Business goal: prepare Window B to execute Run 3 and Run 5-12 from `docs/plans/2026-05-10-gobs-next-optimization-checklist.md` without touching runtime code before Window A finishes Run 0 contracts.
- User value: keep video validation, distribution, knowledge traceability, data hardening, legacy reduction, refactor, and editor effects work sequenced without branch collisions.
- Success metrics:
  - Window B has one explicit start/blocked matrix for Run 3 and Run 5-12.
  - Story video, Motion Transfer, and Character Showcase validation samples can be collected with repeatable fields.
  - No runtime frontend/backend file is modified in this prep run.

## 2) Scope

### In Scope

- Add a Window B governance plan that maps dependencies, start gates, and blocked files for Run 3 and Run 5-12.
- Add docs-only sample templates for:
  - Run 3 Story Video Review Capture.
  - Run 5 Motion Transfer Validation.
  - Run 6 Character Showcase Validation.
- Carry forward the source optimization checklist into this branch so run references are self-contained.
- Keep workflow artifacts current for Planner, Challenger, Builder, Verifier, and release handoff.

### Out of Scope

- Runtime frontend or backend code changes before Run 0 contracts are complete.
- Any edit to `CampaignOutputWorkbench.tsx`, `campaignOutputPlans.ts`, or `campaignDistributionPackages.ts`.
- Any deployment, staging, prod, release-ready marking, or server smoke work.
- Real quality conclusions based on fabricated samples; docs may define templates and provisional gates only.

## 3) Window B Run Breakdown

| Run | Window B action now | Start gate for code work | Notes |
|---|---|---|---|
| Run 3 Story Video Review Capture | Prepare sample schema and feedback tags only | Run 0 `Review`/`Output` contracts merged; ideally Run 2 Banner MVP merged before Campaign-side viewing | No Storyboard/provider rewrite. |
| Run 5 Motion Transfer Validation | Prepare 10-sample matrix and exit rule | Run 0 quality labels available; validation assets/results collected | Provisional status stays experimental until evidence. |
| Run 6 Character Showcase Validation | Prepare 5x2 sample matrix and exit rule | Run 0 quality labels available; validation assets/results collected | No promise of default-main-flow entry. |
| Run 7 Distribution Final Mile | Document dependency and collision files only | Window A/B no longer touching distribution package routes at the same time | Defer code because `campaignDistributionPackages.ts` is protected for this window now. |
| Run 8 Knowledge Traceability | Document dependency and feedback loop only | Run 0/Run 9 contract path agreed; knowledge feedback persistence owner clear | Do not touch knowledge services in prep run. |
| Run 9 Data Contract Hardening | Document audit target only | Run 0 contracts merged and active paths stable | No localStorage/runtime audit code in prep run. |
| Run 10 Legacy Surface Reduction | Document sequencing only | Business work runs stable; separate commit for any large delete | No source deletion in prep run. |
| Run 11 Large Component Refactor | Explicitly paused | After business validation stabilizes | Not a May prep target. |
| Run 12 Editor Effects Sprint | Explicitly paused | After quality/feedback loop stabilizes | Not a May prep target. |

## 4) Technical Approach

- This run is documentation-only and uses a separate worktree/branch for Window B.
- Runtime directories `h5-video-tool/src` and `h5-video-tool-api/src` are added as run-level forbidden paths.
- The sample docs use the future Run 0 labels (`usable`, `needs_fix`, `unusable`) but do not import or define runtime TypeScript.
- Validation docs distinguish:
  - `planned_sample`: a slot to fill later.
  - `observed_result`: a real generated result with a link or artifact id.
  - `review`: a human judgement that may later become a persisted `Review`.
- Motion Transfer and Character Showcase stay `experimental` by default until real samples prove at least 3 usable results out of 10.

## 5) Risks

| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Window A/B branch collision | Both windows use the same worktree or edit the same files | Lost work or merge conflicts | Use `gobs-window-b` worktree and avoid protected Campaign/route files | Window B |
| Premature code work | Run 0 contracts are not merged | Runtime schema drift | This run forbids runtime source changes | Window B |
| Fake validation confidence | Templates are mistaken for real sample data | Motion/character capabilities appear more stable than proven | Mark samples as pending until generated outputs exist | Verifier |
| Checklist source not tracked | Source plan remains only local | Handoff context breaks on another machine | Carry source checklist in this branch | Integrator |

## 6) Acceptance Criteria

| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Window B scope maps Run 3 and Run 5-12 dependencies, start gates, and blocked code boundaries | Review `docs/plans/2026-05-10-window-b-video-validation-governance.md` | Table covers Run 3 and Run 5-12 with allowed-now, dependency, start gate, and blocked files/actions. |
| AC-02 | Story video, Motion Transfer, and Character Showcase validation sample templates are documented with quality labels, feedback tags, and exit criteria | Review the three validation docs | Each doc contains sample fields, allowed quality labels, failure tags, and a repeatable evidence section. |
| AC-03 | SESSION-ANCHOR limits Builder ownership to workflow docs and validation sample docs, excluding runtime frontend/backend code | Run workflow guard and inspect `SESSION-ANCHOR.md` | `h5-video-tool/src` and `h5-video-tool-api/src` remain forbidden; changed files stay docs-only. |

## 7) Test Matrix

| Category | Cases |
|---|---|
| Happy path | Run docs and validation sample docs exist and can guide later Window B runs. |
| Edge cases | Run 0 not merged: docs explicitly block runtime code and mark quality labels as future contract-compatible. |
| Error path | Any runtime source change should fail workflow guard. |
| Regression | Existing source checklist remains intact; no deployment scripts or forbidden provider files touched. |
| Stress/Stability | Multi-window branch/worktree setup keeps Window A Run 0 files separate from Window B docs. |

## 8) Delivery Artifacts

- Documents:
  - `docs/plans/2026-05-10-gobs-next-optimization-checklist.md`
  - `docs/plans/2026-05-10-window-b-video-validation-governance.md`
  - `docs/plans/2026-05-10-story-video-quality-samples.md`
  - `docs/plans/2026-05-10-motion-transfer-validation.md`
  - `docs/plans/2026-05-10-character-showcase-validation.md`
- Workflow evidence:
  - `docs/workflow/runs/2026-05-10-window-b-video-validation-prep/*`
- Verification:
  - `python scripts/workflow_guard.py --run-id 2026-05-10-window-b-video-validation-prep --stage build`
  - `python scripts/workflow_guard.py --run-id 2026-05-10-window-b-video-validation-prep --stage verify`
  - Docs-only targeted checks; full `eval.sh` may be recorded as not required unless guard policy requires it.
