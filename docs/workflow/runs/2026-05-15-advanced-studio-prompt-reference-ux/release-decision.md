# Release Decision - Advanced Studio Prompt Reference UX

Decision: GO for commit and push.

## Evidence

- Frontend targeted tests: PASS, 32/32.
- Backend targeted tests: PASS, 5/5.
- Frontend build: PASS.
- Backend build: PASS.
- Browser render smoke: PASS for all three Advanced Studio generation modes.

## Release Owner Handoff

- Branch: `codex/2026-05-15-advanced-studio-prompt-reference-ux`
- Run ID: `2026-05-15-advanced-studio-prompt-reference-ux`
- Deployment required: yes, but not from this Dev Worker window.
- Recommended release path: merge/push to `main`, then Release Owner performs staging deploy, staging smoke, mark release ready, prod deploy, prod smoke, and restore idle.

## Residual Risk

- Native local file chooser interaction could not be automated in this headless Chrome environment. The UI state and handler wiring are covered by tests/build; human staging smoke should include uploading one image in each of the three modes and inserting the shown token into Prompt.
