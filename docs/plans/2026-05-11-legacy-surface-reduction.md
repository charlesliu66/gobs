# Legacy Surface Reduction - Run 10 Plan

> Date: 2026-05-11
> Run: `2026-05-11-legacy-surface-reduction`

## Goal

Reduce non-mainline historical surfaces from the default operator navigation while keeping direct URLs available for one release cycle.

## Decisions

- `/tiktok-matrix` becomes a direct-link-only legacy surface.
- `/geelark` and `/geelark-batch` continue to redirect to `/tiktok-matrix`.
- Platform planning pages remain direct-link-only.
- `h5-video-tool/src/sj-ui/` is not deleted in this run. It remains an isolated deletion candidate for a separate rollback-friendly commit.

## Acceptance Criteria

- Main sidebar no longer shows `/tiktok-matrix`.
- Direct routes and redirects for legacy surfaces remain present in `App.tsx`.
- A source-presence test guards the nav filter, direct route preservation, and `sj-ui` isolation.
- Frontend/backend builds and standard eval pass.

## Non-Goals

- No provider-service edits.
- No GeeLark publish behavior changes.
- No large component refactors.
- No deletion of `src/sj-ui` in this commit.
