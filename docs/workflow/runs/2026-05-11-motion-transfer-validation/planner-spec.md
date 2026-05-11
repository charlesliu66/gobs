# PlannerSpec - 2026-05-11-motion-transfer-validation

## 1) Project Goal
- Business goal: Validate Motion Transfer with explicit sample records, an experimental/pause/continue decision, and a guarded Studio entry hint
- User value: Marketers see an honest expectation before using Motion Transfer, and the team has a concrete continue/experimental/pause decision instead of a vague template promise.
- Success metrics: 10 sample records exist, the usable-rate threshold is enforced, and the Studio entry clearly says Motion Transfer is experimental when the threshold is not met.

## 2) Scope
### In Scope
- Machine-readable Motion Transfer validation sample ledger.
- Decision helper that returns only `continue`, `experimental`, or `pause`.
- Documentation report with suitable action types, high-risk action types, usable rate, and current decision.
- Minimal Studio template entry hint for Motion Transfer.
- Targeted tests for decision calculation and UI hint wiring.

### Out of Scope
- Real provider calls or new generated videos.
- Provider/service edits, route edits, prompt backend changes, or new env vars.
- Rebranding Motion Transfer as stable.
- Hiding/deleting the entry unless the decision becomes `pause`.
- Deployment from this Dev Worker window.

## 3) Module Breakdown
- Validation ledger:
  - Responsibilities: Store 10 validation samples, action types, result assessments, and ad-usability flags.
  - Dependencies: Run 0 quality status vocabulary for result quality states where useful.
- Decision helper:
  - Responsibilities: Calculate usable rate, suitable action types, high-risk action types, and `continue`/`experimental`/`pause`.
  - Dependencies: validation ledger only.
- Studio entry hint:
  - Responsibilities: Surface experimental status beside the Motion Transfer template.
  - Dependencies: `studioTemplateOptions.ts`, `TemplatePicker.tsx`.

## 4) Technical Approach
- Architecture decisions: Keep validation records in frontend TypeScript and docs so the result is reviewable without touching provider services.
- Data flow: sample ledger -> decision helper -> Studio template notice -> docs report.
- API or interface changes: None.
- Migration or compatibility notes: Motion Transfer remains selectable, but the UI marks it experimental.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| False stability signal | UI keeps presenting Motion Transfer as normal/stable | Operators expect reliable output | Add experimental notice when decision is not `continue` | Builder |
| Over-optimistic validation | Borderline examples counted as usable | Bad template enters main flow too early | Use strict usable flag and enforce <3/10 threshold | Builder |
| Provider scope creep | Validation asks for provider edits | Protected service risk | Keep all provider/backend video files forbidden | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | 10 sample records exist with required fields. | Unit tests + docs check | Fixture contains 10 samples with action type, character asset class, result assessment, reason, and ad-usability flag. |
| AC-02 | Decision is `continue`, `experimental`, or `pause`, and <3 usable samples cannot be `continue`. | Unit tests | Current fixture evaluates to `experimental`. |
| AC-03 | Report lists usable rate, suitable action types, and high-risk action types. | Unit tests + docs | Suitable action types are fewer than 3 and high-risk list is non-empty. |
| AC-04 | Motion Transfer entry displays experimental validation hint. | Source/unit tests | `getStudioTemplateValidationNotice('viral-dance')` returns the notice and `TemplatePicker` renders it. |
| AC-05 | Existing Studio template filtering/duration/aspect behavior stays intact. | Existing `studioTemplateOptions` tests | Phase 1 template tests still pass. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | 2/10 usable samples lead to `experimental`, not `continue`. |
| Edge cases | 3/10 usable samples can become `continue`; 0/10 can become `pause`. |
| Error path | Invalid/empty sample sets return no stable recommendation. |
| Regression | Existing Studio template visibility, duration, aspect, and display meta tests still pass. |
| Stress/Stability | Decision helper remains deterministic across repeated calls. |

## 8) Delivery Artifacts
- Code changes: validation fixture/helper, Studio template notice, tests.
- Test evidence: targeted Node tests, backend/frontend builds, workflow guard, `bash scripts/eval.sh 2026-05-11-motion-transfer-validation`.
- Documents to update: run artifacts, validation report, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`.
