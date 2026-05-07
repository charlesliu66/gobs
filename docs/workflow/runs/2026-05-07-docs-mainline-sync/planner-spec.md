# Planner Spec: Docs Mainline Sync

## North Star

Use this short product-shape statement because the touched docs define future `Campaign Creative Agent` runs:

> `Campaign Creative Agent` 必须从 campaign brief 出发，稳定产出创意素材或变体，并把它们送入分发。

This run is in scope only if it makes the shipped docs, templates, and release history more consistent with that chain.

## Background

- Current product context: local `main` has already been merged forward to the latest `origin/main`, but a small set of campaign-planning docs and workflow templates still exists only in the working tree.
- Why this run matters now: if these docs are not normalized and recorded cleanly, the repo will keep mixing shipped knowledge-aware code with stale planning assumptions and broken local links.
- Upstream basis: the shipped `Campaign Creative` knowledge-aware strategy flow, editor knowledge handoff, and the mission-control direction docs added locally before the merge.

## User Problems

1. Planning docs and workflow templates are partly local-only, so future runs may use stale assumptions or miss the current north-star guardrail.
2. The repo state is code-aligned to latest main, but the documentation and release history are not yet aligned to that same baseline.

## Target Users

### Primary

- Internal builders and operators who start or review campaign-creative runs

### Secondary

- Future coding agents that rely on `README`, run templates, `PRODUCT.md`, and `CHANGELOG.md` as the repo's source of truth

## Scope

### In Scope

- Add the local-only fastpublish knowledge-integration docs to mainline
- Keep the mission-control implementation plan aligned with the shipped knowledge-aware creative flow
- Upgrade workflow templates with the shared campaign north-star guardrail
- Fix stale machine-specific links in the plans index
- Update `PRODUCT.md` and `CHANGELOG.md`
- Commit, push, and release the aligned repo state through `staging -> verify -> prod`

### Out of Scope

- Runtime feature changes
- API contract changes
- Deployment script refactors
- Backfilling or rewriting unrelated historical run documents

## Acceptance Criteria

| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Local-only campaign planning docs and templates are cleaned and normalized into the repo | Git diff review | Only the intended docs/template files remain changed; no stale local-only duplicate run dir or machine-specific plan link remains |
| AC-02 | Release history reflects the docs sync | File inspection | `PRODUCT.md` and `CHANGELOG.md` both describe the docs/template sync clearly enough for future traceability |
| AC-03 | The aligned repo state is releasable and actually synchronized | Build checks, release guard, deploy + smoke | Local checks pass, commit is pushed to `origin/main`, staging and prod are updated to the same SHA, and prod is returned to idle |

## Engineering Criteria

- Keep the diff docs-only.
- Do not modify any AGENTS-forbidden source files.
- Do not invent a parallel planning structure when the shipped code already defines the knowledge-aware shape.
- Preserve clickable absolute workspace paths inside repo docs.

## Risk Matrix

| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Stale assumptions survive | Mission-control plan still assumes brief-only creative flow | Future runs drift from shipped code | Align plan text to landed knowledge-aware flow | Builder |
| Broken local links remain | Old machine-specific paths stay in index docs | Readers open non-existent files | Fix and re-check plan index links | Builder |
| Release provenance gap | Docs are committed without updating product history | Three-end sync becomes hard to trace | Update `PRODUCT.md` and `CHANGELOG.md` in the same commit | Builder |
| Dirty release state | Commit is not pushed or deployed after docs sync | Local, GitHub, and server diverge | Follow standard staging-first release flow | Integrator |

## Test Matrix

| Category | Cases |
|---|---|
| Happy path | Docs index links resolve to active workspace files and the new template files are tracked |
| Edge cases | Mission-control plan still stays documentation-only and does not require code changes |
| Error path | Release guard surfaces missing push / dirty-tree warnings before commit |
| Regression | Backend typecheck and frontend/backend builds still pass after the docs sync commit |
| Stress/Stability | Staging/prod smoke confirms the same commit is visible after release |

## Source Files To Inspect First

- docs/plans/README.md
- docs/plans/2026-05-06-campaign-mission-control-phase0-implementation-plan.md
- docs/workflow/runs/RUN_TEMPLATE.md
- docs/workflow/runs/SESSION-ANCHOR-template.md
- docs/workflow/runs/planner-spec-template.md
- PRODUCT.md
- CHANGELOG.md

## Delivery Artifacts

- `SESSION-ANCHOR.md`
- `planner-spec.md`
- `challenger-review.md`
- `builder-report.md`
- `verifier-report.md`
- `release-decision.md`
- `eval-result.json`

## Exit Rule

- Stop and re-confirm scope if a runtime feature edit becomes necessary.
- Stop and re-confirm scope if release needs an emergency bypass.
