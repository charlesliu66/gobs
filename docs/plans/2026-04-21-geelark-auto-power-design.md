# GeeLark Auto Power Design

**Date:** 2026-04-21

**Goal:** When video distribution is triggered from QAS, automatically power on the selected GeeLark phones before publishing and automatically power them off only after the publish task succeeds.

**Scope**
- Keep the current H5 distribution UX unchanged.
- Apply the behavior only to the `/api/geelark/publish` flow.
- Do not auto-stop devices when GeeLark reports task failure or cancellation.

**Current State**
- H5 calls `/api/geelark/publish` and receives GeeLark `taskIds` immediately.
- The backend submits GeeLark `task/add`, but does not control phone power state.
- Distribution accounts are mapped from `config/geelark-accounts.json`.

**Chosen Approach**
- Before submitting GeeLark publish tasks, the backend resolves selected account ids to `envId`s.
- The backend checks phone status and powers on only phones that are currently off.
- The backend waits until all target phones are ready, then uploads the video and submits publish tasks.
- After GeeLark returns `taskIds`, the backend starts a detached monitor loop that polls `task/detail`.
- When a task reaches `status=3`, the backend powers off the associated phone.
- When a task reaches `status=4` or `status=7`, the backend logs and preserves the phone for troubleshooting.

**Why This Option**
- It matches the user requirement exactly.
- It avoids shutting devices down before GeeLark finishes the publish action.
- It keeps the front-end contract stable.

**Key Backend Changes**
- Add GeeLark phone lifecycle helpers in `h5-video-tool-api/src/services/geelark.ts`:
  - query phone status
  - start phones
  - stop phones
  - wait until phones are ready
  - monitor submitted publish tasks
- Update `publishVideo()` to orchestrate:
  - resolve `envId`s
  - ensure phones are ready
  - upload asset
  - create publish tasks
  - launch background success-stop monitor

**Failure Rules**
- If a phone cannot be started or does not become ready in time, fail the publish request.
- If task creation fails after phones were started, leave phones running and report the error.
- If a submitted task later fails or is canceled, do not auto-stop that phone.
- If the success-stop monitor itself errors, log it and leave the phone unchanged.

**Testing**
- Add pure helper tests for:
  - selecting which envIds need start
  - deciding when all envs are ready
  - mapping task ids to env ids
  - deciding whether a completed task should stop or preserve the phone
- Run the backend tests plus backend/frontend TypeScript checks.
