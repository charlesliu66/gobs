# PlannerSpec - 2026-05-09-distribution-step-refinement

## 1) Project Goal
- Business goal: Continue the Distribution Center optimization by turning `/distribute` into a clearer four-step operator workspace.
- User value: Market operators can scan the current publishing flow as asset -> copy -> accounts -> confirmation without losing the existing Campaign Package and quick publish paths.
- Success metrics: `TabDistribute` owns orchestration/state, four reusable step components own visual sections, existing publish semantics are unchanged, and local verification stays green.

## 2) Scope
### In Scope
- Extract four visual step components:
  - `DistributeStepAsset`: asset/package intake and selected asset surface.
  - `DistributeStepCopy`: inherited Campaign context, caption hint/generation, and platform copy cards.
  - `DistributeStepAccounts`: account group quick select, account filters, and account grid/list.
  - `DistributeStepPublish`: preflight checklist, publish options, publish trigger, latest batch/status summary.
- Keep all state, effects, API calls, polling, publish handlers, package hydration, and route query handling in `TabDistribute`.
- Preserve existing `AccountGroupPicker`, `PlatformCopyCards`, `DistributeAssetPicker`, `DistributePreflightChecklist`, and `DistributePublishHistory` behavior.
- Add focused render/presence tests that prove the new step components exist and keep the expected operator landmarks.
- Update `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`, and run artifacts.

### Out of Scope
- Backend GeeLark publish/history API changes.
- Scheduling, approval workflow, CSV export, analytics feedback, or data return loops.
- New global state library, new dependencies, backend package schema changes, or provider changes.
- Production deployment before explicit user approval.

## 3) Module Breakdown
- `TabDistribute` orchestration:
  - Responsibilities: state ownership, package query hydration, account/caption/publish API calls, latest batch polling, history loading, and composition of the four steps.
  - Dependencies: existing frontend API clients, i18n messages, distribute helper components.
- Step components:
  - Responsibilities: render labeled workflow sections, receive values/callbacks via props, expose no side effects beyond user callbacks.
  - Dependencies: existing presentational components and helper types.
- Tests:
  - Responsibilities: protect component presence and key copy/behavior markers without requiring live GeeLark APIs.
  - Dependencies: `node:test`, React server rendering, existing test loader pattern.

## 4) Technical Approach
- Extract JSX in small slices without changing publish or polling functions first.
- Prefer structural local prop types inside each new component over introducing a broad state model.
- Keep callback props primitive and explicit so future runs can move logic without guessing which component owns behavior.
- Do not force a wizard; the page remains one scrollable workspace with four visual blocks.
- Keep package and direct paths inside each relevant step through conditional rendering, not two separate pages.
- Do not edit forbidden backend files or GeeLark account config.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Publish regression | Moving JSX accidentally changes disabled state, selected account grouping, or publish options | Operators cannot publish or publish wrong copy/account set | Keep handlers/state in `TabDistribute`; compare old and new props while extracting; run build/tests/eval | Builder |
| Package intake regression | Package-specific context moves into the wrong step or loses inherited copy | Campaign -> Distribution handoff weakens | Keep package hydration untouched; render inherited context in copy step; add presence checks | Builder |
| Prop explosion | Components become hard to review because too many callbacks move at once | Future refactor becomes brittle | Extract visual blocks only; accept explicit props for this run; avoid shared store | Builder |
| Visual clutter | Four step wrappers add too much chrome to an already dense page | UX gets heavier instead of clearer | Use existing card/border/tailwind language and avoid extra explanatory text | Builder |
| Verification blind spot | Render tests do not cover live browser layout | Overlap or broken layout might slip | Run frontend build and local visual/browser check if tooling is available; record limitation if not | Verifier |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | `TabDistribute` becomes a step orchestrator with four visible operator sections for asset, copy, accounts, and publish confirmation. | Code inspection + presence tests | `TabDistribute` imports and composes the four `DistributeStep*` components; step labels are visible. |
| AC-02 | New step components are presentational/callback driven and keep existing `TabDistribute` state ownership. | Code inspection | Step files define props and render children/existing controls; they do not own publish/package/history effects. |
| AC-03 | Campaign Package and direct publish paths keep current prefill, caption, account-group, preflight, latest-batch, and history behavior. | Focused tests + build/eval + visual check | Existing helper components remain wired through the new steps; no backend or provider files changed. |
| AC-04 | Focused render/presence tests plus frontend/backend build and eval pass. | Test commands | `node --test`, frontend build, backend build, and `bash scripts/eval.sh 2026-05-09-distribution-step-refinement` are recorded with PASS or clear blocker notes. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Direct publish path renders asset selector, caption hint/generation, account group picker, preflight checklist, publish trigger, latest batch/history surfaces. |
| Campaign package path | Package context remains read-only and platform copy cards still show account counts. |
| Edge cases | No accounts, no selected asset, no generated copy, and disabled publish states still surface through preflight. |
| Error path | Caption/history loading errors remain rendered by the orchestrator or existing components. |
| Regression | Existing `distributeSupport` tests continue passing; `distributionPendingPackagesPresence` still finds package intake wiring. |
| Visual | Desktop `/distribute` renders the four step sections without overlapping controls after Vite build/dev launch. |

## 8) Delivery Artifacts
- Code changes: `TabDistribute` and four step components under `h5-video-tool/src/components/distribute/`.
- Tests: focused distribution step component/presence tests and existing distribute support tests.
- Verification evidence: workflow guard, targeted tests, frontend/backend builds, eval result, and visual/browser check notes.
- Documents to update: `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`, builder/verifier/release artifacts.
