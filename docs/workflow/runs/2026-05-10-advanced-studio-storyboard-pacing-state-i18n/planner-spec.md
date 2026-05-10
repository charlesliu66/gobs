# PlannerSpec - 2026-05-10-advanced-studio-storyboard-pacing-state-i18n

## 1) Project Goal
- Business goal: Improve Advanced Studio storyboard pacing logic, character-state reference matching, and storyboard video text encoding guardrails
- User value: Market and operations users should get a more intelligent Studio that explains pacing choices, picks the correct character-state reference image for Seedance, and never shows broken text in storyboard video controls.
- Success metrics: A sourced Duration Plan product design exists; state aliases like 童年时期/小时候 map to the same reference state; storyboard video version/A-B Chinese labels render cleanly; mojibake is covered by a repeatable test.

## 2) Scope
### In Scope
- Research-backed recommendation for how script, target duration, shot count, and shot duration should be controlled in Advanced Studio.
- Character-state matching accuracy improvements in frontend Studio utilities and UI labels.
- Storyboard video version timeline/A-B compare Chinese mojibake repair.
- Automated i18n guard for common mojibake patterns.
- Product docs/changelog and run artifacts.

### Out of Scope
- No protected backend video-service changes.
- No deployment, release-ready marking, or prod/staging smoke from this Dev Worker window.
- No new AI provider, model, env var, or Seedance CLI behavior.
- No full implementation of Duration Plan pipeline in this run; document it as the next buildable phase.

## 3) Module Breakdown
- Pacing design:
  - Responsibilities: Convert external storyboard/animatic and ad creative references into a GOBS Duration Plan proposal for marketer/operator users.
  - Dependencies: `docs/plans`, `docs/workflow/runs/...`.
- Character-state resolver:
  - Responsibilities: Improve alias/fuzzy scoring for character states and expose state labels in storyboard reference UI.
  - Dependencies: `h5-video-tool/src/studio/productionAssets.ts`, storyboard sidebar/workspace components, tests.
- Locale guard:
  - Responsibilities: Repair visible mojibake in storyboard video controls and fail tests if user-facing locale strings contain common mis-encoded Chinese markers.
  - Dependencies: `h5-video-tool/src/i18n/messages.ts`, i18n tests.
- Documentation:
  - Responsibilities: Capture user-visible fixes and the next pacing phase in product docs.
  - Dependencies: `PRODUCT.md`, `CHANGELOG.md`, run reports.

## 4) Technical Approach
- Architecture decisions: Keep this run frontend-safe. Fix deterministic UI/state behavior now, and avoid touching backend generation services while the pacing design is still being validated.
- Data flow: `autoMatchCharacterStateBySheet` produces better state suggestions from shot text; the same state override path already feeds `getCharacterShotImage` and Seedance multimodal packs.
- API or interface changes: None.
- Migration or compatibility notes: Existing saved projects keep working. Manual `characterStateOverrides` still wins; improved auto-match only affects suggestions and default resolver behavior where no manual override exists.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Pacing scope creep | User's pacing concern suggests a large backend rewrite | Risky LLM pipeline changes without a full AC matrix | Ship sourced design now; keep pipeline rewrite for a dedicated follow-up run | Builder |
| State false positives | Broad synonyms match the wrong costume/age state | Wrong reference image sent to Seedance | Use weighted exact/alias scoring and preserve manual override priority | Builder |
| Mojibake guard overreach | Test flags code comments or intentional binary-like strings | False failures | Scope guard to locale message values first | Verifier |
| Protected-file pressure | Seedance flow tempts backend service edits | Regression risk | Stay within frontend resolver/UI and tests | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Advanced Studio pacing recommendation explains why simply stretching shot duration is wrong and proposes a Duration Plan layer. | Sourced design doc review | 60s vs 180s behavior is defined in terms of beat budgets, shot count, density, and max single-shot duration. |
| AC-02 | Character-state auto-match recognizes common age/period synonyms. | Unit tests | 童年时期/小时候/少年/childhood/young-style labels can match equivalent shot language. |
| AC-03 | Seedance reference UI reflects improved state resolution and manual override priority. | Unit/static tests + code review | Existing priority remains manual > default/auto > main look, with clearer suggested state labels. |
| AC-04 | Storyboard video version timeline/A-B Chinese copy is readable. | i18n test + static grep | No mojibake appears in repaired storyboard video message keys. |
| AC-05 | No protected files or release scripts are touched. | workflow guard + git diff | Diff excludes protected backend services and deployment actions. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Childhood/young-state aliases are matched from shot descriptions and state labels/notes. |
| Edge cases | Manual state override continues to override auto suggestions; unrelated states do not match by loose substring alone. |
| Error path | Locale test fails on mojibake patterns in message values. |
| Regression | Existing storyboard multimodal reference pack still uses `characterStateOverrides` and image availability. |
| Stress/Stability | Frontend build/test subset passes without protected backend edits. |

## 8) Delivery Artifacts
- Code changes: frontend state resolver/UI, locale messages/tests.
- Test evidence: targeted frontend tests, workflow guard dry-runs, build if feasible.
- Documents to update: sourced pacing design, run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
