# PlannerSpec - 2026-05-07-gold-and-glory-canonical-brain-sync

## 1) Project Goal
- Business goal: Import canonical Gold and Glory fastpublishing knowledge into persisted Campaign Knowledge packs without adding multi-project runtime coupling.
- Final product shape: Campaign Creative Agent turns a campaign brief into ready creative assets and distribution with less human intervention over time.
- User value: Marketing and operations users can start Campaign Creative from a real Gold and Glory brain instead of empty/demo packs, reducing manual setup and preventing the product from drifting back toward editor-only controls.
- Success metrics: Canonical import creates stable ready packs, derived campaign context contains Gold and Glory-specific brand/market/persona/live-ops/playbook knowledge, and the flow remains single-game without Project/Game UI leakage.

## 2) Scope
### In Scope
- Add a repo-shipped Gold and Glory canonical knowledge seed derived from selected fastpublishing source files.
- Make backend template import support that canonical seed with stable pack ids, stable source ids, checksums, and original source paths.
- Point the frontend import action at the Gold and Glory canonical template.
- Add regression tests for backend import behavior and frontend default template selection.
- Document the manual fastpublishing refresh loop for future knowledge updates.

### Out of Scope
- Importing Project Nova Arena, Idle Kingdom Go, or any non-Gold-and-Glory project brain.
- Scanning fastpublishing shared/handoffs, reports, plans, or full GNG_Sharing-extracted slide dumps in this MVP.
- Adding scheduled sync, background watchers, or new production environment variables.
- Changing video generation/distribution low-level services.
- Replacing fastpublishing as the source of truth; GOBS stores a deployable runtime snapshot only.

## 3) Module Breakdown
- Canonical seed config:
  - Responsibilities: Hold the curated Gold and Glory brain snapshot as structured packs that can ship to staging/prod.
  - Dependencies: fastpublishing read-only source paths, campaign knowledge pack schema.
- Backend import service:
  - Responsibilities: Route `gold-and-glory-canonical` imports to stable source/pack records with checksum metadata.
  - Dependencies: `campaignKnowledgeStore`, canonical seed config.
- Frontend import contract:
  - Responsibilities: Default the Gold and Glory brain import action to the canonical template and avoid demo wording.
  - Dependencies: `PlatformMemoryContext`, campaign knowledge API helper, visible Knowledge Brain copy.
- Tests and docs:
  - Responsibilities: Prove repeatable imports, source metadata, and UI/API defaults; describe refresh workflow.
  - Dependencies: Node test suites, `PRODUCT.md`, run artifacts.

## 4) Technical Approach
- Architecture decisions: Use a committed canonical seed instead of reading `C:\Users\wei.liu\Desktop\cursor_try\fastpublishing` at runtime, because staging/prod cannot access the local source repository.
- Data flow: fastpublishing source files -> curated GOBS seed -> `import-template` writes sources and ready packs -> Campaign Creative selects packs -> derivation builds campaign context.
- API or interface changes: Keep the existing import endpoint, but support `templateId: "gold-and-glory-canonical"` and make it the frontend default for Gold and Glory.
- Migration or compatibility notes: Keep `fastpublish-core` available for compatibility, but no user-facing Gold and Glory flow should depend on the generic demo template.
- Refresh workflow: When fastpublishing changes, rerun a scoped brain-refresh development run that compares the whitelisted source files, updates the canonical seed/checksums, imports to staging, validates Campaign Creative context, then promotes to prod.

## 5) Risks
| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Source drift | fastpublishing changes after this seed is committed | GOBS brain can become stale | Document manual refresh loop and store source checksums | Builder |
| Runtime path coupling | Importer reads local absolute fastpublishing paths on server | Staging/prod import fails | Ship a repo-local canonical seed, not a runtime file scanner | Builder |
| Over-importing noisy content | Handoffs/reports/slide dumps enter packs | Brain becomes confusing and drifts from marketer workflow | Whitelist only brand, market, persona, live-ops, and playbook sources | Planner |
| Demo regression | Frontend still imports `fastpublish-core` | Users see generic packs instead of GNG brain | API helper/default tests plus PlatformMemory import update | Builder |

## 6) Acceptance Criteria
| ID | Requirement | Validation Method | Done Definition |
|---|---|---|---|
| AC-01 | Gold and Glory imports a canonical fastpublishing-derived brain seed instead of the generic fastpublish demo template. | Backend unit test and local import smoke | Importing `gold-and-glory-canonical` creates stable GNG packs and remains repeatable. |
| AC-02 | Imported packs contain durable source metadata, source checksums, and enough brand/market/persona/live-ops/playbook content for Campaign Creative derivation. | Backend unit test plus derivation assertion | Ready packs include original source paths/checksums and produce non-empty derived context fields. |
| AC-03 | Frontend import flow targets the Gold and Glory canonical template and no longer suggests empty/demo knowledge packs. | Frontend unit test and browser happy-path | Import helper/default uses `gold-and-glory-canonical`; visible copy says Gold and Glory fastpublish brain. |
| AC-04 | Tests cover canonical import behavior and UI/API default template selection. | `node --test` targeted suites, then build/eval | Relevant backend/frontend tests pass with no forbidden-file edits. |
| AC-05 | PRODUCT.md and run artifacts document the manual fastpublishing-to-GOBS brain refresh workflow. | Documentation review | Changelog and design note explain source-of-truth and refresh steps. |

## 7) Test Matrix
| Category | Cases |
|---|---|
| Happy path | `importCampaignKnowledgeTemplate('market_admin', 'gold-and-glory', 'gold-and-glory-canonical')` creates ready canonical packs. |
| Edge cases | Repeating the import keeps stable pack/source ids without duplicating manifest entries. |
| Error path | Unsupported template id still fails cleanly. |
| Regression | Existing `fastpublish-core` template still imports for compatibility. |
| Derivation | Selected canonical packs produce market truth, audience tension, tone rules, forbidden claims, approved angles, hooks, and visual cues. |
| Frontend | API import default posts `gold-and-glory-canonical`; Platform brain copy/import flow stays Gold and Glory only. |

## 8) Delivery Artifacts
- Code changes: backend canonical seed/import service, frontend import default/copy, targeted tests.
- Test evidence: backend/frontend targeted node tests, TypeScript/build checks, workflow guard, `bash scripts/eval.sh 2026-05-07-gold-and-glory-canonical-brain-sync`.
- Documents to update: design note, run artifacts, `PRODUCT.md`, `CHANGELOG.md`.
