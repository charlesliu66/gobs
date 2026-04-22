# Language Dropdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the preset-based locale switcher with a single two-option language dropdown that switches both UI and content language together.

**Architecture:** Keep the current `uiLocale` and `contentLocale` storage and request-header protocol. Add a thin mapping layer from a user-facing language option to the existing locale pair, then reuse it from the shared switcher component on login and sidebar.

**Tech Stack:** React, TypeScript, Vite, localStorage-backed locale state

---

### Task 1: Add a user-facing language mapping

**Files:**
- Modify: `h5-video-tool/src/i18n/locale.ts`
- Test: `h5-video-tool/src/i18n/locale.test.ts`

**Step 1: Write the failing test**

Add assertions for:
- language `zh-CN` maps to `{ uiLocale: 'zh-CN', contentLocale: 'zh' }`
- language `en` maps to `{ uiLocale: 'en', contentLocale: 'en' }`

**Step 2: Run test to verify it fails**

Run: `node --test src/i18n/locale.test.ts`

**Step 3: Write minimal implementation**

Add a tiny helper for language-option-to-locale-pair mapping.

**Step 4: Run test to verify it passes**

Run: `node --test src/i18n/locale.test.ts`

**Step 5: Commit**

```bash
git add h5-video-tool/src/i18n/locale.ts h5-video-tool/src/i18n/locale.test.ts
git commit -m "refactor: add language dropdown locale mapping"
```

### Task 2: Replace the switcher UI with a dropdown

**Files:**
- Modify: `h5-video-tool/src/components/LocalePresetSwitcher.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`

**Step 1: Write the failing test**

Reuse locale message coverage for the new switcher labels.

**Step 2: Run test to verify it fails**

Run: `node --test src/i18n/locale.test.ts`

**Step 3: Write minimal implementation**

Render a single select-style dropdown with only:
- `简体中文`
- `English`

On change, update both UI and content locale together.

**Step 4: Run test to verify it passes**

Run: `node --test src/i18n/locale.test.ts`

**Step 5: Commit**

```bash
git add h5-video-tool/src/components/LocalePresetSwitcher.tsx h5-video-tool/src/i18n/messages.ts h5-video-tool/src/i18n/locale.test.ts
git commit -m "feat: simplify language switcher dropdown"
```

### Task 3: Verify integration on login and sidebar

**Files:**
- Verify: `h5-video-tool/src/pages/Login.tsx`
- Verify: `h5-video-tool/src/components/Layout.tsx`

**Step 1: Check shared usage**

Confirm both pages still use the shared switcher component.

**Step 2: Run app verification**

Run:
- `node node_modules/typescript/bin/tsc --noEmit`
- `npm run build`

Expected:
- TypeScript passes
- Vite build passes

**Step 3: Commit**

```bash
git add h5-video-tool/src/pages/Login.tsx h5-video-tool/src/components/Layout.tsx
git commit -m "chore: keep login and sidebar on shared language dropdown"
```

### Task 4: Update docs and deploy

**Files:**
- Modify: `PRODUCT.md`

**Step 1: Update changelog and module docs**

Document that the product now exposes only a two-option language dropdown.

**Step 2: Run final verification**

Run:
- `node --test src/i18n/locale.test.ts`
- `npm run build` in `h5-video-tool-api`
- `npm run build` in `h5-video-tool`

**Step 3: Deploy**

Run:
- `git push origin main`
- `python scripts/deploy_all.py`

**Step 4: Confirm server version**

Check `/api/system/version` matches local commit.
