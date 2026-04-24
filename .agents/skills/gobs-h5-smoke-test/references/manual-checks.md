# Manual Checks

Use this after `Depth=full`.

## Staging or prod follow-up

Check at least these paths:

1. Home page opens correctly.
2. Version banner or footer shows the correct environment.
3. Advanced production entry is reachable.
4. QuickFilm entry is reachable.
5. History or gallery page is reachable.
6. Asset library is reachable.
7. Distribute page is reachable.

## Production-focused checks

When a release touched production workflow logic, also verify:

1. `ProductionWizard` shell opens.
2. Batch-task-related entry points are reachable.
3. "My videos" or gallery-related pages still load.
4. No obvious environment mismatch is shown in UI.

## Report style

Keep manual output short:

- `PASS`
- `PASS WITH WARNINGS`
- `FAIL`

Add only the most important failing path or missing check.

