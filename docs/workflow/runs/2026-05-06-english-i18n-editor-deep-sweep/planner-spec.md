# PlannerSpec - 2026-05-06-english-i18n-editor-deep-sweep

## 1) Project Goal
- Business goal: Localize AgentPanel, AgentMemoryPanel, and the remaining high-traffic ProductionWizard input/story/workspace surfaces for English UI mode.
- User value: English-speaking editors and operators can work through agent guidance and ProductionWizard core steps without being pushed back into mixed Chinese copy.
- Success metrics: targeted surfaces render English UI copy consistently, the scoped files stop using `pickUiText(...)`, and staging/prod smoke verification passes on the released SHA.

## 2) Scope
### In Scope
- `AgentPanel` and `AgentMemoryPanel` English i18n cleanup, including creative-brief controls, agent progress logs, memory summaries, and action buttons.
- `StepInput`, `StepStoryArc`, and `StepStoryboardWorkspace` English i18n cleanup for high-traffic controls, helper text, asset picker copy, and storyboard workspace status summaries.
- Shared message-key additions and locale tests needed to support those surfaces.
- Repo scan for remaining nearby English i18n residue after this batch, with summary recorded in verifier/release artifacts.
- Run docs, changelog entry, verification evidence, and release through staging then prod.

### Out of Scope
- Backend service / route changes
- Any AGENTS forbidden files
- New env vars or locale storage changes
- Whole-repo migration of every remaining `pickUiText(...)` caller
- New product behavior outside the minimum needed to keep localized copy accurate

## 3) Module Breakdown
- Editor agent surfaces:
  - Responsibilities: Move `AgentPanel` and `AgentMemoryPanel` onto shared locale keys/helpers, localize dynamic labels and counters, and avoid mixed-language agent progress/status wording.
  - Dependencies: `useLocale`, `messages.ts`, `locale.ts`, `EditorWorkbench.tsx`, editor memory/creative types.
- ProductionWizard core steps:
  - Responsibilities: Localize `StepInput`, `StepStoryArc`, and `StepStoryboardWorkspace`, including asset-picker messaging, story-arc labels, queue/platform summaries, and shot navigation helper text.
  - Dependencies: `useLocale`, `messages.ts`, `locale.ts`, production types, queue-state helpers, asset-library API.
- Verification and release:
  - Responsibilities: Keep scope explicit, run workflow guard/tests/builds, update docs, and release via `staging -> verify -> prod`.
  - Dependencies: `scripts/workflow_guard.py`, `node --test`, frontend build, backend `npx tsc --noEmit`, deploy scripts, smoke scripts.

## 4) Technical Approach
- Architecture decisions:
  - Prefer shared `messages.ts + t(...) + formatMessage(...)` for newly touched UI strings instead of expanding `pickUiText(...)`.
  - Keep enum-like labels and counters in small local helpers only when they map cleanly onto shared keys.
  - Limit this run to the named editor/ProductionWizard surfaces; adjacent files stay read-only unless a small string-wiring change is required to keep the targeted UI coherent.
- Data flow:
  - `SESSION-ANCHOR.md` defines the editable scope.
  - Scoped components consume `useLocale()` -> `t(path)` -> `messages.ts`; interpolated copy goes through `formatMessage(...)`.
  - Repo scans for `pickUiText(` and hardcoded `zh-CN` formatting feed verifier/release notes.
- API or interface changes:
  - No backend API contract changes.
  - Frontend-only message-key additions and targeted tests.
- Migration or compatibility notes:
  - Chinese UI behavior should remain unchanged.
  - Residual `pickUiText(...)` outside this run will be documented rather than silently expanded.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Dirty main worktree | Root workspace still carries unrelated local edits | Release may accidentally bundle extra content | Keep implementation and release in the isolated worktree, stage only scoped files, and push a single verified commit to `origin/main` | Integrator |
| Deep string surface | `AgentPanel` and `StepStoryboardWorkspace` contain many inline labels and interpolations | Partial cleanup could still leave mixed-language English UI | Convert targeted files fully within scope and rerun repo scans before release | Builder |
| Message-key drift | New nested keys are added quickly across editor and ProductionWizard trees | Missing keys or bad interpolation can regress English mode | Extend locale tests with representative new keys and dynamic placeholders | Builder |
| Release mismatch | Staging validates one SHA but prod deploy uses another | Smoke results become unreliable | Keep release tied to the pushed `origin/main` SHA and verify commit IDs on both environments | Integrator |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | `AgentPanel` and `AgentMemoryPanel` render English UI copy through shared keys/helpers | Targeted locale test additions plus manual code inspection of the scoped files | No `pickUiText(...)` remains in either file and visible English UI strings are key-driven |
| AC-02 | `StepInput`, `StepStoryArc`, and `StepStoryboardWorkspace` no longer show mixed Chinese copy in English mode for the targeted controls and status text | Frontend build, locale test additions, and scoped file scan | No `pickUiText(...)` remains in the three scoped step files and their high-traffic strings map to shared locale keys |
| AC-03 | Repo scan captures the next remaining English-i18n residue after this batch | Search for `pickUiText(` and `toLocale*(\"zh-CN\")`, summarize in verifier/release docs | Remaining residue is explicitly listed and no new direct `zh-CN` formatting exists in `h5-video-tool/src` |
| AC-04 | Release follows `staging -> verify -> mark_release_ready -> prod -> verify -> idle` on the intended commit | Deployment logs and smoke verification evidence | Staging and prod both serve the released SHA and core routes stay healthy |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | English mode renders the targeted editor agent and ProductionWizard core-step surfaces with localized copy. |
| Edge cases | Dynamic counters, selected-asset hints, queue summaries, and confidence labels interpolate correctly in both languages. |
| Error path | Asset-library load/fetch failures and agent cancellation/error logs still render safe localized fallbacks. |
| Regression | Existing locale helpers, prior i18n batches, and Chinese UI behavior continue to build and pass locale tests. |
| Stress/Stability | Workflow guard and release flow still succeed from the isolated worktree while the root workspace remains dirty. |

## 8) Delivery Artifacts
- Code changes: targeted frontend components, shared i18n files, run docs, `PRODUCT.md`.
- Test evidence: `node --test src/i18n/locale.test.ts`, frontend `npm run build`, backend `npx tsc --noEmit`, workflow guard output, staging/prod smoke reports.
- Documents to update: run artifacts and `PRODUCT.md`.
