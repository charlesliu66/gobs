# PlannerSpec - 2026-05-11-production-character-library-owner-sync

## 1) Problem Statement

Advanced Studio's "保存到形象库" flow only wrote character JSON into a shared `character-library/` directory and did not synchronize any image into the newer owner-scoped Asset Library. That created two product bugs:

1. Saved character appearances did not appear in `/asset-library`.
2. Character library storage lacked explicit owner isolation, so the model risked cross-account data mixing.

## 2) Desired Outcome

When an operator saves a character appearance from Advanced Studio:

1. The character entry is persisted under the current authenticated account only.
2. The saved base image, wardrobe states, and saved look-tree images are synchronized into that same account's Asset Library.
3. The Asset Library records are tagged as reusable character images and can be seen from the normal Asset Library UI.
4. Save success/failure is obvious in the Advanced Studio UI.
5. Saving directly from the portrait preview modal persists the current preview image and look-tree intent, so the same image shows up in the owner's Asset Library.
6. The sync path accepts both inline image payloads and the saved production-image URLs emitted by Advanced Studio preview uploads.

## 3) Scope

### In Scope
- `character-library` route ownership and storage fixes
- owner-scoped disk layout for character JSON
- Asset Library synchronization for saved character images
- frontend save feedback and compatible return types
- portrait-preview save payload normalization for replace/branch intent
- local regression test coverage
- production-image URL sync support for saved preview assets

### Out of Scope
- deleting Asset Library files when deleting a character
- provider-side image generation logic
- legacy asset APIs outside the new Asset Library route

## 4) Technical Approach

### Backend
- Require `req.user.username` for all Character Library mutations and reads.
- Move character JSON storage to `character-library/<username>/`.
- Add a dedicated sync helper that:
  - parses image data URLs
  - resolves saved `/api/production/image?path=...` references back to owner-scoped readable files
  - writes owner-scoped asset files
  - upserts rows in `assets`
  - sets `team_category=character_image`
  - re-applies structured tags and thumbnail generation
- Persist `assetBindings` on the character record so repeat saves can update the same logical bindings.
- Extract production image path parsing so Character Library sync and the production image route use the same owner-scoped readable-path rules.

### Frontend
- Keep the existing save entry points, but include `lookTree` and `activeLookId` in the payload.
- Normalize portrait-preview saves before submission so the just-generated preview image becomes the effective saved look for both replace and branch flows.
- Surface save failures instead of swallowing them.
- Make success copy explicit that Asset Library sync happened.

## 5) Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| Existing shared character files do not carry owner metadata | Older files may not match the new owner-scoped layout | New flow only reads/writes the owner-scoped path; imports rebind to the current owner |
| Same image may be present in base/state/look slots | Blind sync could create noisy duplicates | De-duplicate identical image payloads within the same save operation by content hash |
| Asset Library visibility may still fail if the category is not recognized | Saved assets would exist but remain hard to find | Use the existing recognized category `character_image` and verify via normal list APIs |
| Saved preview images may be stored as API URLs rather than inline base64 | Sync could silently skip the image and report zero assets | Add URL-backed regression coverage and resolve production-image URLs back to readable owner-scoped files |

## 6) Acceptance Criteria

- AC-01: Character Library save/list/get/delete/share/import are owner-scoped.
- AC-02: Saving from Advanced Studio creates visible `character_image` assets for the same account.
- AC-03: Cross-account reads do not expose another user's character entries or synced assets.
- AC-04: Re-saving the same save payload produces stable bindings and de-duplicates identical images within the same save action.
- AC-05: Backend build, frontend build, and a targeted regression test pass.
- AC-06: Saving from the portrait preview modal uses the current preview image and active look intent in the synchronized payload.
- AC-07: Saving a character whose image fields contain `/api/production/image?path=...` URLs still creates visible `character_image` assets for the same account.

## 7) Test Matrix

| Area | Check |
|---|---|
| Owner isolation | Save as `owner_a`, verify `owner_b` cannot list or read the character |
| Asset sync | Save a character and verify Asset Library list returns `character_image` for that owner |
| Preview save path | Save from portrait preview modal in replace/branch mode and verify the outgoing sheet aligns with the current preview |
| URL-backed sync | Save a character whose image fields are production-image URLs and verify Asset Library rows still appear |
| Duplicate handling | Base/state/look using the same image should produce one unique asset row in the test scenario |
| Build | `npm run build` in API and frontend |
| Regression | `node --import tsx --test tests/characterLibraryOwnerSync.test.ts` |
| Frontend regression | `npx tsx --test tests/characterLibrarySaveSheet.test.ts` |

## 8) Release Notes Requirement

Update both `PRODUCT.md` and `CHANGELOG.md` with the owner-scoped Character Library + Asset Library sync behavior before release.
