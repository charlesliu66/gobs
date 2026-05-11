# Run 8 - Knowledge Traceability

> Date: 2026-05-11
> Source: `docs/plans/2026-05-10-gobs-next-optimization-checklist.md`

## Goal

Make Campaign Creative explain which routed Gold and Glory knowledge shaped the generated brief and output plan, and let operators reject bad knowledge so it is not reused in later generation.

## Scope

- Add stable citation ids to derived Campaign knowledge entries.
- Persist citation feedback: useful, inaccurate, do not use again.
- Show citations in the Campaign Brief review surface, with an explicit no-citation message when none exist.
- Carry knowledge references into Campaign Output Plan items and produced outputs.
- Suppress rejected citation ids in subsequent mission-brief generation.

## Non-Goals

- No provider-service changes.
- No new ingestion workflow or vector ranking.
- No broad Campaign UI refactor.
- No new environment variables.

## Acceptance

- A normal Gold and Glory Brain run exposes at least three citation cards when ready packs exist.
- Feedback saves through the backend and can be listed again.
- A citation marked `do_not_use_again` is filtered out of later derived knowledge context.
- Output Workbench shows which knowledge references informed the planned output.
