# I18n Phase 0/1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Land the first executable slice of GOBS i18n by adding locale infrastructure, request headers, and pre-login language switching for the highest-value entry points.

**Architecture:** Introduce a small locale foundation in the frontend first: normalization helpers, persistent locale storage, translated strings for the login shell and navigation shell, and API header injection for `uiLocale` and `contentLocale`. Keep the first slice strictly outside the current backend/model-service禁区 and avoid touching model protocol behavior for now.

**Tech Stack:** React 19, Vite, TypeScript, React Router, fetch API, Node built-in test runner

---

### Task 1: Locale Foundation Helpers

**Files:**
- Create: `h5-video-tool/src/i18n/locale.ts`
- Create: `h5-video-tool/src/i18n/locale.test.ts`

**Step 1: Write the failing test**

- Add tests for:
  - `normalizeUiLocale('en-US') -> 'en'`
  - `normalizeUiLocale(undefined) -> 'zh-CN'`
  - `normalizeContentLocale('en-US') -> 'en'`
  - `normalizeContentLocale(undefined) -> 'zh'`
  - locale storage read/write defaults
  - request header builder returns `X-UI-Locale` and `X-Content-Locale`

**Step 2: Run test to verify it fails**

Run:

```bash
node --test h5-video-tool/src/i18n/locale.test.ts
```

Expected: fail because helper module does not exist yet.

**Step 3: Write minimal implementation**

- Add:
  - `UiLocale`, `ContentLocale`
  - normalize helpers
  - storage keys/constants
  - localStorage-safe getters/setters
  - `buildLocaleHeaders()`

**Step 4: Run test to verify it passes**

Run:

```bash
node --test h5-video-tool/src/i18n/locale.test.ts
```

Expected: pass.

**Step 5: Commit**

```bash
git add h5-video-tool/src/i18n/locale.ts h5-video-tool/src/i18n/locale.test.ts
git commit -m "feat: add locale foundation helpers"
```

### Task 2: Frontend Locale Context And Entry Wiring

**Files:**
- Create: `h5-video-tool/src/i18n/messages.ts`
- Create: `h5-video-tool/src/i18n/LocaleContext.tsx`
- Modify: `h5-video-tool/src/main.tsx`
- Modify: `h5-video-tool/src/App.tsx`

**Step 1: Write the failing test**

- Extend `locale.test.ts` or add another focused test file for:
  - message lookup falls back to Chinese key set
  - initial locale derives from storage/browser default rules

**Step 2: Run test to verify it fails**

Run:

```bash
node --test h5-video-tool/src/i18n/locale.test.ts
```

Expected: fail for missing message/context helpers.

**Step 3: Write minimal implementation**

- Add a lightweight locale provider exposing:
  - `uiLocale`
  - `contentLocale`
  - setters
  - `t(path)`
- Mount provider above router/app tree.

**Step 4: Run test to verify it passes**

Run:

```bash
node --test h5-video-tool/src/i18n/locale.test.ts
```

Expected: pass.

**Step 5: Commit**

```bash
git add h5-video-tool/src/i18n/messages.ts h5-video-tool/src/i18n/LocaleContext.tsx h5-video-tool/src/main.tsx h5-video-tool/src/App.tsx
git commit -m "feat: add locale provider and app wiring"
```

### Task 3: API Locale Header Injection

**Files:**
- Modify: `h5-video-tool/src/api/client.ts`
- Test: `h5-video-tool/src/i18n/locale.test.ts`

**Step 1: Write the failing test**

- Add a test for `buildLocaleHeaders()` usage expectation in request header composition logic.

**Step 2: Run test to verify it fails**

Run:

```bash
node --test h5-video-tool/src/i18n/locale.test.ts
```

Expected: fail because API client does not yet merge locale headers.

**Step 3: Write minimal implementation**

- Merge locale headers into:
  - auth token fetch
  - `apiGet`
  - `apiPost`
  - `apiPut`
  - `apiPatch`
  - `apiDelete`
  - `apiDownload`

**Step 4: Run test to verify it passes**

Run:

```bash
node --test h5-video-tool/src/i18n/locale.test.ts
```

Expected: pass.

**Step 5: Commit**

```bash
git add h5-video-tool/src/api/client.ts h5-video-tool/src/i18n/locale.test.ts
git commit -m "feat: attach locale headers to frontend api requests"
```

### Task 4: Login Page Language Switch

**Files:**
- Modify: `h5-video-tool/src/pages/Login.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`

**Step 1: Write the failing test**

- Add a focused test for translated login labels and fallback error copy source lookup.

**Step 2: Run test to verify it fails**

Run:

```bash
node --test h5-video-tool/src/i18n/locale.test.ts
```

Expected: fail because login message keys do not exist yet.

**Step 3: Write minimal implementation**

- Add login page language switch in the top-right area.
- Translate:
  - title
  - subtitle
  - username/password labels
  - placeholders
  - submit button
  - default error copy

**Step 4: Run test to verify it passes**

Run:

```bash
node --test h5-video-tool/src/i18n/locale.test.ts
```

Expected: pass.

**Step 5: Commit**

```bash
git add h5-video-tool/src/pages/Login.tsx h5-video-tool/src/i18n/messages.ts h5-video-tool/src/i18n/locale.test.ts
git commit -m "feat: add pre-login language switching"
```

### Task 5: Layout Language Switch And Shell Translation

**Files:**
- Modify: `h5-video-tool/src/components/Layout.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`

**Step 1: Write the failing test**

- Add tests for shell labels present in the locale dictionary:
  - nav groups
  - settings/logout labels
  - version fallback label

**Step 2: Run test to verify it fails**

Run:

```bash
node --test h5-video-tool/src/i18n/locale.test.ts
```

Expected: fail because shell dictionary keys do not exist yet.

**Step 3: Write minimal implementation**

- Add layout language switch.
- Translate the high-value shell copy:
  - nav group labels
  - core nav items
  - sidebar actions
  - mobile menu labels

**Step 4: Run test to verify it passes**

Run:

```bash
node --test h5-video-tool/src/i18n/locale.test.ts
```

Expected: pass.

**Step 5: Commit**

```bash
git add h5-video-tool/src/components/Layout.tsx h5-video-tool/src/i18n/messages.ts h5-video-tool/src/i18n/locale.test.ts
git commit -m "feat: localize app shell and add layout locale switch"
```

### Task 6: Documentation Alignment

**Files:**
- Modify: `docs/i18n-中英文切换设计方案.md`
- Create: `docs/i18n-中英文切换设计方案-v2.md` (already created)

**Step 1: Write the failing test**

- No automated test required for this doc-only step.

**Step 2: Run test to verify it fails**

- Not applicable.

**Step 3: Write minimal implementation**

- Add a top-level note in the original design doc pointing readers to v2.
- Keep the original document for historical context.

**Step 4: Run test to verify it passes**

- Not applicable.

**Step 5: Commit**

```bash
git add docs/i18n-中英文切换设计方案.md docs/i18n-中英文切换设计方案-v2.md
git commit -m "docs: align i18n design docs with v2 execution plan"
```

### Task 7: Verification

**Files:**
- Verify only

**Step 1: Run unit tests**

```bash
node --test h5-video-tool/src/i18n/locale.test.ts
```

**Step 2: Run frontend type/build verification**

```bash
cd h5-video-tool && npm run build
```

**Step 3: Record any gaps**

- If shell translation landed but deeper pages remain Chinese, note that explicitly.
- Do not claim full i18n completion; claim only Phase 0/1 slice.
