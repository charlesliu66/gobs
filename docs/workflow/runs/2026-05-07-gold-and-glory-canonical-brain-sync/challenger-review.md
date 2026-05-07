# ChallengerReview - 2026-05-07-gold-and-glory-canonical-brain-sync

## 1) Inputs
- PlannerSpec file: `docs/workflow/runs/2026-05-07-gold-and-glory-canonical-brain-sync/planner-spec.md`
- Planner version/date: 2026-05-07T06:26:51Z

## 2) Challenge Findings
| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Runtime coupling | must-fix-in-plan | The importer must not read the local Windows `fastpublishing` path at staging/prod runtime. | The cloud server cannot access the local source repo, so a runtime scanner would create a fake green local flow and a broken release. | Ship a repo-local canonical seed and store source paths/checksums for future refresh runs. |
| C-002 | Product scope | must-fix-in-plan | Canonical import must remain Gold and Glory only. | Reintroducing multi-project brain assumptions would undo the user-approved single-brain correction. | Reject `gold-and-glory-canonical` imports for non-`gold-and-glory` game ids and keep copy GNG-specific. |
| C-003 | Knowledge quality | should-fix-in-plan | Do not import noisy handoffs/reports/slide dumps in MVP. | A noisy brain will make Campaign Creative less concise and less trusted by marketing/ops users. | Whitelist brand, market, persona, live-ops, KOL/KOC, and playbook facts only. |

## 3) Plan Improvement Requests
- Request 1:
  - Planner section to update: `## 4) Technical Approach`
  - Expected revision: Clarify deployable canonical seed flow and manual refresh workflow.
- Request 2:
  - Planner section to update: `## 7) Test Matrix`
  - Expected revision: Add repeatable import, wrong-game rejection, source metadata, derivation, and frontend default-template coverage.

## 4) Gate 1.5 Verdict
- Verdict: Pass
- Blocking item count: 0
- Notes: Build may start after the run anchor lists editable files explicitly and the plan confirms no runtime dependency on local fastpublishing.

## 5) Residual Risks Accepted for Build
- Risk:
  - Why accepted now: The canonical seed is curated, not a full automated diff engine.
  - Boundary: Future fastpublishing changes require a manual refresh run until a later diff preview/scheduler is built.
  - Follow-up gate: Verifier
