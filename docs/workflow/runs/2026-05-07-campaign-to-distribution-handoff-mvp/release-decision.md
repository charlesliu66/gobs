# ReleaseDecision - 2026-05-07-campaign-to-distribution-handoff-mvp

## 1) Inputs Reviewed
- PlannerSpec: `docs/workflow/runs/2026-05-07-campaign-to-distribution-handoff-mvp/planner-spec.md`
- BuilderReport: `docs/workflow/runs/2026-05-07-campaign-to-distribution-handoff-mvp/builder-report.md`
- VerifierReport: `docs/workflow/runs/2026-05-07-campaign-to-distribution-handoff-mvp/verifier-report.md`
- Additional evidence:
  - `node --import tsx --test tests/campaignMissionBrief.test.ts` in `h5-video-tool-api/`
  - `python scripts/workflow_guard.py --run-id 2026-05-07-campaign-to-distribution-handoff-mvp --stage build`
  - `python scripts/workflow_guard.py --run-id 2026-05-07-campaign-to-distribution-handoff-mvp --stage verify`
  - `python scripts/deploy_all.py --target staging`
  - `smoke_http.ps1 -Env staging -Depth full -ExpectedCommit 1988f6a -RunId 2026-05-07-campaign-to-distribution-handoff-mvp`
  - 3 repeated authenticated staging `mission-brief` API calls returning `generationSource: llm`
  - `python scripts/mark_release_ready.py --updated-by codex`
  - `python scripts/deploy_all.py --target prod --updated-by codex`
  - `smoke_http.ps1 -Env prod -Depth full -ExpectedCommit 1988f6a -RunId 2026-05-07-campaign-to-distribution-handoff-mvp`
  - 5 repeated authenticated prod `mission-brief` API calls returning `generationSource: llm`
  - `python scripts/set_deployment_state.py --target prod --phase idle --updated-by codex`

## 2) Delivery Decision
- Decision: GO
- Decision time: 2026-05-07T19:26:41+08:00
- Decision owner: codex

## 3) Blocking Issues
| ID | Severity | Description | Owner | Required before release |
|---|---|---|---|---|
| None | - | No P0/P1 blocker remained after the final `1988f6a` verification loop. | codex | No |

## 4) Accepted Risks
| Risk | Severity | Why accepted | Boundary/Workaround | Follow-up date |
|---|---|---|---|---|
| Public-env visual browser walkthrough was not repeated after the final docs-sync release | Medium | Deterministic smoke plus repeated authenticated API checks already covered the bug that triggered this run, but they do not replace a human visual walk. | Route/version smoke passed on staging and prod, and the exact warning-producing API path was exercised repeatedly with `llm` responses only. | 2026-05-08 |
| Verification stayed read-only on prod except for auth/session state | Low | Avoided creating synthetic business records on prod while closing the Mission Brief stability bug. | Full mutation flows remain covered by earlier MVP verification on staging; this release focused on the mission-brief warning regression. | 2026-05-08 |

## 5) Scope Compliance
- Delivered in scope: Yes. The final release only stabilizes the mission-first `Campaign Creative` brief-generation path inside the existing distribution-handoff run.
- Out-of-scope changes found: None.
- Notes: No AGENTS.md forbidden files were touched. The fix stays inside `campaignMissionBrief.ts`, its backend regression test, and required product/run documentation.

## 6) Release Boundary
- What is guaranteed: On commit `1988f6a`, staging and prod both run the same code, HTTP smoke passes, and repeated authenticated `POST /api/campaign-creative/mission-brief` calls for the reported `新英雄参赛宣传` mission stay on `generationSource: llm` with zero warnings under the routed 8-pack Gold and Glory context.
- What is not guaranteed: A browser-driven public visual walkthrough of `/campaign-creative` was not repeated after the final docs-sync release, and broader publish-history or non-mission-brief surfaces were not revalidated beyond unchanged route smoke.
- Environments validated: Local replay with real staging/prod routed packs, staging (`http://43.134.186.196:8080`), and prod (`http://43.134.186.196`).

## 7) Next Actions
1. Do one public visual browser follow-up on `/campaign-creative` to confirm the warning banner stays gone in the live UI, not just at the API level.
2. Keep the mission-brief regression test in the default backend verification set for future Campaign Creative work.
3. If the routed brain grows again, prefer tightening the deterministic summary layer before changing the user-facing mission-first flow.
