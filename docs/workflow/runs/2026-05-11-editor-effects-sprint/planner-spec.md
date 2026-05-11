# PlannerSpec - 2026-05-11-editor-effects-sprint

## 1) Project Goal
- Business goal: Add a small tested catalog of editor packaging effect templates without changing render/export engines.
- User value: Let operators add common game-ad packaging, CTA, and transition treatment from the editor without hand-building every text layer.
- Success metrics: 5-8 templates are available, deterministic text clips can be applied, existing preview/export paths remain unchanged, and targeted tests cover the template contract.

## 2) Scope
### In Scope
- A typed `editor/effectTemplates` catalog for packaging templates.
- Deterministic helpers that turn a template into existing `TextClip` objects and optional existing `crossfade` transition intent.
- A small editor workbench menu to apply a template at the current playhead.
- Targeted frontend tests for template coverage and timing behavior.
- Product, changelog, task-index, and workflow run documentation.

### Out of Scope
- AE/Lottie/project-file import or compatibility.
- FFmpeg/export service edits.
- Provider service, video generation, Campaign, Distribution, or Asset Library changes.
- New persistent data model or backend storage.
- Full editor visual redesign or large component refactor.

## 3) Module Breakdown
- Effect template catalog:
  - Responsibilities: Define template metadata, supported aspect ratios, text-layer specs, export/preview capability flags, and helper functions.
  - Dependencies: `TextClip`, `TextPresetId`, `ClipTransition`, `TEXT_PRESETS`.
- Editor workbench integration:
  - Responsibilities: Show a compact packaging menu and apply selected template to the current timeline.
  - Dependencies: `EditorWorkbench`, existing text clip upsert helpers, existing transition helper.
- Tests and docs:
  - Responsibilities: Guard the template contract and record the sprint decision.
  - Dependencies: Node test runner with TypeScript stripping or `tsx --test`.

## 4) Technical Approach
- Architecture decisions: Reuse current editor primitives. Templates create `TextClip` records using existing text presets; transition templates can request the existing `crossfade` flag on the selected video clip. This keeps preview handled by `TextOverlayRenderer` and export handled by the existing export path.
- Data flow: Operator selects a template in `EditorWorkbench` -> helper builds clamped text clips from `currentTime`, `project.durationSec`, and `project.aspectRatio` -> workbench upserts clips and optionally applies `crossfade` to the selected video clip.
- API or interface changes: Frontend-only helper and UI addition. No network API changes.
- Migration or compatibility notes: Existing projects continue to load because templates are not persisted as a new model; only normal text clips and transition flags are saved.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Export mismatch | Template uses a preset unsupported by existing export | Preview/export promise becomes misleading | Tests validate every layer uses an existing `TEXT_PRESETS` id and template capability metadata is explicit | Builder |
| Timeline edge cases | Current playhead is near the end or duration is very short | Invalid text clip ranges or invisible overlays | Helper clamps start/end and tests short-duration behavior | Builder |
| UI crowding | Editor top bar already has many actions | Controls wrap awkwardly | Use a compact menu and keep labels short | Builder |
| Scope creep | Treat sprint as full visual effects engine | Run becomes high risk | Out of scope forbids engine/backend/AE work | Integrator |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | 5-8 editor effect templates cover frame, transition, character, battle, and CTA/end-card packaging. | `editorEffectTemplates.test.ts` category/count assertions. | At least 6 templates, all required categories present. |
| AC-02 | Templates only use existing preview/export primitives. | Test all layer preset IDs against `TEXT_PRESETS`; code review confirms no export/backend edits. | Every template has `previewSupported` and `exportSupported` true; no forbidden files changed. |
| AC-03 | Workbench can apply templates deterministically. | Build plus source inspection; optional manual smoke at `/editor`. | Template application inserts text clips and applies `crossfade` when recommended. |
| AC-04 | Timing and short-project edges are guarded. | Tests for clamping and nonzero duration. | Generated clips stay within project duration and retain valid start/end. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Apply a CTA or character template at a normal playhead and receive text clips using existing presets. |
| Edge cases | Apply near the end or to a very short project; ranges clamp into visible clips. |
| Error path | Unknown template id returns no template and builds no clips. |
| Regression | Existing text preset catalog remains the compatibility source of truth. |
| Stress/Stability | All templates pass the same validation loop and do not depend on runtime storage or network calls. |

## 8) Delivery Artifacts
- Code changes: frontend helper module, editor workbench menu, targeted tests.
- Test evidence: `npx tsx --test tests/editorEffectTemplates.test.ts`, frontend/API build, workflow guard, `bash scripts/eval.sh 2026-05-11-editor-effects-sprint`.
- Documents to update: run artifacts, plan doc, `docs/TASK-INDEX.md`, `PRODUCT.md`, `CHANGELOG.md`.
