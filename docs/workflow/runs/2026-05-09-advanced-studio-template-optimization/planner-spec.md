# PlannerSpec - 2026-05-09-advanced-studio-template-optimization

## 1) Project Goal
- Business goal: Turn Advanced Studio `/studio` from a broad template list into a focused Campaign Creative Agent production entry with three high-signal video creation modes.
- User value: A marketer can choose the right production path faster: quick concept validation, motion transfer, or character/product showcase, without being distracted by low-priority short-drama templates.
- Success metrics: Template count reduced from five visible/hidden configs to three Studio creation entries; removed templates cannot reappear via frontend fallback; baseline duration/aspect choices match the 2026-05-08 optimization plan.

## 2) Scope
### In Scope
- Remove `short-drama` and `cat-harem` from backend template loading and frontend Studio UI/fallbacks.
- Delete short-drama preset/config files and remove short-drama UI dependencies from `TabGenerate`.
- Hide `cg-trailer` from Studio template APIs and front-end fallback while keeping the JSON file on disk for a later Production Wizard preset handoff.
- Reposition `custom` as Quick Single, `viral-dance` as Motion Transfer, and `boss-showcase` as Character Showcase.
- Add template-scoped duration/aspect options and prevent prompt-polish metadata from overriding valid user choices.
- Add a lightweight prompt inspiration library for Quick Single.
- Update tests, `PRODUCT.md`, `CHANGELOG.md`, and run artifacts.

### Out of Scope
- Phase 2+ items requiring new APIs/assets/providers are documented but not implemented in this run: AI image generation API, BGM asset library, FFmpeg transitions, Runway/MiniMax/Kling upgrades, unified Asset Library selector rewrite, Campaign-to-Studio deep link, and prod release.

## 3) Module Breakdown
- Backend template registry:
  - Responsibilities: Return only Phase 1 Studio templates through `/api/prompt/templates`; keep legacy preset endpoint compatibility-safe.
  - Dependencies: `h5-video-tool-api/src/config/prompt-templates`, `h5-video-tool-api/src/routes/prompt.ts`, `h5-video-tool-api/src/services/promptPolish.ts`.
- Frontend Studio orchestration:
  - Responsibilities: Filter visible templates, reset template-scoped state, expose template-specific duration/aspect choices, and remove short-drama UI branches.
  - Dependencies: `TemplatePicker`, `TabGenerate`, `CreateFlowContext`, `StepVideo`, frontend prompt API helpers, placeholder utility.
- Template content:
  - Responsibilities: Rename and reframe Motion Transfer and Character Showcase metadata/prompts without changing protected generation services.
  - Dependencies: `viral-dance.json`, `boss-showcase.json`, frontend fallback data.
- Documentation and tests:
  - Responsibilities: Lock down visible template IDs and parameter option behavior.
  - Dependencies: `h5-video-tool/tests`, `PRODUCT.md`, `CHANGELOG.md`, run reports.

## 4) Technical Approach
- Architecture decisions: Keep template IDs stable for Phase 1 (`viral-dance`, `boss-showcase`) while changing marketer-facing naming, because renaming IDs would ripple into generation and history flows.
- Data flow: `TemplatePicker` selects a visible template, `TabGenerate` applies scoped defaults/options, `polishPrompt` may enrich copy, and `StepVideo` continues sending the selected duration/aspect/model to existing generation routes.
- API or interface changes: `/api/prompt/templates` no longer returns `cg-trailer`, `short-drama`, or `cat-harem`; `/api/prompt/short-drama-presets` returns `{ presets: [] }` for compatibility.
- Migration or compatibility notes: Existing generated videos are untouched. Existing direct calls to removed template IDs receive fallback/freeform behavior rather than a new provider path.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Frontend fallback resurrects removed templates | API unavailable or returns empty list | Studio still shows short-drama/cg-trailer | Update fallback data and add regression tests | Builder |
| Prompt polish overwrites flexible settings | Backend template metadata returns default duration/aspect | User-selected 10s or 9:16/1:1 gets silently reset | Keep valid current choices for flexible templates | Builder |
| Deleting short-drama files breaks imports | Backend registry or frontend TabGenerate still imports removed files/functions | Build/runtime failure | Remove imports first; keep endpoint empty | Builder |
| Scope creep into Phase 2 | AI image/BGM/model additions look tempting | New env/provider risk and protected file pressure | Document as backlog only; enforce forbidden paths | Integrator |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Studio template picker shows only Quick Single, Motion Transfer, and Character Showcase. | Frontend tests + manual/static grep | `custom`, `viral-dance`, `boss-showcase` are the only creation entries. |
| AC-02 | Removed templates do not reappear via backend registry or frontend fallback. | Backend/frontend tests | `short-drama`, `cat-harem`, and `cg-trailer` are absent from active template APIs/fallbacks. |
| AC-03 | Short-drama preset flow is removed without breaking legacy callers. | TypeScript build + route/client tests | Preset API/client returns an empty list and `TabGenerate` has no short-drama branch. |
| AC-04 | Flexible template options work for Phase 1. | Pure helper tests | Quick Single: 4/6/8/10s and 9:16/16:9/1:1; Motion Transfer: 5/8/10s; Character Showcase: 9:16/16:9. |
| AC-05 | Prompt inspiration exists for Quick Single. | Frontend test/static render | Inspiration config is available and chips can seed the prompt. |
| AC-06 | Protected services are untouched. | `workflow_guard` + `git diff --name-only` | No edits under protected service/config/type files. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Studio creation list returns three marketer-facing templates and selecting each applies correct default options. |
| Edge cases | API failure uses frontend fallback without resurrecting removed templates; empty preset response does not show short-drama UI. |
| Error path | Deleted JSON/preset/component imports are gone; builds fail if any stale import remains. |
| Regression | Existing video generation payload still receives `duration`, `aspectRatio`, `templateId`, and `referenceVideoUrl` for supported templates. |
| Stress/Stability | Full `bash scripts/eval.sh 2026-05-09-advanced-studio-template-optimization` after frontend/backend builds. |

## 8) Delivery Artifacts
- Code changes: template registry/config cleanup, Studio UI cleanup, option helpers, prompt inspiration config, tests.
- Test evidence: frontend node tests, backend template config tests if feasible, workflow guard dry-runs, `bash scripts/eval.sh 2026-05-09-advanced-studio-template-optimization`.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
