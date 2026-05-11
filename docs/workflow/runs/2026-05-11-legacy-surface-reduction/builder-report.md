# BuilderReport - 2026-05-11-legacy-surface-reduction

## 1) Inputs
- Spec file: `docs/workflow/runs/2026-05-11-legacy-surface-reduction/planner-spec.md`
- Spec version/date: 2026-05-11T07:04:21Z
- Acceptance criteria covered: AC-01, AC-02, AC-03, AC-04

## 2) Implemented
| AC ID | What was implemented | Files changed | Notes |
|---|---|---|---|
| AC-01 | Added `LEGACY_DIRECT_ONLY_PATHS` to filter `/tiktok-matrix` out of visible sidebar groups. | `h5-video-tool/src/components/Layout.tsx` | The nav item definition remains parked in code, but no longer renders in the primary sidebar. |
| AC-02 | Preserved direct routes and redirects by leaving `App.tsx` read-only and adding route-presence tests. | `h5-video-tool/tests/legacySurfaceReduction.test.ts` | `/tiktok-matrix`, `/geelark`, `/geelark-batch`, and Platform direct routes remain routeable. |
| AC-03 | Added `sj-ui` isolation tests and documented deletion as a later rollback-friendly boundary. | `legacySurfaceReduction.test.ts`, legacy audit doc, Run 10 plan | No `src/sj-ui` deletion in this commit. |
| AC-04 | Updated product/release docs and reran targeted test, production builds, workflow guard, and eval. | `CHANGELOG.md`, `PRODUCT.md`, `docs/TASK-INDEX.md`, run docs | No provider/data-contract/publish behavior change. |

## 3) Not Implemented
| AC ID | Reason | Impact | Proposed next step |
|---|---|---|---|
| N/A | No scoped AC intentionally skipped. | N/A | N/A |

## 4) Self-Test Results
| Test type | Command/Method | Result | Evidence |
|---|---|---|---|
| Targeted frontend test | `cd h5-video-tool && node --test --experimental-strip-types tests/legacySurfaceReduction.test.ts` | PASS | 5/5 source-presence tests passed. |
| Backend build | `cd h5-video-tool-api && npm run build` | PASS | TypeScript compile, asset copy, and build-info succeeded. |
| Frontend build | `cd h5-video-tool && npm run build` | PASS | Vite production build succeeded with existing `src/api/client.ts` mixed import warning. |
| Workflow guard | `python scripts/workflow_guard.py --run-id 2026-05-11-legacy-surface-reduction --stage build` | PASS | All changed paths were inside `SESSION-ANCHOR.md` ownership. |
| Standard eval | `bash scripts/eval.sh 2026-05-11-legacy-surface-reduction` | PASS | `eval-result.json` records backend build, frontend build, TypeScript, and API health 200. |

## 5) Known Risks and Uncertainties
- Operators who used the sidebar for `/tiktok-matrix` need a direct URL:
  - Why it remains: Run 10 intentionally hides the route from primary navigation but does not delete it.
  - Possible impact: A parked analysis workflow may be less discoverable from the default UI.
  - Suggested follow-up: Confirm no active support need before route deletion or experimental/admin-only relocation.
- `src/sj-ui` still exists:
  - Why it remains: Deletion must be a separate commit/run for rollback clarity.
  - Possible impact: Repository still carries legacy files even though they are isolated from app source.
  - Suggested follow-up: Run a dedicated `sj-ui` removal commit after one release cycle if source scans stay clean.

## 6) Scope Compliance Statement
- I did not expand scope beyond the approved PlannerSpec: Yes.
- If No, list deviations and reasons: N/A.

## 7) Change Summary
- What changed: `/tiktok-matrix` is direct-link-only, Platform direct-only status is test-guarded, and `sj-ui` isolation is documented/tested.
- Why changed: Run 10 reduces legacy surface noise in the primary operator navigation.
- What did not change: Routes, redirects, provider services, GeeLark publish APIs, data contracts, and large component boundaries.
