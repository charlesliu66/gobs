# PlannerSpec - 2026-05-11-character-showcase-validation

## 1) Project Goal
- Business goal: Validate Character Showcase with 10 role-direction samples, a continue/experimental/pause decision, and Studio preset guidance
- User value: Let marketers know which Character Showcase directions are ready enough to continue and which should stay out of the default workflow.
- Success metrics: 10 role-direction samples exist, the decision helper enforces the 3/10 threshold, and Studio preset guidance reflects recommended/not-recommended directions.

## 2) Scope
### In Scope
- Character Showcase validation ledger with 5 characters x 2 directions.
- Decision helper that returns only `continue`, `experimental`, or `pause`.
- Recommended and not-recommended template direction metadata.
- Studio entry notice and preset guidance for Character Showcase.
- Targeted tests, build/eval evidence, and release artifacts.

### Out of Scope
- Real provider calls, prompt backend tuning, route/service edits, or new env vars.
- New Studio templates or generation pipeline changes.
- Claiming Character Showcase is universally stable.
- Deployment before merge to pushed `origin/main` and release guard checks.

## 3) Module Breakdown
- Validation ledger:
  - Responsibilities: Store 10 character/direction samples, drift/readability/ad-feel/video-vs-Banner fit, and usability.
  - Dependencies: Run 0 quality statuses.
- Decision helper:
  - Responsibilities: Calculate usable rate, continue/experimental/pause decision, recommended directions, not-recommended directions, and high-risk cases.
  - Dependencies: validation ledger only.
- Studio guidance:
  - Responsibilities: Show a validation notice for Character Showcase and expose recommended preset metadata.
  - Dependencies: `studioTemplateOptions.ts`, `studioQualityPresets.ts`.

## 4) Technical Approach
- Architecture decisions: Keep validation data in frontend TypeScript and docs; no provider or backend changes.
- Data flow: sample ledger -> decision summary -> Studio entry notice and preset recommendation metadata -> docs report.
- API or interface changes: None.
- Migration or compatibility notes: Existing Character Showcase template id `boss-showcase` remains unchanged.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Over-promising stability | Entry says continue and users infer all cases work | Bad material enters campaigns | Notice says constrained continue and lists high-risk directions | Builder |
| Provider scope creep | Attempting to improve failed samples through provider edits | Protected service risk | Keep provider/backend video files forbidden | Builder |
| Preset mismatch | Preset chips encourage directions the ledger rejects | More failed generations | Add recommendation metadata and tests | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | 10 records exist for 5 characters x 2 directions. | Unit tests + docs | Fixture contains reveal and skill/selling-point samples for each character. |
| AC-02 | Decision is `continue`, `experimental`, or `pause`, with <3/10 preventing `continue`. | Unit tests | Current fixture evaluates to `continue` at 5/10 usable. |
| AC-03 | Report lists recommended/not-recommended directions, fit, and high-risk cases. | Unit tests + docs | Summary exposes recommended directions and high-risk cases. |
| AC-04 | Studio Character Showcase entry and preset guidance reflect conclusion. | Unit/source tests | `boss-showcase` returns validation notice and preset recommendation metadata. |
| AC-05 | Existing Studio template/preset behavior remains intact. | Existing tests | Template and quality preset tests pass. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | 5/10 usable samples lead to `continue` with constraints. |
| Edge cases | 2/10 usable leads to `experimental`; 0/10 usable leads to `pause`. |
| Error path | Empty sample set does not imply stability. |
| Regression | Existing Studio template visibility and preset groups still pass. |
| Stress/Stability | Decision helper remains deterministic across repeated calls. |

## 8) Delivery Artifacts
- Code changes: validation fixture/helper, Studio template notice, preset recommendation metadata, tests.
- Test evidence: targeted Node tests, backend/frontend builds, workflow guard, `bash scripts/eval.sh 2026-05-11-character-showcase-validation`.
- Documents to update: run artifacts, validation report, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`.
