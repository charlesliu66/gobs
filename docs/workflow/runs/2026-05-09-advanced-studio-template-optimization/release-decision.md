# ReleaseDecision - 2026-05-09-advanced-studio-template-optimization

## 1) Inputs Reviewed
- PlannerSpec: `docs/workflow/runs/2026-05-09-advanced-studio-template-optimization/planner-spec.md`
- BuilderReport: `docs/workflow/runs/2026-05-09-advanced-studio-template-optimization/builder-report.md`
- VerifierReport: `docs/workflow/runs/2026-05-09-advanced-studio-template-optimization/verifier-report.md`
- Additional evidence: `eval-result.json`, targeted frontend/backend tests, `git diff --check`

## 2) Delivery Decision
- Decision: GO for local commit and push to `origin/main`; staging release eligible after standard release guard checks. Prod is not approved in this decision.
- Decision time: 2026-05-09
- Decision owner: codex

## 3) Blocking Issues
| ID | Severity | Description | Owner | Required before release |
|---|---|---|---|---|
| None | - | - | - | - |

## 4) Accepted Risks
| Risk | Severity | Why accepted | Boundary/Workaround | Follow-up date |
|---|---|---|---|---|
| Legacy `boss-showcase` ID remains | Low | Avoids broad migration risk during Phase 1 cleanup | User-facing name/copy is Character Showcase; ID migration can be separate | Next Studio run |
| Asset Library unification not implemented | Medium | Explicit Phase 2 scope requiring broader picker/upload work | Existing Drive/character picker remains functional | Next Studio run |

## 5) Scope Compliance
- Delivered in scope: Yes, AC-01 through AC-06.
- Out-of-scope changes found: None.
- Notes: Protected service files and new provider/env work were not touched. Scope was updated before final guard to include prompt API cleanup, prompt-polish dead-code cleanup, utility extraction, and template registry tests that were required by the accepted ACs.

## 6) Release Boundary
- What is guaranteed: Local code builds, tests, and API health pass; Studio active templates and fallback data are reduced to the Phase 1 set.
- What is not guaranteed: Staging/prod behavior until deployed and smoke-tested; Phase 2+ features such as AI image generation, BGM, transitions, and new model providers.
- Environments validated: Local build/test/eval only.

## 7) Next Actions
1. Commit and push this run to `origin/main`.
2. If continuing release sync, deploy staging and smoke `/studio` template picker before any prod decision.
3. Start a separate Phase 2 run for Unified Asset Selector and AI-generated reference image fallback.
