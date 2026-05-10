# ChallengerReview - 2026-05-10-banner-output-mvp

## 1) Inputs
- PlannerSpec file: `docs/workflow/runs/2026-05-10-banner-output-mvp/planner-spec.md`
- Planner version/date: 2026-05-10T09:36:51Z
- Source checklist: `docs/plans/2026-05-10-gobs-next-optimization-checklist.md`
- Dependencies:
  - Run 0 quality/data contract merged.
  - Run 1 Asset Library reuse metadata merged and deployed.

## 2) Challenge Findings
| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Honesty | must-fix-before-build | Banner placeholder must not be represented as a final publishable image. | A prompt placeholder cannot be safely published. | Distribution package must use `generating` or `needs_asset`, not `publishable`. |
| C-002 | Scope | must-fix-before-build | Do not rewrite campaign output or distribution backend routes. | The user explicitly wants split-window safety and deployment handled elsewhere. | Keep route files read-only in SESSION-ANCHOR. |
| C-003 | Data | should-fix-in-build | Quality status must reuse Run 0 values only. | Run 4 depends on the same feedback vocabulary. | Use `CreativeQualityStatus`; backend validator must reject custom values. |
| C-004 | UX | should-fix-in-build | Banner card needs enough detail to be useful without becoming a design editor. | Run 2 is an MVP, not a full design tool. | Show specs, selected source assets, prompt placeholder, CTA/short copy, and quality buttons only. |
| C-005 | Regression | should-fix-in-build | Existing text/post production must remain idempotent. | Current Campaign -> Distribution path depends on it. | Keep existing tests and add Banner-specific tests. |

## 3) Plan Improvement Requests
- Request 1:
  - Planner section to update: `## 4) Technical Approach`
  - Expected revision: explicitly mark Banner placeholders as non-publishable distribution context.
- Request 2:
  - Planner section to update: `## 6) Acceptance Criteria`
  - Expected revision: include invalid quality status rejection.
- Request 3:
  - Planner section to update: `## 8) Delivery Artifacts`
  - Expected revision: list backend service validator if new produced output fields must persist.

## 4) Gate 1.5 Verdict
- Verdict: Pass
- Blocking item count: 0
- Notes: Planner and SESSION-ANCHOR address C-001/C-002. Builder may start inside the listed editable scope.

## 5) Residual Risks Accepted for Build
- Risk: Run 2 will not generate a real Banner image.
  - Why accepted now: Checklist explicitly says prompt/placeholder first and forbids bypassing image-generation safety boundaries.
  - Boundary: The UI must call it a prompt/placeholder and package readiness must remain non-publishable.
  - Follow-up gate: future image generation / Banner rendering run
- Risk: Workbench file is edited in this window.
  - Why accepted now: Run 2 requires a Banner card in the Workbench, and the other window is deployment-only per latest user direction.
  - Boundary: No concurrent edits to campaign output backend routes or distribution routes in this window.
  - Follow-up gate: Verifier diff review
