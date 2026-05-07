# Gold and Glory Canonical Brain Sync Design

## Product Goal

Final product shape: Campaign Creative Agent turns a campaign brief into ready creative assets and distribution with less human intervention over time.

This run gives that agent a real first brain for Gold and Glory. `fastpublishing` remains the source of truth; GOBS stores a deployable runtime snapshot as persisted Campaign Knowledge packs.

## Source Boundary

Canonical source root for this run:

`C:\Users\wei.liu\Desktop\cursor_try\fastpublishing`

Whitelisted source areas:

- `knowledge/game/brand/`: tone of voice, compliance, visual style, mobile social copy rules.
- `knowledge/market/my/`: Malaysia market fundamentals, user persona, competitors, KOL/KOC map.
- `knowledge/live-ops/`: regional holiday calendar, version event calendar, Sword in the Stone event history.
- `knowledge/market/_playbooks/selling-point-extractor.md`: conversion-trigger playbook.

Explicitly excluded in this MVP:

- `shared/handoffs/`, `reports/`, `plans/`.
- Full `GNG_Sharing-extracted` slide dump.
- Any non-Gold-and-Glory project brain.

## Runtime Model

Staging and prod cannot read the local Windows `fastpublishing` folder, so the importer must not depend on an absolute local path at runtime.

The flow is:

1. Read and curate the whitelisted fastpublishing files during a development run.
2. Commit the curated canonical seed into GOBS.
3. The backend `import-template` action writes stable sources and packs into persistent storage.
4. Campaign Creative reads those persisted packs and derives market truth, audience tension, tone rules, forbidden claims, approved angles, hooks, and visual cues.

## Pack Shape

The canonical template id is `gold-and-glory-canonical`.

It creates 8 ready packs:

- Brand Tone
- Brand Compliance
- Visual Style
- Malaysia Market Fundamentals
- Malaysia User Persona
- Live Ops Calendar
- Live Ops History
- Selling Point Playbook

Each imported source stores:

- `originalPath` pointing back to the fastpublishing source path.
- `checksum` in `gold-and-glory-canonical:sha256:<hash>` format.
- curated source content used to build the runtime pack.

## Refresh Workflow

When `fastpublishing` knowledge changes:

1. Treat `fastpublishing` as the source of truth.
2. Start a scoped GOBS brain-refresh run.
3. Compare only the whitelisted files above against the committed canonical seed.
4. Update the seed facts, preferences, avoid rules, hooks, visual cues, source contents, and resulting checksums.
5. Run backend import tests and Campaign Creative derivation checks.
6. Deploy through staging -> validation -> prod so the server-side persisted brain can be re-imported safely.

Later phases can add a diff preview or scheduled detector, but this MVP intentionally keeps refresh human-approved.
