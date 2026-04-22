# Editor Agent Memory System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a layered memory system for the editor agent with project-level memory, user-level communication profile, and periodic product insight summaries.

**Architecture:** Persist raw agent interactions as events, promote high-value signals into structured project memory and user communication profiles, and assemble these layers into each agent request with bounded context windows. Add a separate summary pipeline that turns real usage into platform optimization insights rather than long prompt context.

**Tech Stack:** React, Vite, TypeScript, Express, existing editor project storage, existing editor agent routes/services, JSON persistence first with upgrade path to database-backed storage.

---

### Task 1: Define memory contracts and storage shape

**Files:**
- Create: `h5-video-tool/src/editor/types/agentMemory.ts`
- Create: `h5-video-tool-api/src/types/editorAgentMemory.ts`
- Modify: `h5-video-tool/src/editor/types/timeline.ts`
- Modify: `h5-video-tool-api/src/routes/editorProjects.ts`
- Test: `h5-video-tool-api/tests/editorAgentMemorySchema.test.ts`

**Step 1: Write the failing schema test**

Cover:
- project memory payload shape
- user communication profile shape
- confidence/evidence metadata
- summary snapshot shape

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/editorAgentMemorySchema.test.ts`

Expected: import or field mismatch failure

**Step 3: Add minimal shared types**

Add:
- `AgentMessageEvent`
- `EditorProjectMemory`
- `EditorUserCommunicationProfile`
- `EditorMemorySummarySnapshot`

**Step 4: Extend project persistence shape**

Add an optional memory field under project metadata without breaking old projects.

**Step 5: Run test again**

Run: `node --import tsx --test tests/editorAgentMemorySchema.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add h5-video-tool/src/editor/types/agentMemory.ts h5-video-tool-api/src/types/editorAgentMemory.ts h5-video-tool/src/editor/types/timeline.ts h5-video-tool-api/src/routes/editorProjects.ts h5-video-tool-api/tests/editorAgentMemorySchema.test.ts
git commit -m "feat: add editor agent memory schemas"
```

### Task 2: Persist project-level agent history and structured memory

**Files:**
- Create: `h5-video-tool-api/src/services/editorAgentMemoryStore.ts`
- Modify: `h5-video-tool-api/src/routes/editorAgent.ts`
- Modify: `h5-video-tool-api/src/routes/editorProjects.ts`
- Modify: `h5-video-tool/src/pages/EditorWorkbench.tsx`
- Test: `h5-video-tool-api/tests/editorAgentMemoryStore.test.ts`

**Step 1: Write failing store tests**

Cover:
- append event
- keep last N raw turns
- persist structured project memory
- reload memory with project

**Step 2: Run tests**

Run: `node --import tsx --test tests/editorAgentMemoryStore.test.ts`

Expected: FAIL because store does not exist

**Step 3: Implement minimal project memory store**

Use JSON-compatible storage first. Keep:
- raw conversation events
- promoted project memory
- decision log entries

**Step 4: Wire route save/load**

On editor project save/load, include memory block.

**Step 5: Wire front-end load**

Hydrate `agentChatHistory` and memory summary when project opens.

**Step 6: Run tests**

Run: `node --import tsx --test tests/editorAgentMemoryStore.test.ts`

Expected: PASS

**Step 7: Commit**

```bash
git add h5-video-tool-api/src/services/editorAgentMemoryStore.ts h5-video-tool-api/src/routes/editorAgent.ts h5-video-tool-api/src/routes/editorProjects.ts h5-video-tool/src/pages/EditorWorkbench.tsx h5-video-tool-api/tests/editorAgentMemoryStore.test.ts
git commit -m "feat: persist editor project memory"
```

### Task 3: Build user-level communication profile

**Files:**
- Create: `h5-video-tool-api/src/services/editorUserProfileService.ts`
- Modify: `h5-video-tool-api/src/routes/editorAgent.ts`
- Modify: `h5-video-tool-api/src/middleware/auth.ts`
- Test: `h5-video-tool-api/tests/editorUserProfileService.test.ts`

**Step 1: Write failing profile tests**

Cover:
- explicit preference extraction
- negative preference capture
- repeated behavior raises confidence
- recent contradiction lowers confidence

**Step 2: Run tests**

Run: `node --import tsx --test tests/editorUserProfileService.test.ts`

Expected: FAIL

**Step 3: Implement profile update rules**

Support:
- response style
- collaboration mode
- control preference
- pace preference
- negative preferences

**Step 4: Attach to authenticated user**

Profiles must be keyed by user, not by project.

**Step 5: Run tests**

Run: `node --import tsx --test tests/editorUserProfileService.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add h5-video-tool-api/src/services/editorUserProfileService.ts h5-video-tool-api/src/routes/editorAgent.ts h5-video-tool-api/tests/editorUserProfileService.test.ts
git commit -m "feat: add editor user communication profiles"
```

### Task 4: Add bounded context assembly and compression

**Files:**
- Create: `h5-video-tool-api/src/services/editorMemoryCompression.ts`
- Modify: `h5-video-tool-api/src/services/editorAgentService.ts`
- Test: `h5-video-tool-api/tests/editorMemoryCompression.test.ts`

**Step 1: Write failing compression tests**

Cover:
- keep latest 8-12 turns
- compress older turns into facts/preferences/negative items/open issues
- latest explicit user command always wins
- low-confidence profile memories are weak hints only

**Step 2: Run tests**

Run: `node --import tsx --test tests/editorMemoryCompression.test.ts`

Expected: FAIL

**Step 3: Implement compression helpers**

Functions:
- `compactConversationWindow`
- `promoteProjectMemoryFacts`
- `mergeUserCommunicationProfile`
- `buildAgentMemoryContextBlock`

**Step 4: Inject memory into agent prompt**

Use this order:
- current task
- current brief
- project memory
- user profile
- recent raw turns
- current timeline state

**Step 5: Run tests**

Run: `node --import tsx --test tests/editorMemoryCompression.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add h5-video-tool-api/src/services/editorMemoryCompression.ts h5-video-tool-api/src/services/editorAgentService.ts h5-video-tool-api/tests/editorMemoryCompression.test.ts
git commit -m "feat: add bounded editor memory compression"
```

### Task 5: Add user-visible memory controls

**Files:**
- Create: `h5-video-tool/src/editor/components/AgentMemoryPanel.tsx`
- Modify: `h5-video-tool/src/editor/components/AgentPanel.tsx`
- Modify: `h5-video-tool/src/pages/EditorWorkbench.tsx`
- Create: `h5-video-tool/src/api/editorMemory.ts`
- Test: `h5-video-tool/tests/agentMemoryPanel.test.tsx`

**Step 1: Write failing UI test**

Cover:
- show remembered project preferences
- show user communication profile summary
- remove or downgrade a memory item
- explicit feedback buttons: “记住这个偏好” / “不要再这样做”

**Step 2: Run test**

Run: `npm run test -- agentMemoryPanel`

If no shared test runner exists yet, use the repo’s current frontend unit test convention and document the exact command chosen.

**Step 3: Build minimal memory panel**

Expose:
- project memory chips
- user profile summary
- delete / weaken controls
- feedback capture buttons

**Step 4: Wire API**

Add endpoints for:
- fetch memory
- pin memory
- delete memory
- mark negative preference

**Step 5: Run test**

Expected: PASS

**Step 6: Commit**

```bash
git add h5-video-tool/src/editor/components/AgentMemoryPanel.tsx h5-video-tool/src/editor/components/AgentPanel.tsx h5-video-tool/src/pages/EditorWorkbench.tsx h5-video-tool/src/api/editorMemory.ts h5-video-tool/tests/agentMemoryPanel.test.tsx
git commit -m "feat: add editor memory controls"
```

### Task 6: Build periodic summary and product insight reporting

**Files:**
- Create: `h5-video-tool-api/src/services/editorMemoryInsights.ts`
- Create: `h5-video-tool-api/src/routes/editorMemoryInsights.ts`
- Create: `docs/daily-reports/editor-agent-memory-metrics-template.md`
- Test: `h5-video-tool-api/tests/editorMemoryInsights.test.ts`

**Step 1: Write failing insight tests**

Cover:
- top repeated user preferences
- top rejected agent suggestions
- rework hotspots
- profile drift detection
- summary output contract

**Step 2: Run tests**

Run: `node --import tsx --test tests/editorMemoryInsights.test.ts`

Expected: FAIL

**Step 3: Implement insight summarizer**

Output:
- weekly summary
- biweekly summary
- optimization recommendations

**Step 4: Add operator-facing endpoint**

Expose summaries for product/ops review instead of end-user prompt context.

**Step 5: Run tests**

Run: `node --import tsx --test tests/editorMemoryInsights.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add h5-video-tool-api/src/services/editorMemoryInsights.ts h5-video-tool-api/src/routes/editorMemoryInsights.ts h5-video-tool-api/tests/editorMemoryInsights.test.ts docs/daily-reports/editor-agent-memory-metrics-template.md
git commit -m "feat: add editor memory insight summaries"
```

### Task 7: Verification and release

**Files:**
- Modify: `PRODUCT.md`
- Modify: `docs/workflow/runs/<run-id>/builder-report.md`
- Modify: `docs/workflow/runs/<run-id>/verifier-report.md`
- Modify: `docs/workflow/runs/<run-id>/release-decision.md`

**Step 1: Run backend tests**

Run:

```bash
cd h5-video-tool-api
node --import tsx --test tests/editorAgentMemorySchema.test.ts
node --import tsx --test tests/editorAgentMemoryStore.test.ts
node --import tsx --test tests/editorUserProfileService.test.ts
node --import tsx --test tests/editorMemoryCompression.test.ts
node --import tsx --test tests/editorMemoryInsights.test.ts
```

**Step 2: Run frontend tests**

Run the project’s agreed memory-related UI tests.

**Step 3: Run type checks**

```bash
cd h5-video-tool-api && npx tsc --noEmit
cd h5-video-tool && npx tsc --noEmit
```

**Step 4: Run builds**

```bash
cd h5-video-tool-api && npm run build
cd h5-video-tool && npm run build
```

**Step 5: Update docs and changelog**

Document:
- shipped memory features
- retention rules
- visible user controls
- known limits

**Step 6: Commit**

```bash
git add PRODUCT.md docs/workflow/runs/<run-id>/*
git commit -m "docs: record editor memory rollout"
```

Plan complete and saved to `docs/plans/2026-04-22-editor-agent-memory-system-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
