# PlannerSpec - 2026-05-06-gobs-loop-slash-plugin

## 1) Project Goal
- Business goal: Expose the repo multi-agent workflow through a slash-style /gobs-loop repo-local plugin entry while keeping the existing skill as the core implementation.
- User value: Give operators a shorter, more discoverable way to start the guarded GOBS workflow without losing the existing portable skill entry.
- Success metrics: compatible clients can surface a repo-local plugin entry, the wrapper skill routes to the canonical workflow skill, and the change can be released without touching runtime product behavior.

## 2) Scope
### In Scope
- Repo-local plugin packaging for `/gobs-loop`.
- Thin wrapper skill that points back to the canonical repo skill.
- Marketplace metadata so repo-local plugin discovery can work in compatible clients.
- Documentation updates in workflow skill references plus product/changelog notes.
- Release of the latest SHA after staging/prod verification.

### Out of Scope
- No runtime product feature changes outside plugin/skill packaging.

## 3) Module Breakdown
- Core workflow skill:
  - Responsibilities: Remain the single source of truth for the guarded 4+1 loop.
  - Dependencies: `.agents/skills/gobs-multi-agent-dev-loop/*`
- Slash wrapper plugin:
  - Responsibilities: Expose a shorter plugin/slash-style entry without duplicating the workflow logic.
  - Dependencies: `plugins/gobs-loop/.codex-plugin/plugin.json`, `plugins/gobs-loop/skills/gobs-loop-entry/SKILL.md`
- Marketplace metadata:
  - Responsibilities: Make the repo-local plugin discoverable to compatible clients.
  - Dependencies: `.agents/plugins/marketplace.json`

## 4) Technical Approach
- Keep `gobs-multi-agent-dev-loop` as the canonical implementation and documentation source.
- Add a repo-local plugin named `gobs-loop` with plugin metadata and default prompts centered on `/gobs-loop`.
- Add a thin wrapper skill under the plugin that tells the agent to load and follow the canonical workflow skill.
- Update the core skill metadata and invocation notes so `/gobs-loop` and `$gobs-multi-agent-dev-loop` are documented together.
- Update `PRODUCT.md` and `CHANGELOG.md` with the new slash-style entry.
- Release from a clean isolated worktree if the main workspace contains unrelated dirty files.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Dirty worktree | Unrelated local edits exist outside run scope | Wrong files get staged or release preflight fails | Stage only this run's files and release from an isolated clean worktree | Integrator |
| Plugin UX variance | Different clients expose repo-local plugins differently | `/gobs-loop` may not render identically everywhere | Keep `$gobs-multi-agent-dev-loop` as the portable fallback and document both paths | Builder |
| Metadata breakage | Invalid JSON or malformed skill frontmatter | Plugin will not load or discover correctly | Parse JSON locally and perform frontmatter checks before commit | Verifier |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | repo contains a slash-style gobs-loop plugin wrapper and the existing skill remains usable | JSON parse, frontmatter checks, manual file review | marketplace metadata, plugin metadata, wrapper skill, and canonical skill docs all exist and validate |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | `/gobs-loop` plugin metadata, wrapper skill, and canonical skill docs line up and validate locally. |
| Edge cases | Clients that do not expose slash/plugin UX still have `$gobs-multi-agent-dev-loop` as fallback. |
| Error path | Invalid JSON or missing frontmatter is caught before commit. |
| Regression | Canonical workflow instructions remain centralized in the original repo skill. |
| Stress/Stability | Release can proceed from a clean worktree despite unrelated dirty files in the main workspace. |

## 8) Delivery Artifacts
- Code changes: repo plugin metadata, wrapper skill, canonical skill invocation docs, current run docs.
- Test evidence: JSON parsing, skill frontmatter checks, release-guard and smoke outputs during deployment.
- Documents to update: current run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
