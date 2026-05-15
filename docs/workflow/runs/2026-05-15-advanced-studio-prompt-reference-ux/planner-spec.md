# Planner Spec - Advanced Studio Prompt Reference UX

## Acceptance Criteria

- Local upload on a reference slot immediately shows reading feedback, then filename, preview, token, and ready/error state.
- Subject and environment slots remain separate and explain their prompt role clearly.
- Selected assets expose stable `@图片n` / `@视频n` tokens and can be inserted into the Prompt editor without duplication.
- Prompt area shows which selected tokens are already referenced and which are still missing.
- Quick Inspirations are collapsed by default.
- Veo writing tips, quality presets, and custom prompt-style categories are not visible on the page.
- One-click Prompt sends mode and selected reference assets to the backend.
- Backend optimizer keeps or inserts real tokens and removes invented unavailable material tokens.
- Seedance duration and material constraints remain unchanged from v0.204.

## Test Matrix

- Frontend source/unit coverage for selector presence, upload states, token insertion helper, locale cleanup, prompt polish request body, and Seedance constraints.
- Backend unit coverage for reference-asset token normalization.
- Frontend production build.
- Backend production build.
- Browser smoke for the three generation modes and visible legacy-copy removal.

## Risks

- Native file chooser automation is hard to drive in headless Chrome without Playwright; manual file-upload behavior is covered by code path, DOM states, and source tests, while render smoke verifies the slots and upload controls exist.
- Existing Chinese mojibake in some legacy Studio copy is outside this run; new user-facing copy is localized through explicit strings or existing locale keys where practical.
