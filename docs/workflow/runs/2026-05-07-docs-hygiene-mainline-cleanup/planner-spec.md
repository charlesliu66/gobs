# PlannerSpec - 2026-05-07-docs-hygiene-mainline-cleanup

## 1) Project Goal
- Business goal: Remove stale task-routing signals so future GOBS Agent work stays on the Campaign Creative Agent mainline.
- User value: The next run can start from a clean product map instead of rediscovering which documents are stale.
- Success metrics: Current task index names the right next work, release notes have no duplicate trailing blocks, and Advanced Studio side work is not shown as the next product-mainline task.

## 2) Scope
### In Scope
- Rewrite `docs/TASK-INDEX.md` as the current entry point.
- Add a small v0.153 documentation-hygiene record to `PRODUCT.md` and `CHANGELOG.md`.
- Remove duplicate appended release-note fragments from `PRODUCT.md` and `CHANGELOG.md`.
- Ensure `docs/workflow/runs/2026-05-07-production-english-reference-ux/` is not treated as current product-mainline work; if a completed parallel run exists, preserve it as Advanced Studio side-lane history.

### Out of Scope
- Any frontend or backend runtime behavior.
- Any Advanced Studio English UX implementation.
- New env vars, deployment script changes, or forbidden service files.

## 3) Technical Approach
- Keep the cleanup text-first and scoped to documentation.
- Treat `CHANGELOG.md` as the canonical recent release history and `PRODUCT.md` as product overview plus near-term changelog.
- Do not move old valid history; only remove duplicated trailing fragments that repeat existing version entries.
- Prefer removing or reclassifying template-only run signals over marking them active; after a completed parallel run lands, preserve it but keep it out of the next-mainline slot.

## 4) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Removing useful history | Duplicate detection is too broad | Loss of release context | Only delete trailing blocks that duplicate already-present recent entries | codex |
| Confusing Advanced Studio backlog | Deleting TODO run looks like rejecting the idea | Future UX cleanup may be forgotten | Note in task index that it can be reopened as a scoped future run | codex |
| Docs-only release drift | Commit changes without release trace | main/prod SHA can diverge | Run build/release guard and follow staging -> prod if committing | codex |

## 5) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Task index reflects current mainline | Read `docs/TASK-INDEX.md` | It names Gold and Glory Brain, Campaign Creative Agent north star, and next recommended work |
| AC-02 | Release notes are deduplicated | Search version markers in `PRODUCT.md` and `CHANGELOG.md` | No stale `v0.150` tail in PRODUCT and no repeated `v0.135-v0.138` tail in CHANGELOG |
| AC-03 | Advanced Studio reference UX work is not treated as the next product mainline | Task index and run status review | `production-english-reference-ux` is either absent as a stale TODO run or present only as completed Advanced Studio side-lane history |

## 6) Test Matrix
| Category | Cases |
|---|---|
| Docs integrity | Version marker searches for expected top entries and removed duplicate tails |
| Workflow hygiene | Empty/untracked Advanced Studio run directory is removed |
| Release hygiene | `git diff --check`, frontend build, backend build, release guard |

## 7) Delivery Artifacts
- `docs/TASK-INDEX.md`
- `PRODUCT.md`
- `CHANGELOG.md`
- This completed workflow run folder
