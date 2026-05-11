# PlannerSpec - 2026-05-11-gobs-navigation-structure

## 1) Project Goal
- Business goal: Implement comprehensive optimization Run A1/A2: reorganize main navigation semantics and add Studio production entry guidance without changing routes or deleting experimental pages.
- User value: Help market, ops, and video users understand where to start, which tools are for production, and which surfaces are experimental or direct-link-only.
- Success metrics: Sidebar groups match user intent, production tools have clear entry guidance, platform mock surfaces no longer compete with the primary path, and all existing URLs remain routeable.

## 2) Scope
### In Scope
- Reorganize `Layout.tsx` sidebar groups into Campaign / Produce / Assets / Distribute / History.
- Keep Platform planning routes direct-link-only while adding a low-prominence Home experimental entry.
- Add a Studio top guidance section with four production paths: Advanced Studio, QuickFilm, Production Wizard, and Editor.
- Update i18n labels and source-level tests for the new navigation semantics.
- Update PRODUCT / CHANGELOG and run artifacts.

### Out of Scope
- Backend API, persistence, auth, deployment, and provider behavior.
- Deleting or redirecting existing routes.
- Campaign coverage map, text production, Team Asset visibility, Banner Prompt, or Distribution Bridge work.
- Editing AGENTS.md forbidden files.
- Staging/prod deployment.

## 3) Module Breakdown
- Navigation shell:
  - Responsibilities: Define primary groups, visible route order, and direct-link-only route filtering.
  - Dependencies: `Layout.tsx`, i18n `layout.*` labels, existing React Router routes.
- Home experimental discovery:
  - Responsibilities: Keep Platform routes discoverable without putting mock surfaces in the main sidebar.
  - Dependencies: `Home.tsx`, i18n `home.*` labels.
- Studio production guide:
  - Responsibilities: Explain which production entry fits which user job and provide direct CTAs.
  - Dependencies: `Studio.tsx`, React Router links, existing `TemplatePicker` / `TabGenerate` behavior.
- Tests and docs:
  - Responsibilities: Guard direct-route compatibility, visible nav semantics, guide presence, and release documentation.
  - Dependencies: source-level node tests, `PRODUCT.md`, `CHANGELOG.md`, run artifacts.

## 4) Technical Approach
- Architecture decisions:
  - Treat this as a frontend information-architecture change, not a feature rewrite.
  - Keep `NAV_GROUPS` static and module-level so rendering stays cheap.
  - Use direct links and static card data for the Studio guide; no new data fetching or route state is needed.
  - Keep Platform pages in `PLANNING_PATHS` and direct-routeable; primary nav remains focused.
- Data flow:
  - Sidebar reads `NAV_GROUPS`, filters only planning/direct-only surfaces, then renders localized labels.
  - Home and Studio use local static arrays plus `navigate` / `Link` to existing routes.
- API or interface changes:
  - No API changes.
  - No route path changes.
- Migration or compatibility notes:
  - Existing bookmarks and redirects must continue working.
  - `tiktok-matrix` moves back into visible Distribution navigation per the comprehensive plan, which supersedes the previous legacy-surface hiding decision for this route only.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Existing dirty V2 doc | `docs/plans/2026-05-11-campaign-production-coverage-v2-adjustment-plan.md` is already modified | Accidental staging of unrelated docs | Never stage that file in this run; call it out in final status | Builder |
| Re-exposing TikTok Matrix | Comprehensive plan puts TikTok Matrix under Distribute while prior v0.193 hid it | Product IA regression if users see a still-experimental risk console | Keep route unchanged, document intentional change, keep source tests explicit | Builder |
| Sidebar label regression | New labels miss i18n keys | English/Chinese UI shows raw keys | Update `messages.ts` and locale tests | Builder |
| Studio guide visual clutter | New guidance competes with template picker | Studio feels heavier | Put guide above content as compact cards, preserve existing tabs and picker behavior | Builder |
| Route compatibility break | Moving nav items accidentally changes URLs | Existing bookmarks/workflows fail | Only edit nav arrays/cards; source tests assert routes remain | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Sidebar groups are Campaign / Produce / Assets / Distribute / History | Source test + visual source review | `NAV_GROUPS` uses new localized group keys and production tools are under Produce |
| AC-02 | Platform routes are not in primary sidebar but remain routeable | Source test against `Layout.tsx` and `App.tsx` | `/platform*` routes remain in `App.tsx`; `PLANNING_PATHS` keeps them direct-link-only |
| AC-03 | Home exposes Platform as experimental, low-prominence discovery | Source test against `Home.tsx` | Home has an experimental card/link to `/platform`; no primary nav item is added |
| AC-04 | Studio top guide explains four production entries | Source test + build | `/studio` source has four guide entries with links to `/studio`, `/quickfilm`, `/studio/production`, `/editor` |
| AC-05 | Existing URL compatibility preserved | Source test | Route declarations remain for all affected paths |
| AC-06 | Docs/changelog updated | File review | `PRODUCT.md`, `CHANGELOG.md`, builder/verifier reports mention the change |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | Sidebar groups and Studio guide source tests pass. |
| Edge cases | Platform planning routes remain accessible by direct URL but absent from visible primary nav candidates. |
| Error path | Missing i18n keys fail locale tests instead of shipping raw labels. |
| Regression | Existing legacy/direct-route tests are updated to reflect only TikTok Matrix returning to visible Distribution nav. |
| Stress/Stability | Production frontend build completes after navigation and guide changes. |

## 8) Delivery Artifacts
- Code changes: `Layout.tsx`, `Home.tsx`, `Studio.tsx`, i18n messages, source tests.
- Test evidence: targeted node tests, frontend build, workflow guard/eval if available.
- Documents to update: run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
