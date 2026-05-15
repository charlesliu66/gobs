# PlannerSpec - 2026-05-15-advanced-studio-video-generation-ux

## 1) Project Goal
- Business goal: make Advanced Studio video generation clear enough for operations and marketing users while keeping Seedance constraints honest.
- User value: operators can choose or upload the right reference assets inside the current mode without hunting through duplicate buttons or old Drive-first flows.

## 2) Scope
### In Scope
- Shared Seedance duration and source constraints for Advanced Studio single-generation modes.
- Unified reference-asset slots for Quick Single, Motion Transfer, and Character Showcase.
- Local upload for one-off generation use only; no automatic Asset Library import.
- Fold legacy Drive sourcing and external motion links behind a collapsed "More asset sources" entry.
- Ark Seedance backend duration clamp aligned to 4-15 seconds.

### Out of Scope
- New provider or model capability.
- Changes to protected Dreamina/Kling/Veo/studio pipeline service files.
- Deployment from this Dev Worker window.

## 3) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Seedance duration options are capped at 15 seconds for Quick Single, Motion Transfer, and Character Showcase. | `studioTemplateOptions.test.ts`; frontend build | No visible 30/60 second single-generation options. |
| AC-02 | All three modes use UnifiedAssetSelector slots that support local upload and Asset Library selection. | `unifiedAssetSelectorPresence.test.ts`; frontend build | Each mode has mode-specific slots and no standalone "choose reference from library" action in TabGenerate. |
| AC-03 | Seedance reference constraints reject unsupported formats, excessive counts, and audio-only generation. | `seedanceSourceConstraints.test.ts`; frontend build | Shared config enforces type, count, total, and visual-reference rules. |
| AC-04 | Legacy Drive sourcing is folded under collapsed "More asset sources". | Source review; frontend build | Main flow is creative description -> reference assets -> parameters -> generation confirmation. |
| AC-05 | Ark Seedance backend clamps duration into 4-15 seconds. | `arkSeedanceVideo.test.ts`; API build | Durations below 4 clamp to 4 and above 15 clamp to 15. |

## 4) Technical Approach
- Add `seedanceSourceConstraints.ts` as the single frontend contract for durations, accepted MIME/extensions, per-kind limits, total limits, and all-in-one readiness.
- Refactor `UnifiedAssetSelector` so slot cards support Asset Library and local upload through the same UI.
- Update `TabGenerate` to own slot selections, convert local/library image/video references into Dreamina multimodal payloads, and leave local uploads out of the Asset Library.
- Keep Drive and external URL compatibility available but behind a collapsed secondary source section.
- Change only `arkSeedanceVideo.ts` on the backend side; do not touch protected provider service files.

## 5) Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Local uploaded motion video cannot serve legacy Kling URL flow. | A local browser object URL is not backend-readable for Kling. | Local upload is treated as Seedance multimodal input; external URL remains under More asset sources for legacy compatibility. |
| Existing Drive matching expectations may differ from new primary flow. | Operators may still need old Google Drive browsing. | Drive match/manual browse remains available in the collapsed compatibility section. |
| Reference payload size can increase when selecting videos. | Large videos may increase request payload size. | Seedance limits cap video count at 3 and total refs at 12. |

## 6) Test Matrix
| Category | Cases |
|---|---|
| Unit | Duration options, reference constraints, unified selector wiring, locale copy, Ark clamp. |
| Build | Frontend `npm run build`; API `npm run build`. |
| Workflow eval | `scripts/eval.sh 2026-05-15-advanced-studio-video-generation-ux` via Git Bash. |

