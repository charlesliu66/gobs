# ReleaseDecision - 2026-05-09-campaign-source-asset-readiness

## 1) Inputs Reviewed
- PlannerSpec: `docs/workflow/runs/2026-05-09-campaign-source-asset-readiness/planner-spec.md`
- BuilderReport: `docs/workflow/runs/2026-05-09-campaign-source-asset-readiness/builder-report.md`
- VerifierReport: `docs/workflow/runs/2026-05-09-campaign-source-asset-readiness/verifier-report.md`
- Additional evidence: targeted Node tests, workflow guard build/verify, `git diff --check`, `eval-result.json`.

## 2) Delivery Decision
- Decision: GO for commit/push and staging-first release sync.
- Decision time: 2026-05-08T18:33:10Z.
- Decision owner: codex.

## 3) Blocking Issues
| ID | Severity | Description | Owner | Required before release |
|---|---|---|---|---|
| None | - | No P0/P1 blockers after local Node/npm install and eval rerun. | - | - |

## 4) Accepted Risks
| Risk | Severity | Why accepted | Boundary/Workaround | Follow-up date |
|---|---|---|---|---|
| Conservative candidate matching | P3 | Candidate matches are safer as `needs_selection` than falsely claiming source readiness. | Operators can choose assets explicitly through the AssetPicker row action. | Next hardening run |
| No backend asset-owner validation in this slice | P2 | Existing output-plan PATCH can persist safe matched IDs, but strict owner validation needs a focused backend hardening run. | Asset Library list/search is owner-scoped; staging smoke remains required before prod. | Next hardening run |
| Local Node/npm installed outside Homebrew | P3 | Homebrew is too old for the current macOS version, so Node/npm was installed under `~/.local`. | Use `PATH="$HOME/.local/bin:$PATH"` for build/release commands on this machine. | Ongoing |

## 5) Scope Compliance
- Delivered in scope: Source asset candidate mapping, row-level selection/upload routing, source readiness recomputation, tests, product docs, run docs.
- Out-of-scope changes found: None.
- Notes: No forbidden generation services, upload storage, env vars, autopublish, scheduling, analytics, or broad editor refactors were touched.

## 6) Release Boundary
- What is guaranteed: Source-level tests and full eval show Campaign Output Workbench can map Asset Library candidates, let users select source assets, recompute affected item readiness, and preserve distribution honesty.
- What is not guaranteed: Staging/prod behavior, automatic media generation, upload pipeline changes, or publish automation.
- Environments validated: Local targeted tests, backend build, frontend build, backend TypeScript check, local API health.

## 7) Next Actions
1. Commit and push the verified changes.
2. Deploy staging and run H5 smoke.
3. If staging passes and prod approval is explicit, proceed through release-ready -> prod -> smoke -> idle flow.
