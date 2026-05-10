# PlannerSpec - 2026-05-10-story-video-review-capture

## 1) Project Goal

- Business goal: collect human story-video quality reviews now that Run 0 quality/status contracts are merged.
- User value: operators can mark story-video output as usable, needs-fix, or unusable with repeatable issue tags, creating a sample trail for later quality panels and next-version work.
- Success metrics:
  - A story-video result has a visible manual review entry on the result page.
  - Saved records use Run 0 `ReviewContract` fields: `reviewId`, `outputId`, `status`, `issueTags`, `note`, `reviewerId`, `createdAt`.
  - Review copy clearly states it is human-entered, not automatic video understanding.

## 2) Scope

### In Scope

- Frontend-only review capture on `Result.tsx`.
- A small review store for story-video reviews, bucketed by current user and linked by output/task id.
- A reusable `StoryVideoReviewPanel` component.
- Node tests for review creation, filtering, fixed tags, and storage behavior.
- Story-video sample doc update.
- Product and changelog updates.

### Out of Scope

- Backend persistence routes.
- Campaign Output Workbench changes.
- `campaignOutputPlans.ts` or `campaignDistributionPackages.ts` changes.
- Provider service changes.
- Automatic diagnosis, scoring, LLM/video understanding, and next-version generation.

## 3) Module Breakdown

- Story review store:
  - Responsibilities: build `ReviewContract`-compatible records, save/load records, filter by output id, expose allowed story issue tags.
  - Dependencies: Run 0 `ReviewContract`, `CreativeIssueTag`, `CreativeQualityStatus`.
- Story review panel:
  - Responsibilities: render three quality buttons, fixed issue tags, optional note, saved review history, and human-review disclaimer.
  - Dependencies: story review store.
- Result page:
  - Responsibilities: derive a stable story `outputId` from Campaign Studio handoff or result task id and render the panel near next actions.
  - Dependencies: create-flow context and video history.

## 4) Technical Approach

- Use `productionItemId` from Campaign Studio handoff as `outputId` when present; otherwise derive `story_video_${taskId}` for standalone generated results.
- Save reviews in localStorage under a user-scoped key, matching the existing video history pattern. This is enough for Run 3 sample capture and should be replaced or bridged by backend persistence in a later run if cross-device review history is required.
- Keep issue tags to the Run 3 story set mapped to Run 0 tags:
  - `weak_opening`
  - `slow_pacing`
  - `unclear_selling_point`
  - `weak_ending`
  - `inaccurate_character`
- Do not evaluate video automatically; the UI asks the human reviewer to choose.

## 5) Risks

| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Local-only persistence | Browser storage is cleared or user changes devices | Review sample trail is not globally available | Label as result-side/local review history and keep records shaped for future backend migration | Builder |
| Misleading AI quality claim | Copy implies the system watched the video | Operator trust risk | Add explicit human-review wording | Builder |
| Shared-file conflict | Run touches Workbench or backend Campaign routes | Collision with Window A / future Run 2 or 4 | Anchor forbids shared files | Builder |
| Data cleanup regression | Review notes/result URLs contain user data | Storage corruption or accidental stripping | No recursive data stripping; store compact metadata only | Builder |

## 6) Acceptance Criteria

| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Story result page exposes manual quality review with three Run 0 statuses and fixed story issue tags. | Manual/UI review and build | Panel renders for video results and allows one status plus tags/note. |
| AC-02 | Saved review records use Run 0 `ReviewContract` fields and link to output id. | Node tests for store helpers | Tests assert status/tags/outputId/reviewerId/createdAt shape. |
| AC-03 | Review history is visible on the result page and avoids automatic diagnosis claims. | Manual/UI review and component copy inspection | Saved review appears immediately with human-review disclaimer. |
| AC-04 | Scope respects collaboration boundaries. | Workflow guard | No changes to provider services, `CampaignOutputWorkbench.tsx`, `campaignOutputPlans.ts`, or `campaignDistributionPackages.ts`. |

## 7) Test Matrix

| Category | Cases |
|---|---|
| Happy path | User saves a needs-fix review with opening/pacing tags and sees it in history. |
| Edge cases | Standalone result without Campaign handoff still gets a deterministic output id from task id. |
| Empty state | No saved reviews shows a short empty message. |
| Error path | Invalid persisted storage returns empty review history instead of crashing. |
| Regression | Result page still plays video and keeps edit/distribution actions. |
| Stress/Stability | Multiple reviews for the same output remain newest-first and capped. |

## 8) Delivery Artifacts

- Code changes:
  - `h5-video-tool/src/components/campaign/quality/storyVideoReviewStore.ts`
  - `h5-video-tool/src/components/campaign/quality/storyVideoReviewStore.test.ts`
  - `h5-video-tool/src/components/campaign/quality/StoryVideoReviewPanel.tsx`
  - `h5-video-tool/src/pages/Result.tsx`
- Docs:
  - `docs/plans/2026-05-10-story-video-quality-samples.md`
  - Run artifacts, `PRODUCT.md`, `CHANGELOG.md`, `docs/TASK-INDEX.md`
- Test evidence:
  - `node --test --experimental-strip-types h5-video-tool/src/components/campaign/quality/storyVideoReviewStore.test.ts`
  - `python scripts/workflow_guard.py --run-id 2026-05-10-story-video-review-capture --stage build`
  - `bash scripts/eval.sh 2026-05-10-story-video-review-capture`
