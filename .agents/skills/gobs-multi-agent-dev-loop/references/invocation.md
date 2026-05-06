# Invocation And Portability

## Explicit Invocation

Use the workflow explicitly when you want deterministic handoff into the guarded GOBS loop:

- `/gobs-loop bootstrap a run and drive this task with the guarded 4+1 workflow`
- `$gobs-multi-agent-dev-loop use the guarded workflow for this feature`
- `$gobs-multi-agent-dev-loop keep manual coordination low and move this implementation forward`

## Implicit Triggers

The canonical workflow skill should also match requests that mention:

- multi-agent work
- self-loop development
- 4+1 workflow
- run bootstrap
- scope guard
- planner / challenger / builder / verifier

## Cross-Computer Use

The core workflow stays repo-local under:

```text
.agents/skills/gobs-multi-agent-dev-loop/
```

The slash-style wrapper lives under:

```text
plugins/gobs-loop/
```

To use the same setup on another computer:

1. `git clone` or `git pull` the repository.
2. Open the repository root in a client that supports repo-local skills and plugins.
3. Use `/gobs-loop` when the client exposes the plugin slash entry.
4. Fall back to `$gobs-multi-agent-dev-loop` when slash-style plugin UX is unavailable.

## Client UX Note

`$gobs-multi-agent-dev-loop` remains the most portable explicit invocation form.

Compatible clients may also expose:

- `GOBS Multi-Agent Dev Loop` from `agents/openai.yaml`
- `/gobs-loop` from the repo-local `gobs-loop` plugin wrapper

Exact slash-menu behavior depends on the client, but the repo metadata now supports both paths.
