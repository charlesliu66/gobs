# Changelog

> Product overview lives in `PRODUCT.md`. This file tracks recent release history.

## v0.198 - 2026-05-11
**Campaign Banner prompt hardening**
**Campaign Output / Distribution Prep:**
- Upgraded Banner prompt production from a short placeholder into a structured template-ready artifact with objective, formats, source assets, copy lock, composition rules, forbidden claims, citations, asset-fit warnings, and handoff checklist.
- Added compact `bannerPromptContext` metadata so Banner prompts preserve `template_ready` readiness, spec/source asset lineage, copy snapshot, warnings, guardrails, and citations through frontend/API round-trips.
- Split Campaign Output Workbench readiness into true/direct/template coverage so prompt-only Banner output is visible as `template_ready`, not direct/auto production.
- Kept Distribution Package handoff honest by carrying Banner prompts only as non-publishable image context until a final image is rendered or exported.
**Tests / Build:**
- Added Banner prompt, coverage view-model, output production, Distribution Package, and backend Output Plan coverage; rebuilt both frontend and API production bundles.

## v0.197 - 2026-05-11
**Campaign text production coverage**
**Campaign Output / Distribution Prep:**
- Extended Campaign produced text outputs with `cta` and `platform_post` while keeping `ProductionItemType` unchanged.
- Added deterministic text production context/prompt helpers so caption, headline, CTA, hashtag, post copy, and platform post drafts bind platform, angle, audience, tone, selling points, CTA intent, forbidden claims, and knowledge citations.
- Updated backend Output Plan validation to round-trip the new output kinds and compact `textContext` metadata.
- Updated Distribution Package copy selection to prefer full platform-post drafts while keeping packages non-publishable until real media/account steps are explicit.
**Tests / Build:**
- Added text prompt/context, output production, Distribution Package, and backend Output Plan coverage; rebuilt both frontend and API production bundles.

## v0.196 - 2026-05-11
**Navigation and production entry guidance**
**Navigation / Home / Studio:**
- Regrouped primary sidebar IA into Campaign, Produce, Assets, Distribute, and History so video-making tools no longer sit under a Distribution heading.
- Kept Platform planning routes direct-link routeable while moving discovery to a low-prominence experimental entry on Home.
- Added a Studio production entry guide that explains Advanced Studio, QuickFilm, Production Wizard, and Editor before users choose a workflow.
**Tests / Build:**
- Added source-level navigation structure coverage and updated legacy-route tests for the intentional TikTok Matrix visibility change.

## v0.195 - 2026-05-11
**Editor effects sprint**
**Editor Workbench:**
- Added a typed editor packaging template catalog with 6 templates covering safe-frame labels, gameplay transition, character entry, battle cut-in, reward CTA, and end-card CTA.
- Added a compact `Pack` menu in the Editor Workbench that applies templates as normal text clips and reuses the existing `crossfade` transition flag when a transition template is applied to a selected video clip.
- Kept preview/export behavior on existing text presets and timeline fields; no render/export engine, provider, backend route, or data-model changes were made.
**Tests / Build:**
- Added targeted editor-effect template tests for category coverage, preset compatibility, timeline clamping, and transition recommendations; rebuilt the frontend production bundle.

## v0.194 - 2026-05-11
**Large component refactor**
**Distribution Center:**
- Extracted `/distribute` asset-option mapping, package/current/local/output asset candidates, dedupe ordering, prompt fallback, and source-label helpers from `TabDistribute.tsx` into a typed `distributeAssetOptions` module.
- Kept React state ownership, publish flow, account selection, caption generation, recent context, history, and GeeLark API payloads in place.
- Added a small `getVideoFileUrl` guard for Node test environments where `import.meta.env` is undefined, with no Vite runtime behavior change.
**Tests / Build:**
- Added targeted helper tests, reran existing distribution view-model tests, and reran production builds/eval before release.

## v0.193 - 2026-05-11
**Legacy surface reduction**
**Navigation / Legacy surfaces:**
- Hid the parked `/tiktok-matrix` Risk Console from primary sidebar navigation while keeping direct URL access and the legacy `/geelark` and `/geelark-batch` redirects alive.
- Kept Platform planning pages direct-link-only and added source-presence tests that guard direct routes, visible core Campaign/Studio/Distribution nav targets, and `sj-ui` isolation.
- Documented `src/sj-ui` as a separate rollback-friendly deletion candidate instead of deleting it in the same navigation cleanup.
**Tests / Build:**
- Added targeted legacy-surface source tests and reran production builds/eval before release.

## v0.192 - 2026-05-11
**Data contract hardening**
**Campaign / Studio / Distribution:**
- Added Campaign ID propagation into new Campaign Output Plans, with produced outputs inheriting Campaign, Brief, and parent output lineage.
- Added Distribution Package source lineage for produced Campaign outputs and Studio writeback, including output plan IDs, production item IDs, output IDs, and source asset IDs.
- Added Studio refresh/direct-open restoration from URL IDs plus backend Output Plan data, reducing route-state-only handoff loss.
- Added compact link-health status on Campaign Output and pending Distribution Package surfaces so broken or incomplete chains are visible before distribution prep.
**Tests / Build:**
- Added frontend and backend contract/link-health coverage for healthy and broken chains; rebuilt both API and frontend production bundles.

## v0.191 - 2026-05-11
**Knowledge traceability**
**Campaign Creative / Knowledge Brain:**
- Added deterministic knowledge citation IDs to routed Gold and Glory Brain context so Campaign Brief review can show the exact source entries that informed a generation.
- Added citation feedback persistence with `useful`, `inaccurate`, and `do_not_use_again`; future mission-brief generation suppresses entries explicitly marked do not use again.
- Added Campaign Output Plan knowledge references on planned items and produced drafts, with Workbench labels showing which knowledge supported selling points, hooks, or guardrails.
**Tests / Build:**
- Added backend derivation/store/mission-brief/output-plan coverage plus frontend API/helper/output-plan tests; rebuilt both API and frontend production bundles.

## v0.190 - 2026-05-11
**Distribution final mile**
**Distribution Center:**
- Added browser-local active publish context restore for `/distribute`, preserving the current Package, selected asset, account ids, platform copy drafts, active draft, and publish options after refresh without auto-publishing.
- Added account-group member previews and custom-group update support so operators can inspect group targets and overwrite a saved group from the current selection.
- Added batch-level failure next-action guidance in the latest publish batch, keeping the raw GeeLark/task error visible while telling operators to refresh the batch/history and preserve task/account/log evidence.
**Tests / Build:**
- Added native tests for active distribution context restore, publish failure guidance, and account-group preview/update helpers; reran distribution helper regressions and production builds.

## v0.189 - 2026-05-11
**Character Showcase validation**
**Advanced Studio:**
- Added a machine-readable Character Showcase validation ledger with 10 records covering 5 characters x 2 directions: character reveal and skill/selling-point showcase.
- Added deterministic summary helpers that calculate usable rate, video-vs-Banner fit, high-risk cases, and a strict `continue` / `experimental` / `pause` decision; the current fixture is constrained `continue` at 5/10 usable.
- Added a Character Showcase validation notice to the Studio template entry and preset recommendation metadata so operators see that the path is best for single-character reveal, single-character skill payoff, and simple reward payoff rather than group/UI-heavy scenes.
**Tests / Build:**
- Added targeted Character Showcase validation tests and extended Studio template/preset tests for the constrained continue notice and recommendation metadata.

## v0.188 - 2026-05-11
**Motion Transfer validation**
**Advanced Studio:**
- Added a machine-readable Motion Transfer validation ledger with 10 sample records covering action type, character asset class, generated-result assessment, success/failure reason, risk level, and ad-usability.
- Added deterministic validation summary helpers that calculate usable rate and force the conclusion to `continue`, `experimental`, or `pause`; the current fixture is `experimental` at 2/10 usable.
- Added an experimental validation notice to the Motion Transfer Studio template entry so operators do not mistake it for a stable ad-production path.
- Documented suitable action types, high-risk action types, and the <3/10 usable exit rule without touching provider services or video generation routes.
**Tests / Build:**
- Added targeted Motion Transfer validation tests and extended Studio template tests for the experimental notice.

## v0.187 - 2026-05-11
**Quality review and next-version MVP**
**Campaign Output Workbench:**
- Added a produced-output quality review panel that summarizes existing human marks, selected feedback tags, and static Run 0 rules without claiming automatic video understanding.
- Added fixed Run 4 feedback buttons for weak selling point, weak first 3 seconds, slow pacing, character mismatch, reference-motion mismatch, weak copy, and TikTok/Facebook fit.
- Added next-version draft creation for Banner prompts and platform copy outputs, preserving `parentOutputId`, Campaign/Brief context, inherited source asset IDs, feedback tags, issue tags, reviewer notes, and reviewer metadata.
- Kept video next-version wording as follow-up task/prompt only; this run does not do local video partial regeneration or provider calls.
**Tests / Build:**
- Added frontend feedback-action coverage for next-version traceability, repeated child draft IDs, copy/Banner support, fixed tag filtering, and Workbench wiring.
- Added backend output-plan persistence validation for feedback metadata round-trip and invalid feedback-tag rejection.

## v0.186 - 2026-05-10
**Banner Output MVP**
**Campaign Output / Distribution Prep:**
- Added Banner as a first-class Campaign Output item with four initial specs: square 1:1, portrait 4:5, story 9:16, and landscape 16:9.
- Added Banner source-asset reuse from Asset Library IDs, including Run 1 team category matching for logos, finished banners, key art, character art, gameplay screenshots, and UI screenshots.
- Added deterministic Banner prompt placeholder production for ready Banner items, without calling image generation providers or claiming a final downloadable design.
- Added a Workbench Banner card with selected source assets, short copy, CTA, prompt placeholder, and three-state human quality marking (`usable`, `needs_fix`, `unusable`).
- Added distribution package handoff for produced Banner placeholders as non-publishable image context with `assetReadiness.state = generating`.
**Tests / Build:**
- Added frontend coverage for Banner specs, Asset Library category mapping, prompt placeholder production, quality marking, Workbench wiring, and distribution package handoff.
- Added backend campaign output plan validation coverage for `banner_prompt`, Banner metadata, and invalid quality-status rejection.

## v0.185 - 2026-05-10
**Asset Library reuse metadata MVP**
**Asset Library / Campaign Contracts:**
- Added a stable team-facing Asset Library category vocabulary aligned with Run 0 `AssetContract` categories for character images, scene images, UI screenshots, logos, gameplay screenshots, video clips, finished banners, and reference images.
- Added additive reuse metadata on Asset Library responses, including category source, preprocessing summary, file type, dimensions, aspect ratio, thumbnail readiness, video duration, and audio presence.
- Added manual category correction through `PATCH /api/asset-library/assets/:id/category`, preserving original `ai_category` evidence while storing operator correction in `team_category`.
- Added frontend detail-drawer category correction and a material helper that maps `LibraryAsset` records to Run 0 `AssetContract` references by `assetId` without copying file payloads.
**Tests / Build:**
- Added backend native node:test coverage for category fallback, preprocessing summary, invalid category rejection, cross-user rejection, and manual category persistence.
- Added frontend native node:test coverage for `LibraryAsset` to `AssetContract` mapping and duration conversion.

## v0.184 - 2026-05-10
**Story video human review capture**
**Campaign / Studio Result:**
- Added a result-page story video review panel so operators can manually mark generated videos as `usable`, `needs_fix`, or `unusable` using the Run 0 quality contract states.
- Added fixed story-video issue tags for weak opening, slow pacing, unclear selling point, weak ending, and inaccurate character, plus an optional next-version note field.
- Stored review records in a Run 0 `ReviewContract`-compatible shape linked by `outputId`, with Campaign Studio handoff outputs using their production item id and standalone results deriving a stable story-video task id.
- Kept the UI explicit that these are human-entered reviews, not automatic video understanding.
**Tests / Build:**
- Added native node:test coverage for story review id derivation, fixed tags, ReviewContract-compatible record creation, invalid storage filtering, and output-level review listing.

## v0.183 - 2026-05-10
**Creative quality and data contract foundation**
**Campaign / Workflow:**
- Added Window A Run 0 frontend contracts for three-state creative quality (`usable`, `needs_fix`, `unusable`) and the minimal Campaign -> Asset -> Output -> Review -> Package graph.
- Added deterministic rubric helpers and fixture-backed graph validation so later Asset Library, Banner, story-review, and next-version runs can share IDs before touching shared Workbench or backend route files.
- Documented the Run 0 contract boundaries and downstream handoff for Run 1, Run 2, Run 3, and Run 4.
**Tests / Build:**
- Added native node:test coverage for the three quality states, invalid status rejection, valid fixtures, missing campaign/asset/output links, parent output links, and duplicate IDs.

## v0.182 - 2026-05-10
**Advanced Studio storyboard pacing and state references**
**Production Wizard:**
- Added a sourced Duration Plan design for Advanced Studio so future storyboard generation can turn target duration into beat budgets and shot-count changes instead of simply stretching single shots.
- Improved character-state matching so aliases such as 童年时期, 小时候, childhood, and related age terms can resolve to the correct state image before Seedance multimodal references are assembled.
- Repaired Chinese mojibake in storyboard video version timeline and A/B compare controls.
**Tests / Build:**
- Added regression coverage for automatic childhood-state matching, manual override priority, and locale mojibake markers in user-facing message sources.

## v0.181 - 2026-05-09
**Release collaboration governance**
**Workflow / Deploy:**
- Added a Dev Worker -> Release Owner handoff checklist for multi-window work, making commit-only development handoffs explicit and keeping staging/prod deployment serialized in one release window.
- Hardened deploy artifact upload internals so small archives still stream over SSH, while larger archives can upload as bounded base64 parts with retry, cleanup, and optional fresh SSH sessions per part before server-side merge/extract.
- Wired API and frontend local upload paths to use isolated upload connections for larger archives without changing deployment CLI flags or prod frontend server-side promotion behavior.
**Tests / Build:**
- Added regression coverage for chunked large-archive upload with an upload connection factory and reran the deploy API unit test slice.

## v0.180 - 2026-05-09
**Multi-window development/release split**
**Workflow / Skills:**
- Updated GOBS development and release skills so Dev Worker windows own implementation, verification, commit, push, and handoff, while one Release Owner window serializes staging/prod deployment, smoke, release-ready marking, and idle restore.
- Added explicit multi-window guardrails in skills and `AGENTS.md` to avoid parallel windows racing on deployment scripts, deployment state, or `origin/main` release SHA.

## v0.179 - 2026-05-09
**Release SSH auth hardening**
**Deploy / Release Guard:**
- Forced password-based Paramiko deployment connections to skip local SSH key and agent probing, fixing staging/prod deploy attempts that could fail or hang before uploading artifacts even when `SERVER_PASSWORD` was valid.
- Explicitly sends EOF on streamed SSH artifact uploads after closing stdin, so remote `cat > /tmp/*.tar.gz` commands exit cleanly after reaching 100% upload.
- Splits larger deployment archives into 32KB base64 remote parts before server-side merge/extract, avoiding slow SSH links that stall during a single long stdin stream.
- Applied the same password-only auth behavior to API deploy, frontend deploy via the shared SSH helper, release-ready marking, deployment-state updates, prod promotion readiness reads, and dual-env initialization.
**Tests / Build:**
- Added regression coverage for password-only SSH connect parameters and reran the release/deploy Python test slice.

## v0.178 - 2026-05-09
**Distribution operator happy path polish**
**Distribution / Campaign Production Loop:**
- Added browser-local recent publish configurations on `/distribute`, letting operators explicitly restore recent Package, asset, account, copy, and publish-option context after refresh without auto-publishing.
- Added latest-batch next actions so operators can review the current batch summary or jump directly to publish history after a publish attempt.
- Added compatible GeeLark publish-history status/platform/search pagination and CSV export support while preserving the default `items/history` response shape.
- Added clearer publish failure guidance while keeping the raw provider/preflight error visible for debugging.
- Continued low-risk `TabDistribute` extraction through deterministic Distribution view-model helpers, keeping state ownership and GeeLark publish payloads unchanged.
- Extended Campaign Studio video writeback so linked Output Plan items retain generated Studio asset ids and distribution package ids after refresh.
- Added a guarded GeeLark real-publish verifier script that defaults to dry-run and refuses live posting unless an operator supplies account/material/caption plus `--confirm REAL_GEELARK_POST`.
- Added the legacy-surface audit for `sj-ui`, RiskSentiment/TiktokMatrix, and Platform routes without deleting runtime surfaces.
**Tests / Build:**
- Added recent-context, Distribution view-model, publish-step, Campaign Studio package/output-plan, and backend output-plan persistence coverage; reran targeted frontend/backend tests and TypeScript checks.

## v0.177 - 2026-05-09
**Distribution Center readiness navigation**
**Distribution / Operator Flow:**
- Added a compact four-step readiness overview above `/distribute`'s operator sections so marketers can see asset, copy, account, and publish readiness before scrolling.
- Added stable jump anchors for the asset, video/copy, target accounts, and preflight/publish sections without converting the page into a forced wizard.
- Kept readiness derived from existing preflight and publish state, preserving Campaign Package intake, caption generation, account selection, GeeLark publish submission, latest batch tracking, and publish history behavior.
**Tests / Build:**
- Added focused nav render/source coverage, reran targeted distribution tests, frontend production build, backend production build, standard eval, and diff hygiene checks.

## v0.176 - 2026-05-09
**Release tooling SSH stream follow-up**
**Deploy / Release Guard:**
- Replaced the Paramiko SFTP artifact transfer path with SSH-streamed tarballs written to remote temporary files and extracted by remote `tar`, avoiding the observed SFTP completion hang after 100% upload progress.
- Kept deploy uploads bounded with explicit SSH channel/socket timeouts, visible archive progress logs, deterministic resource cleanup, and non-zero CLI exits on failure.
- Updated prod frontend deployment to promote the already verified staging frontend directory server-side, so prod no longer repeats the slow local-to-cloud frontend upload.
**Tests / Build:**
- Extended deploy API/frontend/deploy-all regression coverage for SSH-streamed uploads and staging-to-prod frontend promotion, then reran the release/deploy Python test suite on Python 3.10.

## v0.175 - 2026-05-09
**Distribution Center step refinement**
**Distribution / Operator Flow:**
- Split `/distribute` into four visible operator sections: asset selection, video/copy, target accounts, and preflight/publish confirmation.
- Extracted `DistributeStepAsset`, `DistributeStepCopy`, `DistributeStepAccounts`, and `DistributeStepPublish` as presentational callback-driven components while keeping package hydration, account loading, caption generation, publish submission, batch polling, and history loading in `TabDistribute`.
- Preserved Campaign Package intake, direct caption hints, account-group quick selection, platform copy cards, latest publish batch tracking, and filtered publish history without touching GeeLark backend routes/services.
**Tests / Build:**
- Added distribution step presence/render coverage, reran targeted distribution tests, frontend production build, backend TypeScript/build-equivalent checks, and local Playwright visual verification for `/distribute`.

## v0.174 - 2026-05-09
**Release tooling hardening**
**Deploy / Release Guard:**
- Replaced Python 3.11-only `datetime.UTC` usage in release/deployment timestamp helpers with Python 3.10-compatible UTC handling, including the dual-env initialization script.
- Hardened `deploy_api.py` with tarball-based API artifact upload streamed through SSH to a remote temporary file before extraction, SSH keepalive, bounded channel/socket timeouts, stdout/stderr draining, non-zero exit-code errors, and deterministic cleanup.
- Hardened `deploy_frontend.py` with the same SSH-streamed tarball upload path, archive upload progress, resource cleanup in `finally`, and non-zero CLI exit behavior on failure.
**Tests / Build:**
- Added deploy frontend regression coverage and extended deploy API tests for tarball creation/extract, SSH-streamed file upload, remote command failures, and remote command timeout closure; reran the release/deploy Python test slice on the default Python 3.10 runtime.

## v0.173 - 2026-05-09
**Campaign Production Loop closeout**
**Campaign / Studio / Distribution:**
- Extended Campaign Output -> Advanced Studio handoff context with stable output-plan, production-item, source-requirement, and optional distribution-package identifiers.
- Preserved Campaign Studio handoff context inside `CreateFlowContext` after router state is consumed, so generation results can still find the originating package.
- Added package-safe Studio result sync: successful Studio videos patch linked Campaign Distribution Packages through existing `assets`, `assetReadiness`, and `review` fields, making them publishable without backend schema changes.
- Updated Result and async Dreamina result links so distribution CTAs preserve `/distribute?package=<id>` when a Campaign package is linked.
**Tests / Build:**
- Added handoff, package-patch, and source-presence tests; corrected the stale Distribution intake test from `formPrefill` to `captionContext`; reran targeted Node tests and frontend/backend TypeScript checks. Full Vite build remains blocked on the local Rollup native optional package signature issue.

## v0.172 - 2026-05-09
**Distribution publish history filters**
**Distribution / GeeLark History:**
- Replaced the inline `/distribute` publish-history list with the reusable `DistributePublishHistory` component.
- Added frontend-only status filters, platform-derived filtering, free-text search, date grouping, filtered-empty copy, and preserved task detail/share-link actions.
- Kept GeeLark publish APIs, task-history API shape, scheduling, pagination, CSV export, and analytics out of scope.
**Tests / Build:**
- Added focused helper/render coverage for history filtering and grouping, then reran the targeted distribution test plus frontend/backend production builds.

## v0.171 - 2026-05-09
**Campaign Output to Advanced Studio bridge**
**Campaign / Studio / Asset Library:**
- Added an "Open in Advanced Studio" handoff for eligible Campaign Output video items, carrying the production prompt, target Studio template, and matched game source asset IDs through React Router state.
- Added a Studio handoff consumer that preselects Quick Single or Character Showcase, seeds the prompt, and safely imports matched Asset Library images as Dreamina multimodal references without touching protected generation services.
- Added a reusable `UnifiedAssetSelector` foundation in Studio so Quick Single, Motion Transfer, and Character Showcase can pull structured reference slots from Asset Library while keeping legacy Drive selection available.
- Added Studio quality prompt presets for Character Showcase subtypes, Motion Transfer direction, and BGM mood hints as prompt guidance only.
**Tests / Build:**
- Added bridge/preset/source-presence tests and reran targeted Node tests plus the frontend production build.

## v0.170 - 2026-05-09
**Distribution Center operator MVP**
**Distribution / Campaign Package / GeeLark Accounts:**
- Removed the duplicate editable Campaign Brief form from `/distribute`; Campaign Package context now appears as a read-only summary that still feeds caption generation.
- Added a lightweight direct-publish caption hint and platform copy cards that show selected-account counts while preserving the existing platform-grouped publish payload.
- Added permission-scoped account group quick selection from `group:` account remarks plus custom localStorage groups, with stale IDs filtered against currently permitted accounts.
- Enriched pending package cards with angle, hook, target platform/market, publishability badges, and missing-asset next actions without changing GeeLark core routes/services.
**Tests / Build:**
- Reran frontend TypeScript checks after the MVP UI changes; full release verification evidence is recorded in the workflow run.

## v0.169 - 2026-05-09
**Advanced Studio template optimization Phase 1**
**Studio / Templates:**
- Reduced the Studio creation picker to three marketer-facing paths: Quick Single, Motion Transfer, and Character Showcase.
- Removed active Short Drama / Cat Harem template configs, fallback presets, and short-drama UI branches while keeping the legacy presets endpoint compatibility-safe with an empty response.
- Hid `cg-trailer` from Studio template APIs and frontend fallback data while retaining its config file for a later Production Wizard promo preset handoff.
- Added Quick Single prompt inspirations plus template-specific duration/aspect choices: Quick Single 4/6/8/10s with 9:16/16:9/1:1, Motion Transfer 5/8/10s, and Character Showcase 9:16/16:9.
**Tests / Build:**
- Added backend template registry and frontend template-option/fallback tests, then reran frontend/backend TypeScript checks and targeted native Node tests.

## v0.168 - 2026-05-09
**Campaign Source Asset readiness**
**Campaign / Output Workbench / Asset Library:**
- Connected Campaign Creative output plans to existing Asset Library records so source-asset requirements can surface matching candidates instead of only showing generic missing-asset states.
- Added row-level source asset actions in Output Workbench: matched asset references, choose-from-library flow, and upload/add routing for missing game source assets.
- Added deterministic selection helpers so confirmed source assets only unblock the production items that require them while text/post outputs remain producible and distribution-safe.
**Tests / Build:**
- Added focused source-readiness and AssetPicker source tests, then reran Campaign Output, Workbench, production adapter, and distribution bridge regressions with Node's native test runner.

## v0.167 - 2026-05-08
**Campaign Output one-click production**
**Campaign / Output Workbench:**
- Streamlined the post-brief Output Workbench primary action so first confirmation produces supported text/post drafts and persists the produced plan in one step.
- Preserved saved-plan idempotency by keeping subsequent confirmations on the update path, so already produced outputs are not duplicated.
- Updated Workbench wiring and bilingual copy to remove the separate save-only step from the default Campaign Mission Control path.
**Tests / Build:**
- Added source-level integration and UI presence assertions for one-click production, then reran output-plan, production-adapter, distribution-bridge tests plus backend and frontend production builds.

## v0.166 - 2026-05-08
**Campaign Output production adapters Phase 2A**
**Campaign / Production / Distribution:**
- Added deterministic Phase 2A production for supported Output Workbench text items: captions, headlines, hashtags, and Facebook posts now produce reviewable draft content after output-plan confirmation.
- Extended `ProductionItem` with validated `producedOutputs` and preserved those drafts through the owner-scoped `/api/campaign-output/plans` API.
- Updated Campaign Creative package creation so produced text outputs feed pending distribution package copy while account selection, media readiness, and final publish remain explicit.
**Tests / Build:**
- Added frontend adapter, UI presence/integration, distribution bridge, and backend persistence tests; reran targeted suites plus backend and frontend production builds.

## v0.165 - 2026-05-08
**Campaign Output Workbench Phase 1**
**Campaign / Distribution / Source Assets:**
- Added deterministic `CampaignOutputPlan` modeling and tests so confirmed briefs produce visible deliverables, concrete game source asset requirements, GOBS production capability statuses, and capability gaps.
- Added backend `/api/campaign-output/plans` create/list/read/update persistence with server-owned user scoping, explicit validation, SQLite indexes, and payload round-trip tests.
- Added the frontend Campaign Output Workbench component, output-plan API helpers, CampaignCreative integration, and bilingual copy so the default post-brief surface leads with planned outputs instead of internal system reasoning.
- Added a distribution bridge from produced output items to pending distribution package drafts while keeping blocked/unsupported items non-publishable and preserving explicit account selection.
**Tests / Build:**
- Added frontend model, UI presence/integration, distribution bridge, and backend API tests; reran targeted suites plus backend and frontend production builds.

## v0.164 - 2026-05-08
**Campaign Output Workbench plan hardening**
**Docs / Product Planning:**
- Incorporated OpenClaw review into the Campaign Output Workbench design with a deterministic Phase 1 mapping table for deliverables, source asset requirements, fallback behavior, and capability-gap creation.
- Split the Phase 1 UI implementation plan into separate component/API and CampaignCreative integration tasks, reducing Builder risk before runtime work starts.
- Expanded required edge-case tests, clarified capability-gap consumption, documented Phase 2-4 follow-up plan boundaries, and verified release-script assumptions in the current repo.

## v0.163 - 2026-05-08
**Campaign Output Workbench planning**
**Docs / Product Planning:**
- Added `docs/plans/2026-05-08-campaign-output-workbench-game-source-assets-design.md`, defining the next Campaign Mission Control step as an output workbench focused on deliverables, game source asset readiness, GOBS production capability, and capability gaps.
- Added `docs/plans/2026-05-08-campaign-output-workbench-game-source-assets-plan.md`, breaking the approved direction into output-plan modeling, backend persistence, frontend workbench UI, distribution-package bridging, tests, run docs, and release sync.
- Updated planning indexes so the current mainline points from the completed Distribution Handoff MVP toward B-stage output workbench execution with a C-stage autopilot path.

## v0.162 - 2026-05-07
**Daily review workflow and report archive**
**Docs / Workflow:**
- Added `.agents/skills/daily-review/` as a repo-local skill for evidence-based daily work recaps using git history, PRODUCT changelog entries, workflow run docs, and prior daily reports.
- Added `docs/daily-reports/2026-05-06.md`, summarizing the 2026-05-06 shipped work, bug-fix ratio, repeated issue clusters, verification rigor, and recommended next-day TODOs.
- Kept this release documentation-only; no runtime Campaign Creative, Distribution handoff, API, or publishing behavior changed.

## v0.160 - 2026-05-07
**Campaign Creative -> Distribution Handoff MVP Builder**
**Campaign / Distribution / Package Persistence:**
- Added backend `Campaign Distribution` package create/list/read/update APIs backed by the existing SQLite asset DB, with server-owned `ownerId/createdBy/updatedBy`, safe review/asset-readiness validation, and ownership seam tests.
- Added a mission-first `Distribution Package` panel to `/campaign-creative`, so confirmed generated briefs plus selected/recommended variants can be saved as pending packages with routed Gold and Glory knowledge context while keeping `Open In Advanced Studio` as the advanced path.
- Added `/distribute` pending-package intake through a package-to-draft adapter and `Pending Packages` panel, including `?package=` hydration, prefilled asset/copy/campaign hints, explicit account-safety messaging, and missing-asset next actions for Asset Library or Quick Film.
- Fixed the login page so isolated worktrees and split-port dev smoke use the same `VITE_API_BASE_URL` as the rest of the app instead of falling back to a mismatched relative auth path.
**Tests / Build:**
- Added focused frontend source/adapter tests plus backend seam tests, added a login auth-base regression test, reran backend/frontend typecheck, reran the frontend build, revalidated `workflow_guard --stage build/verify`, and completed local browser smoke for `/campaign-creative` -> `/distribute?package=<id>`.

## v0.161 - 2026-05-07
**Mission-first brief generation stability**
**Campaign Creative / Gold and Glory Brain:**
- Replaced the raw clipped routed knowledge digest before `POST /api/campaign-creative/mission-brief` with a short per-section summary digest, and tightened the LLM request to single-line JSON with a lower-variance temperature, keeping the prompt compact enough that large ready-pack sets no longer truncate the reply and force a noisy deterministic fallback in the default Campaign Creative path.
- Preserved the backend-routed knowledge model and full returned `knowledgeContext`; only the LLM-facing digest was compacted, so downstream System Plan / Variant Pack / Distribution Package consumers still receive the same routed context fields.
**Tests / Build:**
- Added a focused backend regression test for verbose routed context, reran the backend mission-brief suite, and revalidated the fix against the real 8-pack routed staging and prod contexts before release sync.

## v0.159 - 2026-05-07
**Campaign distribution handoff mission-first alignment**
**Docs / Product Planning:**
- Aligned the Campaign Creative -> Distribution Handoff MVP design with the released `a94a7f5` mission-first Campaign Creative baseline: mission, generated brief review, System Plan / Variant Pack, then Distribution Package.
- Updated the package contract and planner-spec so pending distribution packages preserve mission/brief snapshot, generation source, warnings, selected/recommended variant, and backend-routed Gold and Glory knowledge context.
- Added guardrails that forbid reintroducing marketer-facing Knowledge Brain pack selection, multi-project brain selection, or the old expert brief form into the default Campaign Creative path.

## v0.158 - 2026-05-07
**Campaign Mission Control mission-first autopilot**
**Campaign Creative / Gold and Glory Brain:**
- Added `POST /api/campaign-creative/mission-brief` so the backend automatically routes ready Gold and Glory knowledge packs, derives context, generates a structured brief with Compass, and falls back deterministically when LLM generation is unavailable.
- Rebuilt `/campaign-creative` around a mission composer and generated brief review, removing marketer-facing knowledge-pack selection and full blank-brief entry from the default path.
- Preserved the existing System Plan, Variant Pack, and Advanced Studio handoff contracts after brief confirmation, with targeted tests for backend generation, frontend API wiring, and default selector removal.

## v0.157 - 2026-05-07
**Campaign distribution implementation guardrails**
**Docs / Product Planning:**
- Clarified that Campaign Distribution packages should use the existing `assetDb.ts` better-sqlite3 database with a `campaign_distribution_packages` table, indexed owner/status/time columns, and `payload_json` for the full package body.
- Added a `TabDistribute` integration budget: if direct package intake requires broad publish/account rewiring, Builder should split to a smaller Pending Packages entry/panel instead of risking the existing distribution flow.
- Added `needs_asset` next-action guidance and creation-confirmation requirements so missing-asset packages lead operators toward asset-library selection, Quick Film generation, or Editor fine-tuning instead of a dead-end draft.

## v0.156 - 2026-05-07
**Campaign distribution handoff planning guardrails**
**Docs / Product Planning:**
- Tightened the CampaignDistributionPackage design with server-owned `ownerId`, `createdBy`, and `updatedBy` fields, plus current-user filtering requirements for package list/read/update APIs.
- Added explicit asset readiness rules so `needs_asset` is package asset state, not review status, and publishable packages require a server-resolvable path, verified URL, or backend-resolvable gallery asset.
- Expanded the planner-spec with a package-to-distribution-draft adapter, ownership tests, asset-readiness tests, and deterministic Distribution intake mapping before Builder starts implementation.

## v0.155 - 2026-05-07
**Campaign Creative to Distribution handoff planning**
**Docs / Product Planning:**
- Added the Campaign Creative -> Distribution Handoff MVP design, aligning OpenClaw's code/product evaluation with the current GOBS north star: knowledge-backed campaign variants should become publish-ready packages instead of forcing marketers through the heavy Editor by default.
- Bootstrapped run `2026-05-07-campaign-to-distribution-handoff-mvp` with a scoped Gate 1 planner-spec covering package data contracts, backend package APIs, Campaign Creative package creation, Distribution intake, safety guardrails, and test expectations.
- Refreshed task and plan indexes so the next active mainline points to the campaign-to-distribution package workflow before Dashboard, navigation IA, scheduling, analytics, or Knowledge -> Memory writeback work.

## v0.154 - 2026-05-07
**Advanced Production English reference UX**
**Advanced Studio / Production Wizard:**
- Fixed English-mode Dreamina multimodal reference UX so reference cards, manual matching controls, context hints, and prompt restore actions follow English UI copy while preserving Dreamina's required `@图片n` protocol tokens.
- Improved English reference injection for names such as `Mexican Gaming Son`, `Mexican Father`, and `Toothbrush Aisle` through unique aliases without stacking multiple tags on shared words.
- Dreamina multimodal enqueue now submits the visible multimodal prompt instead of stale execution segment text, so queued jobs carry the image-reference prompt shown in the panel.

## v0.153 - 2026-05-07
**Documentation hygiene and active-run cleanup**
**Docs / Workflow:**
- Refreshed `docs/TASK-INDEX.md` so the active project entry point reflects the current Gold and Glory Campaign Creative Agent mainline instead of the old April stability backlog.
- Removed duplicate trailing release-note fragments from `PRODUCT.md` and `CHANGELOG.md`, keeping recent history canonical and easier to scan.
- Reclassified `production-english-reference-ux` as Advanced Studio side-lane work after the parallel fix landed, so it remains documented without becoming the current Campaign Creative Agent priority.

## v0.152 - 2026-05-07
**Gold and Glory canonical fastpublish brain**
**Campaign Knowledge / Fastpublish Brain:**
- Added a committed `gold-and-glory-canonical` brain seed derived from curated fastpublishing knowledge across brand tone, compliance, visual style, Malaysia market, persona, live ops calendar, live ops history, and selling-point playbook.
- Backend template import now creates stable persisted source and pack ids for the canonical brain, with original fastpublishing source paths and `sha256` checksums for future refresh/diff runs.
- Frontend brain import now targets the Gold and Glory canonical template instead of the generic `fastpublish-core` demo template, and the Platform Framework action copy now says `GNG Brain` explicitly.
**Tests / Docs:**
- Added targeted backend coverage for repeatable canonical import, wrong-game protection, source metadata, and derived campaign context; added frontend coverage for the default canonical template id; documented the manual fastpublishing -> GOBS refresh workflow.

## v0.151 - 2026-05-07
**Gold and Glory single-brain shell correction**
**Campaign Creative / Knowledge Brain / Platform Memory:**
- Removed the marketer-facing multi-project demo seed from the frontstage platform memory defaults and collapsed the visible brain target to `Gold and Glory` only.
- Reframed the `Knowledge Brain` shell so `/campaign-creative` no longer shows `Project Nova Arena`, `Idle Kingdom Go`, or `Current Game` copy, while keeping the existing knowledge API contract and derivation flow intact.
- Tightened the empty-state, unsupported-state, and fallback copy so the UI stays honest: Gold and Glory is the only supported frontstage brain target, but real fastpublish knowledge content may still be missing and strategy generation can still fall back to brief-only mode.
**Tests:**
- Added single-brain frontstage regression coverage for the stable knowledge id helper and selector shell copy, reran the targeted locale/brain tests, rebuilt the frontend bundle, and revalidated backend typecheck plus workflow guard.

## v0.150 - 2026-05-07
**Advanced Studio phase-1 nav demotion and review-queue emphasis**
**Campaign / Home / Navigation:**
- Moved `/projects` out of the primary `Mission Control` nav group and into `Advanced Studio`, so project-level review work no longer reads like a default campaign entry point.
- Strengthened the Home review queue as the clearer follow-on action with a dedicated `Review Pending Decisions` CTA, while keeping `Campaign Creative` as the primary recommended path.
- Softened the homepage’s Advanced Studio copy so the professional workspace reads as optional follow-on tooling instead of the next expected click.
**Tests:**
- Added locale assertions for the new home/layout review and advanced-entry wording, reran the targeted locale regression suite, rebuilt the frontend bundle, and captured `eval.sh` evidence for the run.

## v0.149 - 2026-05-07
**Advanced Studio phase-0 marketer-first entry demotion**
**Campaign / Studio / Copy Hierarchy:**
- Reframed advanced follow-on entry points so `/campaign-creative` launches `Open In Advanced Studio` as a clearly secondary step instead of reading like the default workflow.
- Updated `/projects` to read as an advanced review workspace with `Review Before Publish` framing while preserving the existing project list, card click behavior, and route targets.
- Added an editor-side `Fine-Tune In Editor` guidance banner so shot-level and subtitle-level controls remain available without competing with the marketer-first Mission Control flow.
**Tests:**
- Added locale assertions for the new advanced-entry labels, reran the targeted locale regression suite, rebuilt the frontend bundle, and captured `eval.sh` evidence for the run.

## v0.148 - 2026-05-07
**Campaign Mission Control phase-0 marketer-first shell**
**Campaign / Mission Control / Handoff:**
- Added shared `campaignProfile`, `campaignPlan`, and optional `feedbackRecords` contracts to the Campaign Creative -> Editor normalization seam so the marketer-facing shell can carry mission-control context without breaking the existing knowledge-aware strategy flow.
- Reframed the homepage and top-level navigation around `Campaign Mission Control`, kept `/campaign-creative` as the recommended entry, and moved deeper editor-style routes under an `Advanced Studio` label instead of leading with tool-first copy.
- Reworked `/campaign-creative` to present campaign brief, selected knowledge, system plan, and pending review decisions ahead of local tuning controls while preserving the existing strategy card, variant pack, and editor launch path.
**Tests:**
- Added mission-control seam and planning regression tests, refreshed locale assertions, and revalidated backend seam tests plus frontend/backend production builds.

## v0.147 - 2026-05-07
**Campaign planning docs and workflow template sync**
**Docs / Workflow / Planning:**
- Added the fastpublish knowledge-integration design and implementation plans to the mainline docs set so the shipped Knowledge Brain work has a durable upstream reference.
- Refreshed the campaign mission-control implementation plan to depend on the landed knowledge-aware creative flow instead of the older brief-only assumption.
- Added a reusable `planner-spec-template.md` and upgraded the run templates so campaign-creative-related runs carry the same north-star and product-shape guardrail by default.
- Cleaned the plans index so the current campaign, mission-control, and knowledge-brain docs resolve to the active workspace paths instead of stale machine-specific links.

## v0.144 - 2026-05-06
**Campaign Creative -> Editor knowledge handoff**
**Editor / Knowledge Context / Memory:**
- Campaign Creative handoff now preserves applied `knowledgePackIds` plus structured knowledge context so EditorWorkbench can restore the same market truth, audience tension, tone rules, visual cues, approved angles, hook candidates, and forbidden claims that were approved on the strategy page.
- Editor apply and apply-stream now normalize that knowledge-aware payload end to end, including brief-only fallback strategy generation, prompt assembly, and memory promotion into stable facts, preference signals, and avoid signals.
- The editor strategy card now shows an applied-knowledge summary so operators can confirm which knowledge packs and constraints the first cut is honoring, while legacy brief-only handoff payloads remain compatible.
**Tests:**
- Added targeted frontend/backend seam tests for knowledge-context normalization, strategy fallback reconstruction, strategy-card rendering, and memory promotion, then revalidated backend typecheck plus frontend/backend production builds.

## v0.142 - 2026-05-06
**Campaign Creative knowledge consumption**
**Frontend / Campaign Creative:**
- Added a Knowledge Brain selector on /campaign-creative so the current game's persisted packs can be selected, refreshed, and applied before strategy generation.
- Upgraded local strategy generation to consume derived campaign knowledge context, enriching strategy cards with market truth, audience tension, tone rules, forbidden claims, visual cues, approved angles, and knowledge-driven hooks while keeping zero-pack fallback intact.
- Reused the same knowledge-aware strategy state for the Variant Pack flow, so regenerated variants stay aligned with the selected knowledge context instead of reverting to brief-only heuristics.
**Tests:**
- Added targeted strategy knowledge tests covering derived-context merge, zero-context fallback, and knowledge-aware variant differentiation, then revalidated the existing campaign strategy and knowledge-brain frontend tests plus production build.

## v0.141 - 2026-05-06
**Marketer-first video distribution workspace foundations**
**Distribution / UX / Prompt Wiring:**
- TabDistribute now starts from a selected asset workspace instead of relying on fresh Studio-only state, and users can pick from current flow, local gallery, or recent server outputs before publishing.
- Account selection is now explicit, per-platform drafts are visible and editable, and the page surfaces campaign framing inputs plus existing publish options like markAI and 
eedShareLink.
- /api/geelark/tasks now returns normalized publish history alongside compatible raw items, and /api/prompt/generate-caption accepts optional campaignContext fields without new env vars.
- Added targeted frontend/backend regression tests plus a P2 scheduling design spike document, while keeping runtime scheduling and approval flow out of scope for this slice.

## v0.140 - 2026-05-06
**English localization hardening for language presets, editor API errors, and export overview**
**i18n / Editor / Production Wizard:**
- UI/content language switching now supports explicit preset combinations instead of forcing both layers to move together.
- Login and editor-side direct fetch flows now pass locale headers and return localized fallback errors instead of hardcoded Chinese strings.
- Storyboard export overview now uses message keys and locale-aware date formatting end to end.
## v0.139 - 2026-05-06
**Campaign Knowledge Brain foundation**
**Campaign / Knowledge Brain:**
- Added resolver-managed campaign knowledge storage plus new list, template import, source creation, and derive-context APIs so GOBS can persist reusable creative knowledge per game instead of relying on mock-only state.
- Added a first `fastpublish`-inspired template pack set covering tone, compliance, visual style, market fundamentals, persona, live ops, and selling-point playbooks, together with structured context derivation for downstream Campaign Creative and Editor use.
- Reworked the Platform Framework Knowledge Brain block to load real persisted knowledge packs, expose a one-click recommended import action, and clearly gate persistence to stable seeded game ids for this foundation slice.
**Tests:**
- Added targeted backend tests for knowledge storage/import/derivation and frontend tests for Knowledge Brain API wiring/rendering, then revalidated with backend typecheck plus frontend/backend production builds.

## v0.137 - 2026-05-06
**Production Wizard shot success-state reconciliation**
**Advanced Production / Storyboard:**
- Shot strip and aggregate shot status now prefer any playable preview video result over a later failed retry, so recovered shots stay marked as completed.
- Execution-segment aggregate status now treats existing shot-level or segment-level preview media as a successful provider result before surfacing stored failed states.
- Added a regression test covering the case where a shot keeps a playable version while a newer execution attempt fails.
## v0.134 - 2026-05-06
**Repo-local slash entry for the guarded GOBS multi-agent workflow**
**Internal / Dev Workflow:**
- Added repo-local plugin plugins/gobs-loop plus .agents/plugins/marketplace.json so compatible clients can expose a slash-style /gobs-loop entry.
- Added plugins/gobs-loop/skills/gobs-loop-entry/SKILL.md as a thin wrapper that routes slash invocation back into the canonical repo skill gobs-multi-agent-dev-loop.
- Updated the core workflow skill metadata and invocation docs so /gobs-loop and $gobs-multi-agent-dev-loop are documented together, with the explicit skill call kept as the portable fallback.
## v0.133 - 2026-05-06
**Portable slash-invokable packaging for the repo multi-agent workflow skill**
**Internal / Dev Workflow:**
- Packaged `gobs-multi-agent-dev-loop` as a repo-local skill with valid frontmatter, `agents/openai.yaml`, and explicit `$gobs-multi-agent-dev-loop` invocation metadata.
- Added `references/invocation.md` and `references/workflow-map.md` so the skill has a clear structure and portable repo-relative guidance after `git clone` or `git pull` on another computer.
- Removed machine-specific absolute path assumptions from the skill body and related references, keeping cross-computer use repo-relative.
- Revalidated the packaged skill after the slash/invocation packaging update.

## v0.132 - 2026-05-02
**Repo-local multi-agent self-loop workflow guardrails**
**Internal / Dev Workflow:**
- Added repo-private skill `gobs-multi-agent-dev-loop` for lower-touch multi-agent delivery.
- Added `scripts/init_workflow_run.py` to create a full 4+1 run folder with `SESSION-ANCHOR.md`.
- Added `scripts/workflow_guard.py` plus `scripts/workflow_common.py` to enforce forbidden-file boundaries, editable scope ownership, stage artifact readiness, and `PRODUCT.md` updates before verify/release.
- Added unit tests for workflow bootstrap and guard behavior, plus root npm shortcuts `workflow:init` and `workflow:guard`.
- Refreshed workflow docs, contracts, prompts, and templates so the loop is repo-local and repeatable.

## v0.131 - 2026-04-24
**Legacy path fallbacks for dual-env shared-data layout**
**Backend / Compatibility:**
- Editor projects now resolve from shared-data first and can rehome legacy files from old api/editor-projects paths.
- Output gallery scanning and file serving now fall back to legacy api/output paths when shared-data output is empty.
- GeeLark account config loaders now also check ../../config/geelark-accounts.json for split staging/prod layouts.
- Imagen runtime script resolution now supports repo-root scripts/imagen_generate.py in deployed prod/api and staging/api layouts.
- init_dual_env_server now copies legacy output, editor-projects, uploads, db, exports, assets and .data content into each env shared-data directory.
**Tests:**
- Added targeted fallback tests for editor project storage, output gallery legacy paths, GeeLark config path fallback, Imagen script path fallback and dual-env init migration commands.

## v0.130 — 2026-04-24

**高级制片 execution segment 执行层上线**

**Advanced Production / Execution Segments:**
- 保留原始 shots[] 作为叙事分镜主视图，同时新增 executionSegments[] 作为即梦执行层；<4s 的连续短镜会自动合并，>15s 的长镜会自动拆分。
- atch-jobs 与项目持久化支持 segmentId / sourceShotIndexes / primaryShotIndex，成片、失败、取消会优先回写到对应 execution segment，再聚合回原始 shot。
- 高级制片分镜条、工作区与导出页切到 segment-aware 聚合状态，原始 storyboard 仍按 shot 浏览，但状态、完成度、执行分段面板和导出统计都会按 execution segment 聚合展示。
- 补充前后端回归测试：覆盖 execution segment 解析、保存时合并保护、短镜合并、长镜拆分，以及 enqueue 假成功状态判定。
## v0.129 鈥?2026-04-24

**Repo 绉佹湁鍙戝竷闂ㄧ銆丠5 鍐掔儫鎶€鑳戒笌楂樼骇鍒剁墖鍒嗛暅瀵兼紨瑙勫垯灞傛枃妗ｈˉ榻?*

**Internal / Release Ops:**
- 鏂板浠撳簱绉佹湁 skill `gobs-release-guard`锛屾敹鍙?`preflight / staging-release / prod-release / post-release` 妫€鏌ワ紝骞堕€氳繃 PowerShell 鑴氭湰缁熶竴杈撳嚭 `GO / NO-GO / GO WITH WARNINGS`銆?- 鏂板浠撳簱绉佹湁 skill `gobs-h5-smoke-test`锛屾敮鎸?`local / staging / prod` 鐨?`quick / full` 鍐掔儫楠岃瘉锛岃鐩栫増鏈帴鍙ｃ€佺幆澧冩爣璇嗐€佸叧閿矾鐢变笌 expected commit 姣斿銆?- 琛ラ綈绉佹湁 skill 璁捐鏂囨。銆佸疄鏂借鍒掍笌 4+1 run 浜х墿锛屾柟渚垮悗缁鐢ㄥ拰鑷姩鍖栨帴鍏ャ€?
**Advanced Production / Storyboard Rules:**
- 琛ヨ骞舵牎楠屽綋鍓嶄富骞插唴宸插瓨鍦ㄧ殑 `productionStoryboardRules` 瑙勫垯灞傦紝琛ラ綈 design / implementation / run 鏂囨。锛屾槑纭珮绾у埗鐗囧垎闀滅殑闀滃ご鏃堕暱寤鸿銆乣4-15s` 骞冲彴绾︽潫鍜屽€欓€夊悎骞?鎷嗗垎鍒ゆ柇鍙ｅ緞銆?- 閫氳繃鏈疆楠岃瘉纭 `/api/studio/storyboard-table` 宸插皢瀵兼紨瑙勫垯涓婁笅鏂囨嫾鎺ヨ繘鐢熸垚闃舵鐨?`extraNotes`锛屽苟淇濈暀鐢ㄦ埛鏄惧紡杈撳叆鐨勮ˉ鍏呰鏄庛€?- 閫氳繃鏈疆楠岃瘉纭 `autoRefineShots` 浼氬湪淇濇寔 shot 鏁伴噺涓嶅彉鐨勫墠鎻愪笅锛岃繛鍚岀粨鏋勫寲 prompt 涓€璧蜂繚瀹堜慨姝ｄ笉鍚堢悊鐨?`durationSec`銆?- 璁板綍褰撳墠涓诲共涓?`videoKling.ts` 涓?`googleDriveService.ts` 鐨勭被鍨嬪畨鍏ㄥ墠缃慨澶嶅凡閫氳繃鏈湴涓ユ牸缂栬瘧锛屼繚璇佸彂甯冩瀯寤洪摼璺ǔ瀹氥€?
## v0.127 鈥?2026-04-23

**楂樼骇鍒剁墖鍒嗛暅瑙嗛褰掑睘涓庡鍑虹姸鎬佹敹鍙?*

**Backend / Ownership:**
- 鎵归噺鍒嗛暅浠诲姟鍒涘缓銆佸彇娑堛€佹墜鍔ㄨ疆璇㈠拰瑙嗛鏂囦欢鎾斁閮芥敼涓轰弗鏍兼牎楠屽綋鍓嶇櫥褰曡处鍙凤紝鍘嗗彶缂哄け owner 鐨勪换鍔′笉鍐嶈浠绘剰璐﹀彿璇诲彇鎴栨搷浣溿€?
- Quickfilm 閾惧紡鑷姩鎻愪氦涓嬩竴闀滄椂蹇呴』鍚岃处鍙峰悓椤圭洰锛涘嵆姊﹀鍎夸换鍔℃仮澶嶇己灏戣处鍙枫€侀」鐩垨鍒嗛暅绱㈠紩鏃跺彧璺宠繃涓嶆敞鍐岋紝閬垮厤浜х敓鏃犳硶褰掑睘鐨勮棰戜换鍔°€?

**Frontend / UX:**
- 瀵煎嚭瀹＄墖椤垫柊澧炲凡瀹屾垚銆佹帓闃?鐢熸垚銆佸緟澶勭悊涓夌粍姹囨€诲崱锛岀綉鏍艰鍥炬樉绀烘瘡闀滅姸鎬併€佸钩鍙版帓闃熶綅娆℃垨鍗虫ⅵ闃熷垪浣嶆銆?
- 鏂板瀵煎嚭椤电姸鎬佹眹鎬绘祴璇曞拰 Quickfilm 鍚岃处鍙峰悓椤圭洰闃熷垪褰掑睘娴嬭瘯銆?

## v0.126 鈥?2026-04-23

**楂樼骇鍒剁墖鐢熷浘鑴氭湰閮ㄧ讲琛ラ綈**

**Ops / Backend:**
- 鍚庣閮ㄧ讲鐜板湪浼氬湪涓婁紶 `dist/` 鍚庡悓姝ヤ笂浼?`h5-video-tool-api/scripts/imagen_generate.py` 鍒?`/home/ubuntu/qas-h5/<env>/scripts/`锛岃鐩栬鑹插畾濡嗐€佸舰璞＄姸鎬佽。姗便€佸満鏅?閬撳叿鍥俱€佸垎闀滈甯х瓑鍏辩敤 Compass/Imagen 鐢熷浘閾捐矾銆?
- 鏂板閮ㄧ讲鑴氭湰鍥炲綊娴嬭瘯锛岄獙璇佽繍琛屾椂鑴氭湰杩滅鐩綍璁＄畻鍜岀己澶辫剼鏈嫤鎴紝閬垮厤鍚庣画鍙戝竷鍐嶆婕忓彂 `imagen_generate.py`銆?

## v0.125 鈥?2026-04-23

**楂樼骇鍒剁墖鍒嗛暅閫夋嫨鍚庣洿杈句富鎿嶄綔**

**Frontend / UX:**
- 浠庡垎闀滅姸鎬佸鑸垨鈥滆烦鍒板緟澶勭悊鈥濋€変腑闀滃ご鍚庯紝椤甸潰浼氬钩婊戞粴鍔ㄥ埌褰撳墠鍒嗛暅涓绘搷浣滃崱鐗囷紝鍑忓皯鐢ㄦ埛鎵嬪姩瀵绘壘鈥滅敓鎴愬垎闀滆棰戔€濈殑姝ラ銆?
- 涓婁竴闀?/ 涓嬩竴闀滃揩鎹锋祻瑙堜繚鎸佸師琛屼负锛屼笉寮哄埗婊氬姩锛岄伩鍏嶆墦鏂€愰暅妫€鏌ヨ妭濂忋€?

## v0.124 鈥?2026-04-23

**楂樼骇鍒剁墖鍒嗛暅寰呭鐞嗗鑸?*

**Frontend / UX:**
- 鍒嗛暅鐘舵€佸鑸柊澧炩€滃緟澶勭悊鈥濈瓫閫夛紝鍚堝苟鏈敓鎴愩€佸け璐ャ€佸凡鍙栨秷闀滃ご锛屽府鍔╃敤鎴蜂紭鍏堟壘鍒伴渶瑕佸姩浣滅殑鍒嗛暅銆?
- 鍒嗛暅瀵艰埅鏂板寰呭鐞嗐€侀槦鍒椾腑銆佸凡瀹屾垚涓夌粍姹囨€诲崱锛屽苟鎻愪緵鈥滆烦鍒板緟澶勭悊鈥濆揩鎹锋寜閽紝鐩存帴閫変腑涓嬩竴鏉″彲鐢熸垚/鍙噸璇曢暅澶淬€?
- 寰呭鐞嗗垎闀滃崱鐗囪ˉ鍏呮搷浣滄彁绀猴紝鍖哄垎鈥滈€夋嫨鍚庣偣鍑讳富鎸夐挳鐢熸垚鈥濆拰鈥滈€夋嫨鍚庡彲閲嶆柊鐢熸垚鈥濄€?

## v0.123 鈥?2026-04-23

**楂樼骇鍒剁墖鍒嗛暅鎿嶄綔鍖哄彲鐢ㄦ€у寮?*

**Frontend / UX:**
- 鍒嗛暅鐘舵€佸鑸笂绉诲埌骞冲彴鐘舵€佷笅鏂广€佺紪杈戝尯涓婃柟锛岀敤鎴峰厛瀹氫綅鏈敓鎴?鎺掗槦/澶辫触闀滃ご锛屽啀杩涘叆褰撳墠闀滃ご鎿嶄綔銆?
- 鈥滅敓鎴愬垎闀滆棰戔€濆崌绾т负褰撳墠鍒嗛暅涓?CTA锛屽鍔犳洿楂樿瑙夋潈閲嶃€佹帓闃熶綅娆℃彁绀哄拰宸插畬鎴愬垎闀滅殑鈥滈噸鏂扮敓鎴愬垎闀滆棰戔€濇枃妗堛€?
- 鎵归噺鐢熸垚銆佸彇娑堟湰椤圭洰鎺掗槦銆佸悓姝ュ嵆姊︾姸鎬佷笌鍒嗛暅鐘舵€佸鑸悎骞朵负鍚屼竴鎿嶄綔鍖猴紝鍑忓皯椤甸潰搴曢儴鏉ュ洖婊氬姩銆?

## v0.122 鈥?2026-04-23

**楂樼骇鍒剁墖鍒嗛暅鐘舵€佹爣绛炬敹鍙?*

**Frontend / UX:**
- 鍒嗛暅鏉＄姸鎬佺瓫閫夊拰鍗＄墖鐘舵€佹枃妗堢粺涓€澶嶇敤 `shotUserStatus` 鐨?`productionWizard.status.*` label key锛岄伩鍏嶇粍浠跺唴鍐嶇淮鎶や竴濂楁湰鍦?switch 鏂囨銆?
- 琛ュ厖鍒嗛暅鐘舵€?helper 鍥炲綊娴嬭瘯锛岀‘淇濈敤鎴锋€佺姸鎬佷笌 i18n label key 淇濇寔绋冲畾鏄犲皠銆?

## v0.121 鈥?2026-04-23

**楂樼骇鍒剁墖榛樿璺緞鐦﹁韩涓庡垎闀滅姸鎬佸鑸?*

**Frontend / UX:**
- 楂樼骇鍒剁墖鍒嗛暅椤垫柊澧炩€滈珮绾у伐鍏封€濇敹绾冲眰锛岄粯璁や繚鐣欑敓鎴愬垎闀滆棰戙€佹壒閲忕敓鎴愮己澶辫棰戙€佷换鍔＄姸鎬佸拰棰勮缁撴灉銆?
- 鈥滅敓鎴愬垎闀滃浘鈥濋粯璁や笅绾匡紝鏀逛负楂樼骇宸ュ叿閲岀殑鈥滅敓鎴愰甯р€濓紱鍥剧敓瑙嗛缂洪甯ф椂鎻愮ず鍏堝睍寮€楂樼骇宸ュ叿鐢熸垚棣栧抚銆?
- 鍒嗛暅鏉″崌绾т负鍙瓫閫夌姸鎬佸垪琛紝鏀寔鍏ㄩ儴銆佹湭寮€濮嬨€佺瓑寰呮彁浜ゃ€佸钩鍙版帓闃熶腑銆佹鍦ㄧ敓鎴愩€佸凡瀹屾垚銆佸け璐ャ€佸凡鍙栨秷銆?
- 褰撳墠鍒嗛暅鏂板涓婁竴闀?/ 涓嬩竴闀滄搷浣滐紝骞舵敮鎸?`[` / `]` 蹇嵎閿紝鏂囨湰杈撳叆鏃朵笉瑙﹀彂銆?
- 褰㈣薄婕斿寲鏍戦檷绾т负鈥滆鑹插舰璞″彉浣撯€濓紝涓荤晫闈㈤粯璁や笉灞曞紑鏍戝叧绯伙紝鈥滅紪杈戝舰璞″彉浣撯€濈洿鎺ユ墦寮€鏄庣‘寮圭獥銆?

**Engineering / Governance:**
- 鏂板 `shotUserStatus` 鐢ㄦ埛鎬佺姸鎬?helper 涓庡洖褰掓祴璇曪紝閬垮厤 stale submit id 瑕嗙洊 active job 鎴栧凡瀹屾垚濯掍綋銆?
- 鏂板鐘舵€佹ā鍨嬨€佹暟鎹綊灞炰笉鍙橀噺鍜岀敤鎴疯矾寰勬枃妗ｏ紝涓哄悗缁法椤甸潰鐘舵€佺粺涓€鍋氬熀绾裤€?

## v0.120 鈥?2026-04-23

**楂樼骇鍒剁墖椤圭洰涓庡垎闀滅姸鎬佽嫳鏂囨敹鍙?*

- 楂樼骇鍒剁墖椤圭洰寮圭獥鏀逛负 key 椹卞姩锛岄」鐩垪琛ㄣ€佹悳绱€佺┖鐘舵€併€佹不鐞嗘湭鍛藉悕椤圭洰銆佹墦寮€/閲嶅懡鍚?鍒犻櫎纭涓庨」鐩洿鏂版椂闂磋窡闅?`uiLocale`銆?
- 楂樼骇鍒剁墖杩愯鐘舵€佹彁绀鸿ˉ榻愯嫳鏂囷紝椤圭洰鍔犺浇澶辫触銆佸懡鍚嶄繚瀛樸€佹壒閲忎换鍔″悓姝ャ€佽ˉ鍏ㄧ己鍥俱€佸垎闀滆棰戠敓鎴?鍙栨秷/妫€鏌ヨ繘搴︾瓑鏂囨缁熶竴杩涘叆 `productionWizard.*` key銆?
- 鑻辨枃鍐呭閾捐矾鍑忓皯涓枃 prompt 鍓嶇紑銆?
- 楂橀 key 鍔犲叆鍥炲綊鏂█銆?

## v0.119 鈥?2026-04-23

**楂樼骇鍒剁墖鍘嗗彶鍥剧墖鍥炴樉淇**

- `/api/production/image` 鍏煎鏃т骇鐗╃洰褰曪紝閬垮厤鍘嗗彶瑙掕壊鍥俱€佸満鏅浘銆佸垎闀滅缉鐣ュ浘 404銆?
- 琛ュ厖鍘嗗彶鍥剧墖鐩綍鍥炲綊娴嬭瘯銆?
- 绾夸笂 prod 琛ュ洖鏃х洰褰曢珮绾у埗鐗囧浘鐗囧埌 shared-data銆?

## v0.118 鈥?2026-04-23

**Generate Video 鑻辨枃琛ㄥ崟涓庡啓绋挎彁绀烘敹鍙?*

- Generate Video 涓昏〃鍗曟敼涓?key 椹卞姩銆?
- Viral Dance 涓庣煭鍓у啓绋挎彁绀鸿ˉ榻愯嫳鏂囥€?
- Viral Dance 榛樿 prompt 璺熼殢鍐呭璇█銆?
- Generate Video 楂橀 key 鍔犲叆鍥炲綊鏂█銆?

## v0.117 鈥?2026-04-23

**鑻辨枃鏈湴鍖栫浜屾壒 key 搴撴敹鍙?*

- 楂樼骇鍒剁墖涓诲３灞傛敼涓虹粺涓€ key 椹卞姩銆?
- Generate Video 鍏ュ彛琛ラ綈绗簩鎵瑰彲澶嶇敤 key銆?
- 鏈湴鍖?key 鍥炲綊娴嬭瘯瑕嗙洊 Generate 涓?Production Wizard銆?

## v0.116 鈥?2026-04-23

**楂樼骇鍒剁墖姝ｅ紡鐜鍘嗗彶椤圭洰鑷姩褰掍綅**

- 楂樼骇鍒剁墖椤圭洰璇诲彇琛ラ綈鏃х洰褰曞洖閫€涓庤嚜鍔ㄨ縼绉汇€?
- 澶辨晥 `projectId` 涓嶅啀鎶婇珮绾у埗鐗囬攣姝汇€?

## v0.115 鈥?2026-04-23

**鑻辨枃鏈湴鍖栫涓€鎵?key 搴撴敹鍙?*

- 鐢诲粖涓庡巻鍙查〉鏀逛负缁熶竴 message key 椹卞姩銆?
- 鎵归噺浠诲姟鐪嬫澘琛ラ綈鑻辨枃鐘舵€佷笌鏃堕棿鏍煎紡銆?
- 閫氱敤閿欒涓庤緭鍑烘枃浠?helper 鏀跺彛鍒?locale-aware 宸ュ叿灞傘€?
- 鏂板杈撳嚭鐢诲粖鏈湴鍖?helper 鍥炲綊娴嬭瘯銆?

## v0.114 鈥?2026-04-23

**楂樼骇鍒剁墖鑻辨枃缈昏瘧閾捐矾 JSON 瀹归敊鍏滃簳**

- `replyLocale` 鑻辨枃缈昏瘧缁撴灉鏀逛负瀹归敊瑙ｆ瀽銆?
- 鑻辨枃鏈湴鍖栭檷绾т负 best-effort锛屼笉鍥犵炕璇戝け璐ラ樆鏂富閾捐矾銆?
- 鏂板 replyLocale 鑴?JSON 鍥炲綊娴嬭瘯銆?

## v0.113 鈥?2026-04-23

**鍙戝竷闂ㄧ鑷姩鍖栦笌 staging verified 鎻愬崌鏈哄埗**

- `deploy_all.py` 鍗囩骇涓哄甫闂ㄧ鐨勬寮忓彂甯冨叆鍙ｃ€?
- 鏂板 staging 楠岃瘉纭鑴氭湰銆?
- 鍚庣閮ㄧ讲琛ラ綈 PM2 online 纭鏌ャ€?
- 鍙戝竷 Runbook 涓庨」鐩骇瑙勫垯鍚屾鏇存柊銆?

## v0.112 鈥?2026-04-23

**鍙岀幆澧冨彂甯冭鍒欏浐鍖栧埌椤圭洰绾ф寚浠?*

- `AGENTS.md` / `CLAUDE.md` 鏀规垚 staging-first 寮哄埗鍙ｅ緞銆?
- `docs/CODEX-CLI-PROJECT-GUIDE.md` 琛ラ綈闀跨増鍙岀幆澧冨彂甯冭鏄庛€?

## v0.111 鈥?2026-04-23

**鍗曚汉澶氱數鑴戝彂甯?Runbook 涓庣姸鎬佸垏鎹㈣剼鏈?*

- 鏂板鏈湴鍙戝竷鐘舵€佸垏鎹㈣剼鏈€?
- 鏂板姣忓彴鍙戝竷鐢佃剳鐨勬湰鍦伴厤缃牱鏉裤€?
- 鏂板鍗曚汉澶氱數鑴戝彂甯?Runbook銆?
