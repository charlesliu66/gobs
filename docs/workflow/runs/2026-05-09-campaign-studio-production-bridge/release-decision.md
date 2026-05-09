# ReleaseDecision - 2026-05-09-campaign-studio-production-bridge

## 1) Inputs Reviewed
- PlannerSpec: `docs/workflow/runs/2026-05-09-campaign-studio-production-bridge/planner-spec.md`
- BuilderReport: `docs/workflow/runs/2026-05-09-campaign-studio-production-bridge/builder-report.md`
- VerifierReport: `docs/workflow/runs/2026-05-09-campaign-studio-production-bridge/verifier-report.md`
- Additional evidence: `docs/workflow/runs/2026-05-09-campaign-studio-production-bridge/eval-result.json`

## 2) Delivery Decision
- Decision: GO for prod candidate after staging verification; prod promotion still requires explicit production release action.
- Decision time: 2026-05-09T01:46:30Z
- Decision owner: codex

## 3) Blocking Issues
| ID | Severity | Description | Owner | Required before release |
|---|---|---|---|---|
| None | - | - | - | - |

## 4) Accepted Risks
| Risk | Severity | Why accepted | Boundary/Workaround | Follow-up date |
|---|---|---|---|---|
| Provider-specific reference mapping is partial | P2 | Low-level generation services are forbidden for this run. | Studio seeds prompt/images safely; provider adapter work is later. | Next Studio provider run |
| Prod not yet smoke-tested | P2 | This run has local build/eval plus staging smoke evidence only. | Run prod deploy and prod smoke as the next explicit production release action. | Before prod |

## 5) Scope Compliance
- Delivered in scope: Campaign Output -> Studio bridge, Studio unified Asset Library slots, prompt-only quality presets, run/product/task docs, tests.
- Out-of-scope changes found: None authored by this run; the parallel Distribution Center changes landed separately as `9f087f8`.
- Notes: This run intentionally avoided `TabDistribute.tsx`, `components/distribution/*`, `components/distribute/*`, `messages.ts`, and all AGENTS.md forbidden backend files.

## 6) Release Boundary
- What is guaranteed: Local code readiness and staging deployment for the Campaign -> Studio bridge with passing targeted tests, frontend/backend builds, eval, and staging quick smoke.
- What is not guaranteed: Prod deployment, provider-level Kling/VEO source-asset media mapping, or Distribution Center cleanup.
- Environments validated: Local build/eval and staging quick smoke.

## 7) Next Actions
1. Promote the staging release-ready SHA to prod when ready.
2. Run prod smoke checks after promotion.
3. If prod passes, restore deployment state to idle.
