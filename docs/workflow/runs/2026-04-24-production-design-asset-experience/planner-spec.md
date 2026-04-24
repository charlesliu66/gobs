# Planner Spec: Production Design Asset Experience

## Background

The advanced production design step has strong capabilities but weak wayfinding. Users cannot quickly answer three questions:

1. Which assets are ready right now?
2. What is the fastest way to generate the missing ones?
3. How do wardrobe-state images actually flow into later storyboard references?

The current UI hides too much state in small card copy, pushes first-time character generation into an advanced modal, and exposes storyboard state selection as an under-explained sidebar control.

## User Problems

1. Tab counts show totals, not readiness.
2. Character cards route first-time users into an editor before they even have a first image.
3. Wardrobe state thumbnails cannot be enlarged for inspection.
4. Users cannot clearly tell how wardrobe states become storyboard references.
5. Batch generation lacks ETA and completion-oriented feedback.
6. Style lock is not visible enough during asset generation.

## Functional Decisions

| Capability | Decision | Reason |
|---|---|---|
| Readiness board | Add shared readiness summary under tabs | Makes missing work obvious |
| Character missing-card click | Directly generate default look | Reduces first-use friction |
| Scene/prop click flow | Keep modal generation | Lower regression risk |
| Wardrobe zoom | Add lightbox support for base and state images | Inspection is a real workflow need |
| Storyboard state selection | Keep sidebar as primary control, add clearer summaries | Uses existing layout without bloating main editor |
| Batch completion feedback | Use in-app summary UI | Stronger closure than passive count text |
| Style anchor visibility | Add compact chip in design header | Keeps global style context present |

## Acceptance Criteria

### UX

- Header shows role/scene/prop readiness counts and missing totals.
- Character missing cards support click-to-generate and inline confirm/retry.
- Scene and prop cards show unified readiness visuals.
- Wardrobe images support zoom.
- Character cards surface wardrobe/state counts and a stronger wardrobe management entry.
- Storyboard sidebar clearly shows effective state and whether it is auto-matched or manually overridden.
- Main storyboard workspace surfaces a compact summary of active character-state references.

### Engineering

- No forbidden files changed.
- New UI copy goes through i18n message tables where practical.
- Shared readiness logic is covered by targeted tests.
- Existing state resolution priority remains:
  - shot override
  - character default active state
  - active look image

### Release

- Update product docs and run reports.
- Complete normal staging -> prod flow after verification.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Card interactions become inconsistent | Medium | Restrict direct-generate to character missing cards only |
| Wardrobe lightbox conflicts with expand-to-edit | Medium | Separate image click from label/edit click |
| Storyboard state summary duplicates existing controls poorly | Medium | Keep summary read-only and let sidebar remain the editing control |
| Batch summary adds noisy state | Low | Show only when batch starts/runs/completes |

## Test Matrix

| Area | Verification |
|---|---|
| Readiness helper | `node --test tests/designAssetStatus.test.ts` |
| Existing shot status helper | `node --test tests/shotUserStatus.test.ts` |
| Storyboard state resolution | new targeted test file |
| Frontend build | `npm run build` |
| Backend typecheck | `npx tsc --noEmit` |
| Manual UI | Step 2 asset generation, wardrobe zoom, storyboard state selection |

