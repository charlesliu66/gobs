# ChallengerReview - 2026-05-11-campaign-banner-prompt-hardening

## 1) Inputs
- PlannerSpec file: `docs/workflow/runs/2026-05-11-campaign-banner-prompt-hardening/planner-spec.md`
- Planner version/date: 2026-05-11T09:38:29Z

## 2) Challenge Findings
| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Scope control | must-fix-before-build | The generic bootstrap plan could drift into a Banner designer or preview surface. | Run B3 is only prompt hardening; preview is explicitly gated to a later human-signal run. | Anchor/planner must list prompt-only scope and no-preview/no-provider non-goals. |
| C-002 | Coverage honesty | must-fix-before-build | Prompt-only Banner must not be counted as direct/auto production. | Inflated coverage would mislead operators into thinking a final visual exists. | Add a UI readiness layer that maps Banner to `template_ready`. |
| C-003 | Persistence | should-fix-in-build | Existing backend normalizer did not preserve Banner details. | Saved plans could lose selected source assets or prompt context after round-trip. | Add additive validation/round-trip support for `bannerDetails` and `bannerPromptContext`. |
| C-004 | Multi-window boundary | should-fix-in-build | Asset Library/DB work belongs to Window B. | Touching asset schema/routes risks parallel conflicts. | Consume existing asset IDs only; do not edit asset DB/routes. |

## 3) Plan Improvement Requests
- Request 1:
  - Planner section to update: `## 2) Scope`
  - Expected revision: Explicitly state no Banner preview, no provider call, no publish path, and no Asset Library schema work.
- Request 2:
  - Planner section to update: `## 6) Acceptance Criteria`
  - Expected revision: Add `template_ready` classification and backend round-trip acceptance criteria.

## 4) Gate 1.5 Verdict
- Verdict: Pass
- Blocking item count: 0
- Notes: Build may start because anchor/planner now limit B3 to structured prompt, metadata, coverage view model, and non-publishable package context.

## 5) Residual Risks Accepted for Build
- Risk: Existing unrelated dirty V2 plan doc is still present.
  - Why accepted now: It predates this run and is outside the B3 editable scope.
  - Boundary: Do not stage it; workflow guard WARN is acceptable only for this unrelated doc.
  - Follow-up gate: Verifier
