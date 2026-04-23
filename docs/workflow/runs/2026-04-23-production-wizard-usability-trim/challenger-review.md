# Challenger Review: Production Wizard Usability Trim

## Must-Fix Questions

### 1. Will hiding storyboard still generation break image2video?

Resolution: Do not delete `handleGenerateShotFrame`, `onGenerateShotFrame`, or `previewStillDataUrl`. Move the visible entry into advanced tools and keep image2video guidance when no first frame exists.

### 2. Will advanced users lose existing tools?

Resolution: Hide low-frequency tools behind a clear “高级工具” toggle. Keep tool names discoverable and avoid deleting AI review, continuity check, quick adjust, A/B compare, or prompt consistency code.

### 3. Will shot status regress after refresh?

Resolution: Introduce a small user-facing status helper with tests. Completed media must have highest priority, so stale pending submit IDs cannot overwrite completed state.

### 4. Will shot navigation change callback semantics?

Resolution: Keep `onSelectShot`, `onCancelShotJob`, `shotActiveJobMap`, `shotJobStatusMap`, and `shotJobQueueInfoMap` meanings unchanged. Add local filter/navigation state only.

### 5. Will i18n debt increase?

Resolution: Add new UI labels to `messages.ts`. Any legacy text that cannot be keyized safely must be recorded in `builder-report.md`.

## Decision

GO for Phase 1-4 implementation with the mitigations above. No P0/P1 blocker remains before Builder.
