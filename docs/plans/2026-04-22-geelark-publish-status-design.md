# GeeLark Publish Status Design

**Date:** 2026-04-22

**Goal:** After publishing from the distribution page, keep the latest publish batch visible on the same page and show each selected account's real-time status, failure reason, screenshots, and share link when available.

**Scope**
- Optimize the existing H5 distribution page flow without adding a separate history page.
- Show the latest publish batch in the current browser session after a submit succeeds.
- Track every returned GeeLark task instead of only the first task.
- Stop polling automatically when all tasks in the batch reach a terminal state.

**Current State**
- `TabDistribute.tsx` only stores the first returned `taskId`.
- The UI opens a single-task modal and fetches `/api/geelark/task/:id` once.
- Multi-account publish results are not grouped into a batch, so the user cannot see per-account progress or final outcomes.
- The backend already knows `taskIds`, `planName`, and the selected account ids, but it does not return account-task mapping metadata to the frontend.

**Chosen Approach**
- Extend `/api/geelark/publish` so the response includes a `batch` payload with `planName` and `items[]`.
- Each batch item represents one selected account and contains:
  - `accountId`
  - `username`
  - `envId`
  - `taskId`
- Keep `/api/geelark/task/:id` as the single-source detail endpoint, but normalize its response to always include:
  - status text
  - failure description
  - result screenshots
  - share link when GeeLark returns one
- Replace the single-task modal in `TabDistribute.tsx` with a persistent "latest publish batch" panel on the page.
- Start a polling loop for all non-terminal tasks in the current batch and merge detail updates into the batch rows until every task is finished.

**Why This Option**
- It matches the user's current workflow: publish and immediately inspect outcomes without leaving the page.
- It preserves the existing GeeLark integration shape and reuses the current task detail endpoint.
- It solves the real gap for multi-account publishing instead of improving only the single-task case.

**Frontend Design**
- Keep the publish form unchanged.
- After submit success, render a batch card below the publish button.
- Show one row per account with:
  - account name
  - task id
  - status badge
  - last failure text when failed
  - result screenshots when available
  - share link action when available
- Show loading state while polling and a summary when the batch fully completes.
- Keep manual refresh as a fallback even though polling runs automatically.

**Backend Design**
- `publishVideo()` returns the existing `taskIds` and `planName`, plus a `batch.items` mapping derived from the selected accounts and resolved env ids.
- Add a small helper that maps selected account configs to task ids deterministically by index.
- Normalize task detail fields in `getTaskDetail()` so the frontend does not need to guess share-link or screenshot field names from GeeLark payloads.

**Failure Handling**
- If submit fails, do not create a batch card.
- If one task detail request fails during polling, keep the row visible and show the fetch error on that row instead of dropping the whole batch.
- If GeeLark returns fewer task ids than selected accounts, only map the confirmed tasks and mark unmatched accounts as submit anomalies in the batch payload.
- If the page unmounts, stop polling cleanly.

**Testing**
- Backend:
  - lock the task-to-account batch mapping with focused tests
  - lock task detail normalization for screenshots/share link extraction
- Frontend:
  - lock publish response handling so the latest batch stores all items
  - lock polling merge logic so terminal rows stop refreshing and visible fields render from detail data
- Verification:
  - focused tests
  - backend/frontend TypeScript checks
  - backend/frontend build before deployment
