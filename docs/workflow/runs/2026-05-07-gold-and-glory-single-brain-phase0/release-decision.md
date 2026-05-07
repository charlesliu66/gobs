# ReleaseDecision - 2026-05-07-gold-and-glory-single-brain-phase0

## 1) Inputs Reviewed
- PlannerSpec: `docs/workflow/runs/2026-05-07-gold-and-glory-single-brain-phase0/planner-spec.md`
- BuilderReport: `docs/workflow/runs/2026-05-07-gold-and-glory-single-brain-phase0/builder-report.md`
- VerifierReport: `docs/workflow/runs/2026-05-07-gold-and-glory-single-brain-phase0/verifier-report.md`
- Additional evidence: `docs/workflow/runs/2026-05-07-gold-and-glory-single-brain-phase0/eval-result.json`, `workflow_guard --stage build`, `workflow_guard --stage verify`

## 2) Delivery Decision
- Decision: GO WITH WARNINGS
- Decision time: 2026-05-07T13:47:01+08:00
- Decision owner: codex

## 3) Blocking Issues
| ID | Severity | Description | Owner | Required before release |
|---|---|---|---|---|
| None | - | - | - | - |

## 4) Accepted Risks
| Risk | Severity | Why accepted | Boundary/Workaround | Follow-up date |
|---|---|---|---|---|
| Local eval API health warning | P1 | `eval.sh` hit `000000` on local API health because no local API process was running. Build/typecheck/test evidence still passed. | Treat as environment-only warning; complete staging and prod smoke on deployed environments before closing the run. | 2026-05-07 |
| Real brain content is still not the same as shell correction | P2 | This run intentionally corrects the frontstage shell only and leaves real Gold and Glory fastpublish ingestion out of scope. | Release notes and PRODUCT copy explicitly state that packs may still be missing and strategy can still fall back to brief-only mode. | Next knowledge-ingestion run |

## 5) Scope Compliance
- Delivered in scope: Yes
- Out-of-scope changes found: None
- Notes: Frontend-only shell correction, tests, and version/run docs stayed within the approved run boundary.

## 6) Release Boundary
- What is guaranteed: Marketer-facing Campaign Creative now defaults to a single visible Gold and Glory brain shell and no longer exposes old multi-project demo framing.
- What is not guaranteed: This release does not prove that real Gold and Glory fastpublish knowledge content has already been ingested or populated under the stable id.
- Environments validated: Local targeted tests/build/typecheck plus local workflow guards. Deployed environment validation is the next required step.

## 7) Next Actions
1. Commit the worktree branch and fast-forward `main` to the approved commit.
2. Push `origin/main`, deploy `staging`, and complete staging smoke plus release-ready marking.
3. Deploy `prod`, run prod smoke, and restore prod deployment state to `idle`.
