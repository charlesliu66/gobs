# BuilderReport - 2026-05-11-production-character-library-owner-sync

## 1) Inputs
- Spec file: `docs/workflow/runs/2026-05-11-production-character-library-owner-sync/planner-spec.md`
- Spec version/date: 2026-05-11T11:45:00Z
- Acceptance criteria covered: AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07

## 2) Implemented
| AC ID | What was implemented | Files changed | Notes |
|---|---|---|---|
| AC-01 | Converted Character Library storage and access to authenticated owner scope. | `h5-video-tool-api/src/routes/characterLibrary.ts` | Save/list/get/delete/share/import now resolve under `character-library/<username>/` and reject unauthenticated access. |
| AC-02 | Added Asset Library synchronization for saved character images. | `h5-video-tool-api/src/services/characterLibraryAssetSync.ts`, `h5-video-tool-api/src/routes/characterLibrary.ts` | Base image, state images, and look-tree images are synchronized as `character_image` assets for the same owner. |
| AC-03 | Enforced cross-account isolation and owner rebinding on import. | `h5-video-tool-api/src/routes/characterLibrary.ts` | Imported shared characters are rebound to the current owner and re-synced into that owner's Asset Library. |
| AC-04 | Improved save UX and payload completeness. | `h5-video-tool/src/components/production/CharacterPortraitEditorModal.tsx`, `h5-video-tool/src/components/production/CharacterWardrobePanel.tsx`, `h5-video-tool/src/api/characterLibrary.ts`, `h5-video-tool/src/components/CharacterLibraryPanel.tsx` | Save now includes `lookTree` and `activeLookId`, surfaces failures, and confirms Asset Library sync. |
| AC-05 | Added targeted regression coverage and updated release docs. | `h5-video-tool-api/tests/characterLibraryOwnerSync.test.ts`, `PRODUCT.md`, `CHANGELOG.md` | The backend regression proves owner isolation and Asset Library visibility for saved character assets. |
| AC-06 | Normalized portrait-preview saves so the current preview look is what gets persisted and synchronized. | `h5-video-tool/src/components/production/CharacterPortraitEditorModal.tsx`, `h5-video-tool/src/components/production/CharacterWardrobePanel.tsx`, `h5-video-tool/src/components/production/characterLibrarySaveSheet.ts`, `h5-video-tool/tests/characterLibrarySaveSheet.test.ts` | Replace saves now overwrite the intended look, branch saves append a new look, and no-preview saves fall back to the active look instead of stale base-image metadata. |
| AC-07 | Added owner-scoped parsing for saved production-image URLs so preview-upload references synchronize into Asset Library. | `h5-video-tool-api/src/utils/productionImagePath.ts`, `h5-video-tool-api/src/services/characterLibraryAssetSync.ts`, `h5-video-tool-api/src/routes/productionPersist.ts`, `h5-video-tool-api/tests/characterLibraryOwnerSync.test.ts` | The sync helper now accepts both inline base64 and `/api/production/image?path=...` inputs, matching the real preview-save payload shape. |

## 3) Not Implemented
| AC ID | Reason | Impact | Proposed next step |
|---|---|---|---|
| [None] | All accepted ACs are implemented. | None. | None. |

## 4) Self-Test Results
| Test type | Command/Method | Result | Evidence |
|---|---|---|---|
| Targeted backend regression | `cd h5-video-tool-api && node --import tsx --test tests/characterLibraryOwnerSync.test.ts` | PASS | Confirms save is owner-scoped, `owner_b` cannot read `owner_a` data, and saved character images show up as `character_image` assets for the same owner. |
| Targeted frontend regression | `cd h5-video-tool && npx tsx --test tests/characterLibrarySaveSheet.test.ts` | PASS | Confirms preview-modal save uses the current preview for replace/branch flows and falls back to the active look when no preview exists. |
| API build | `cd h5-video-tool-api && npm run build` | PASS | TypeScript build, asset copy, and build-info generation passed. |
| Frontend build | `cd h5-video-tool && npm run build` | PASS | `tsc -b` and Vite production build passed; only the pre-existing dynamic import warning remained. |
| Manual implementation audit | Code review of route + sync helper + UI save entry points | PASS | Verified account binding, sync coverage for base/state/look images, and UI error/success behavior. |

## 5) Known Risks and Uncertainties
- Risk: Deleting a Character Library entry does not delete its synced Asset Library asset files.
  - Why it remains: This run prioritizes safe reuse and owner isolation, not destructive lifecycle coupling.
  - Possible impact: Library cleanup remains a manual Asset Library action.
  - Suggested follow-up: Add an explicit "also remove synced assets" operator flow only if product confirms that lifecycle policy.

## 6) Scope Compliance Statement
- I did not expand scope beyond the approved PlannerSpec: Yes.
- If No, list deviations and reasons: None.

## 7) Change Summary
- What changed: Character saves are owner-scoped and synchronized into the owner's Asset Library with stable bindings, and portrait-preview saves now persist the current preview look instead of stale base-image state.
- Why changed: Operators saved role appearances in Advanced Studio but could not find the freshly previewed look in the material center, and the old storage path risked cross-account mixing.
- What did not change: Provider-side generation services, protected pipeline files, legacy asset endpoints, and deletion lifecycle policy.

## Addendum - v0.203 URL-backed sync follow-up
- Root cause confirmed in prod data: Character JSON entries were saved correctly for the owner, but Advanced Studio preview saves stored `/api/production/image?path=...` URLs rather than inline base64, and the sync helper only parsed `data:image/...`, so `assetCount` dropped to zero and no Asset Library row was created.
- Implementation follow-up:
  - Added `h5-video-tool-api/src/utils/productionImagePath.ts` to keep production image path parsing owner-scoped and reusable.
  - Updated `h5-video-tool-api/src/services/characterLibraryAssetSync.ts` to read both inline data URLs and saved production-image URLs into the same asset sync flow.
  - Extended `h5-video-tool-api/tests/characterLibraryOwnerSync.test.ts` with a regression covering the exact preview-save image URL shape.
- Follow-up self-test evidence:
  - `cd h5-video-tool-api && node --import tsx --test tests/characterLibraryOwnerSync.test.ts` -> PASS (2 tests)
  - Final release builds will be rerun after doc/version updates so build-info matches the release SHA.
