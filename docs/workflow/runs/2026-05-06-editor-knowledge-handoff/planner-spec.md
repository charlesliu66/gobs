# PlannerSpec - 2026-05-06-editor-knowledge-handoff

## 1) Project Goal
- Business goal: Carry Campaign Creative knowledge context into editor handoff, prompt, and memory.
- User value: Keep brand, market, audience, and compliance context alive after Campaign Creative hands off into Editor so the first cut stays on-strategy.
- Success metrics:
  - EditorWorkbench restores applied knowledge context from Campaign Creative handoff without breaking older handoff payloads.
  - Editor apply/apply-stream pass knowledge context into prompt assembly and memory promotion.
  - Editor memory surfaces knowledge-derived facts/preferences/avoid signals after the first apply, and the no-knowledge path still behaves exactly like the current brief-driven flow.

## 2) Scope
### In Scope
- Campaign Creative handoff payload updates so applied knowledge context and pack provenance can reach Editor.
- EditorWorkbench restore/normalize changes so knowledge-aware strategy fields are not dropped on entry.
- Backend editor apply/apply-stream normalization, prompt assembly, and memory promotion for knowledge context.
- Targeted frontend/backend tests plus run artifacts and product/changelog updates for this slice.

### Out of Scope
- Knowledge Brain storage/import/derive behavior
- New campaign strategy heuristics or Campaign Creative selector UX changes
- Editor timeline generation logic unrelated to prompt/memory knowledge wiring
- New env vars, deployment behavior, or production service contracts

## 3) Module Breakdown
- Campaign handoff seam:
  - Responsibilities: Persist the applied knowledge context from Campaign Creative and restore it safely in EditorWorkbench.
  - Dependencies: `CampaignCreative.tsx`, `model.ts`, `EditorWorkbench.tsx`, editor-side normalization helpers.
- Editor prompt and memory path:
  - Responsibilities: Normalize knowledge context into the editor apply payload, promote it into structured memory buckets, and include it in the prompt block consumed by the agent.
  - Dependencies: `editorAgent.ts`, `editorCreativeBrief.ts`, `editorAgentService.ts`, `editorMemoryCompression.ts`.
- Editor visible strategy surface:
  - Responsibilities: Keep the applied knowledge visible in the editor strategy card so operators can confirm what constraints the first run is using.
  - Dependencies: `AgentPanel.tsx`, frontend editor creative types.
- Verification/docs:
  - Responsibilities: Cover the handoff seam with targeted tests and keep workflow/product history current.
  - Dependencies: frontend/backend tests, workflow guard, `PRODUCT.md`, `CHANGELOG.md`.

## 4) Technical Approach
- Architecture decisions:
  - Keep `knowledgeContext` as a structured object instead of flattening raw markdown into the editor prompt.
  - Preserve knowledge-aware strategy fields on the editor side so the existing strategy card can stay the primary visible summary.
  - Treat older handoff payloads as valid input; all new knowledge fields remain additive and optional.
- Data flow:
  - Campaign Creative already derives `knowledgeContext` before building a strategy.
  - On launch, the page will serialize the applied `knowledgeContext` plus its pack ids alongside `brief`, `strategy`, and `variantPack`.
  - EditorWorkbench restores that payload, keeps the knowledge-aware strategy fields intact, and forwards both strategy and knowledge context to `/api/editor/agent/apply-stream`.
  - Backend normalize/apply logic promotes `marketTruth` and `audienceTension` into stable facts, `toneRules` and `visualCues` into preference signals, and `forbiddenClaims` into avoid signals.
  - Prompt assembly adds an explicit applied-knowledge block so the first edit run sees the same campaign constraints that were visible in Campaign Creative.
- API or interface changes:
  - Extend frontend and backend editor creative types with additive knowledge-aware fields.
  - Extend editor apply/apply-stream request bodies with optional `knowledgeContext` and `knowledgePackIds`.
- Migration or compatibility notes:
  - Older handoff payloads and brief-only editor requests must still normalize successfully.
  - If no knowledge context exists, prompt and memory behavior should match the current baseline.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Silent knowledge loss | Handoff restore or apply normalization drops additive fields | Editor falls back to brief-only behavior without the operator noticing | Keep explicit knowledge fields in both payload and strategy normalization; cover with seam tests | Builder |
| Backward-compat regressions | New fields accidentally become required | Older handoffs or manual editor briefs break | Keep normalization additive and optional; add no-knowledge tests | Builder |
| Prompt bloat | Too much raw knowledge text is appended | Editor agent becomes noisy or less decisive | Use a structured, limited knowledge block and reuse compressed memory buckets | Builder |
| Memory over-promotion | Too many knowledge entries flood stable facts/preferences | AgentMemoryPanel becomes noisy and operators stop trusting it | Cap and group promoted items by bucket with deterministic ordering | Builder |
| Product history drift | Slice ships without product/changelog updates | Lost traceability for the editor knowledge handoff milestone | Update `PRODUCT.md` and `CHANGELOG.md` before verify/release | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Campaign Creative handoff preserves applied knowledge context and knowledge pack ids into EditorWorkbench. | Frontend seam test plus manual restore path inspection | EditorWorkbench can restore a handoff payload that contains knowledge fields, keep them on the active strategy, and pass them toward the editor agent path without breaking older payloads. |
| AC-02 | Editor apply/apply-stream carry knowledge context through normalization into prompt and memory promotion. | Backend prompt/memory tests plus manual apply flow | Prompt assembly shows an applied-knowledge block, and the resulting project memory contains knowledge-derived stable facts, preferences, and avoid signals after the first apply. |
| AC-03 | Existing creative-brief-only behavior remains compatible when no knowledge context is present. | Frontend/backend no-knowledge tests plus build/typecheck | Brief-only editor requests still normalize and build the same as before when no knowledge context exists. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Campaign Creative hands off a knowledge-aware strategy -> EditorWorkbench restores it -> first apply uses the same knowledge constraints. |
| Edge cases | Older handoff payload without knowledge fields; strategy exists but knowledge arrays are empty; knowledge context exists but no variant pack exists. |
| Error path | Manual editor brief with no knowledge context; malformed optional knowledge payload should be ignored rather than crash restore/apply. |
| Regression | Existing creative-brief-only editor flow still builds prompt and memory correctly. |
| Stress/Stability | Repeated apply runs after the first handoff do not duplicate knowledge-derived memory entries in a way that breaks rendering or prompt assembly. |

## 8) Delivery Artifacts
- Code changes: campaign handoff payload updates, editor normalization/prompt/memory wiring, visible editor strategy tweaks, targeted tests, run docs.
- Test evidence:
  - `h5-video-tool-api` targeted tests for creative brief and memory compression
  - `h5-video-tool` targeted tests for editor creative brief / handoff seam
  - `cd h5-video-tool-api && npx tsc --noEmit`
  - `cd h5-video-tool && npm run build`
  - workflow guard build/verify/release checks
  - `bash scripts/eval.sh 2026-05-06-editor-knowledge-handoff`
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
