# ReleaseDecision - 2026-05-11-production-character-library-owner-sync

## 1) Inputs Reviewed
- PlannerSpec: `docs/workflow/runs/2026-05-11-production-character-library-owner-sync/planner-spec.md`
- ChallengerReview: `docs/workflow/runs/2026-05-11-production-character-library-owner-sync/challenger-review.md`
- BuilderReport: `docs/workflow/runs/2026-05-11-production-character-library-owner-sync/builder-report.md`
- VerifierReport: `docs/workflow/runs/2026-05-11-production-character-library-owner-sync/verifier-report.md`
- Additional evidence:
  - `h5-video-tool-api/tests/characterLibraryOwnerSync.test.ts`
  - `h5-video-tool/tests/characterLibrarySaveSheet.test.ts`
  - `docs/workflow/runs/2026-05-11-production-character-library-owner-sync/eval-result.json`
  - `python scripts/workflow_guard.py --run-id 2026-05-11-production-character-library-owner-sync --stage build`
  - `python scripts/workflow_guard.py --run-id 2026-05-11-production-character-library-owner-sync --stage verify`
  - `python scripts/workflow_guard.py --run-id 2026-05-11-production-character-library-owner-sync --stage release`

## 2) Delivery Decision
- Decision: GO for commit to `main`, staging deployment, staging smoke verification, release-ready marking, prod deployment, prod smoke verification, and idle restore.
- Decision time: 2026-05-11T13:00:00Z
- Decision owner: codex

## 3) Blocking Issues
| ID | Severity | Description | Owner | Required before release |
|---|---|---|---|---|
| [None] | - | No blocking issues found. | - | - |

## 4) Accepted Risks
| Risk | Severity | Why accepted | Boundary/Workaround | Follow-up date |
|---|---|---|---|---|
| Character deletion does not clean synced Asset Library assets | Low | This run is about owner isolation and visibility, not destructive lifecycle coupling. | Operators can still delete assets explicitly in Asset Library if needed. | Future asset lifecycle policy review |

## 5) Scope Compliance
- Delivered in scope: owner-scoped Character Library persistence, Asset Library sync for saved character images, portrait-preview save correctness, frontend save feedback improvements, regression coverage, and release docs.
- Out-of-scope changes found: None.
- Notes: No forbidden provider/pipeline service files or new env vars were touched.

## 6) Release Boundary
- What is guaranteed: Saved character images now appear in the same account's Asset Library as `character_image` assets, portrait-preview saves persist the current preview look, Character Library reads/writes are owner-scoped, and shared imports are rebound to the importing owner.
- What is not guaranteed: automatic asset cleanup when deleting a Character Library record.
- Environments validated so far: local targeted regression + API/frontend production builds passed. Staging and prod verification remain Release Owner execution steps.

## 7) Next Actions
1. Stage only the scoped files for this run and commit them on `main`.
2. Push the release candidate SHA to `origin/main`.
3. Deploy staging, run staging smoke, and mark the verified SHA as release-ready.
4. Deploy prod, run prod smoke, and restore prod deployment state to `idle`.

## Addendum - v0.203 release note
- Follow-up release scope: patch URL-backed production-image sync for Character Library saves so Advanced Studio preview-modal saves create real owner-scoped Asset Library rows.
- Extra release consideration: if operators need already-saved preview characters to appear without manually saving again, run a one-time backfill against existing owner-scoped Character Library JSON after the code deploy.
