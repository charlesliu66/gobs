# Language Dropdown Design

**Date:** 2026-04-22

**Goal**

Simplify language switching to a single user-facing dropdown with only `简体中文` and `English`, while keeping the existing `uiLocale` and `contentLocale` protocol under the hood.

**Decision**

Use a single dropdown UI and map each language option to a fixed locale pair:

- `简体中文` -> `uiLocale=zh-CN`, `contentLocale=zh`
- `English` -> `uiLocale=en`, `contentLocale=en`

Do not expose mixed presets such as `English UI + Chinese Content` to end users anymore.

**Why This Approach**

- Keeps the current request header protocol (`X-UI-Locale`, `X-Content-Locale`) intact.
- Minimizes refactor risk because API clients and downstream services still receive the same two fields.
- Fixes the product problem directly: users only think in terms of language, not locale combinations.

**Scope**

- Replace the preset-button language switcher with a single select-style dropdown.
- Apply the same component to login and sidebar.
- Make the selected option control both UI and generated content language together.
- Keep locale normalization and header helpers unchanged unless needed for tests or clearer abstractions.

**Out Of Scope**

- Removing `uiLocale/contentLocale` from the codebase.
- Supporting additional languages beyond Chinese and English in this round.
- Completing untranslated pages that still have hardcoded Chinese outside the already localized surfaces.

**Acceptance Criteria**

- Users only see two choices: `简体中文` and `English`.
- Selecting `English` switches both UI strings and content locale to English.
- Selecting `简体中文` switches both UI strings and content locale to Chinese.
- Login and sidebar use the same dropdown interaction model.
- Existing locale headers continue to be sent correctly.
