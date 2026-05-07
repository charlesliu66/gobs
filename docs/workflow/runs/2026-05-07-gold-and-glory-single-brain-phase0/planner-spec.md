# PlannerSpec - 2026-05-07-gold-and-glory-single-brain-phase0

## 1) Project Goal
- Business goal: Collapse marketer-facing multi-project brain UI into a Gold and Glory only brain shell while keeping future extensibility internal.
- User value: Keep marketers inside a single, trustworthy Gold and Glory flow instead of exposing project abstractions or demo data that do not match reality.
- Success metrics: No `Project Nova Arena` or other demo-project language remains on marketer-facing campaign surfaces, and the brain shell clearly points to Gold and Glory without overstating real fastpublish ingestion status.

## 2) Scope
### In Scope
- Gold-and-Glory-only defaults for the frontstage platform memory context.
- Marketer-facing `Campaign Creative` brain copy and framing cleanup.
- Tests and docs required to lock this single-brain behavior in.

### Out of Scope
- Replacing the generic `fastpublish-core` import template with real Gold and Glory operating knowledge.
- Backend schema or route changes for campaign knowledge APIs.
- Broad `/platform/*` product redesign beyond the default single-game context fallout.

## 3) Module Breakdown
- Platform memory defaults:
  - Responsibilities: Replace demo multi-game defaults with a single Gold and Glory frontstage seed while keeping future extensibility internal.
  - Dependencies: `h5-video-tool/src/context/PlatformMemoryContext.tsx`.
- Campaign brain shell:
  - Responsibilities: Remove visible project/game framing from the knowledge selector and tighten Gold and Glory copy.
  - Dependencies: `h5-video-tool/src/pages/CampaignCreative.tsx`, `h5-video-tool/src/components/campaign/CampaignKnowledgeSelector.tsx`, `h5-video-tool/src/i18n/messages.ts`.
- Verification:
  - Responsibilities: Lock the new stable knowledge game id and frontstage copy through tests.
  - Dependencies: `h5-video-tool/tests/platformKnowledgeBrain.test.tsx`, `h5-video-tool/src/i18n/locale.test.ts`.

## 4) Technical Approach
- Architecture decisions: Keep the backend knowledge API untouched. Correct the frontstage shell by changing the default game seed and the UI framing that consumes it.
- Data flow: `PlatformMemoryContext` provides a single Gold and Glory seed -> `CampaignCreative` consumes that seed -> `CampaignKnowledgeSelector` renders a Gold-and-Glory-only brain shell -> strategy generation still calls the existing knowledge APIs with the new stable game id.
- API or interface changes: No backend contract change. Frontend component props may be simplified to remove explicit `current game` labeling.
- Migration or compatibility notes: Existing demo `g1/g2` frontstage assumptions will stop being used. If old local knowledge packs were stored under demo ids, they will no longer appear on the frontstage marketer path.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| False confidence about brain readiness | Copy implies real Gold and Glory fastpublish content is already ingested | Product trust regression | Keep empty-state and guardrail copy explicit about current capability boundary | Builder |
| Hidden compatibility loss | Existing local packs only exist under demo ids like `g1` | Brain appears empty after switching to the real game id | Accept as part of the shell correction and document it in verifier/release notes | Integrator |
| Scope drift into backend ingestion | Fixing the shell tempts us to also replace `fastpublish-core` | Release grows into a different feature | Lock backend schema/API work out of scope in SESSION-ANCHOR | Planner |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | `Campaign Creative` no longer shows `Project Nova Arena`, `Idle Kingdom Go`, or a `current game` label on the marketer-facing brain shell. | Targeted test + manual code inspection | Default knowledge section is Gold-and-Glory-only and free of demo project framing. |
| AC-02 | The single supported frontstage brain target is Gold and Glory. | Unit test on stable game id + manual code inspection | `isStableKnowledgeGameId` only treats the Gold and Glory id as stable for this shell. |
| AC-03 | Brain copy stays honest about current knowledge readiness. | Locale assertions + manual code inspection | Empty and fallback copy does not imply that real fastpublish knowledge has already been ingested. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | `Campaign Creative` renders a Gold-and-Glory-only brain shell and strategy flow still builds. |
| Edge cases | No packs exist for the Gold and Glory id, and the empty state stays honest instead of implying imported real data. |
| Error path | Knowledge derivation fails and the fallback warning still references brief-only generation. |
| Regression | Locale keys still resolve in both Chinese and English; stable knowledge id helper matches the new single-game default. |
| Stress/Stability | Frontend build and workflow guard pass without leaking unrelated root untracked files into the run. |

## 8) Delivery Artifacts
- Code changes: frontstage context, campaign knowledge selector shell, copy, tests.
- Test evidence: targeted frontend tests, frontend build, backend `tsc --noEmit`, workflow guard, `bash scripts/eval.sh 2026-05-07-gold-and-glory-single-brain-phase0`.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
