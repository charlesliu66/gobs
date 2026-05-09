# ChallengerReview - 2026-05-09-release-tooling-hardening

## 1) Inputs
- PlannerSpec file: `docs/workflow/runs/2026-05-09-release-tooling-hardening/planner-spec.md`
- Planner version/date: 2026-05-09T06:29:57Z

## 2) Challenge Findings
| ID | Area | Severity | Finding | Why it matters | Required action |
|---|---|---|---|---|---|
| C-001 | Compatibility | must-fix | Existing tests import `datetime.UTC`, so they can fail before reaching the release script compatibility fix on Python 3.10. | A test suite that cannot import on the target runtime would hide the actual regression. | Update tests to use `datetime.timezone.utc` or script-provided helpers, then run them with default `python3`. |
| C-002 | Operability | must-fix | SFTP/SSH hangs are hard to prove with unit tests alone. | A mocked close test can pass while real Paramiko still waits forever on staging/prod. | Require one real staging deployment after code changes before release GO. |
| C-003 | Safety | should-fix | Adding shorter timeouts could create false failures on a slow network. | Release tooling should avoid hanging without becoming flaky. | Use conservative channel timeouts and visible progress logging rather than tiny timeouts. |

## 3) Plan Improvement Requests
- Request 1:
  - Planner section updated: `## 4) Technical Approach`
  - Result: Plan now specifies Python 3.10 UTC fallback and bounded SSH/SFTP behavior without CLI contract changes.
- Request 2:
  - Planner section updated: `## 7) Test Matrix`
  - Result: Plan now requires both unit tests and a real staging deployment observation.

## 4) Gate 1.5 Verdict
- Verdict: Pass
- Blocking item count: 0
- Notes: Build may start after the run anchor lists editable files explicitly.

## 5) Residual Risks Accepted for Build
- Risk:
  - Why accepted now: Paramiko hang behavior may depend on the live network/server.
  - Boundary: Unit tests cover helper behavior; staging deployment must prove real-world completion before prod.
  - Follow-up gate: Verifier
