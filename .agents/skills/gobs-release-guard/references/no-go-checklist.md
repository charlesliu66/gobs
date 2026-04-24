# No-Go Checklist

Treat these as hard blockers unless the user explicitly approved a documented exception.

## Hard blockers

- Missing `AGENTS.md`-required release artifacts for the chosen mode.
- Missing `planner-spec.md` for the active run.
- Missing `release-decision.md` when evaluating prod readiness.
- Frontend build failure.
- Backend typecheck or build failure.
- Release commit not reachable from `origin/main`.
- Prod requested before staging verification is complete.
- Prod requested before `mark_release_ready.py` evidence matches the release candidate.
- Explicit emergency bypass requested without approval.
- Dirty release-scope files in:
  - `h5-video-tool/`
  - `h5-video-tool-api/`
  - key deploy scripts under `scripts/`

## Warning-only examples

- `CHANGELOG.md` migration not fully adopted yet, but `PRODUCT.md` updated.
- Low-risk doc drift outside release scope.
- Known follow-up i18n gaps.
- Extra noisy archive files outside release scope.

## Preferred decision language

- `GO`: safe to continue.
- `GO WITH WARNINGS`: allowed, but call out the warnings explicitly.
- `NO-GO`: do not continue until blockers are fixed.

