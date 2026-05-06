# Invocation And Portability

## Explicit Invocation

Use the skill explicitly when you want deterministic handoff into the guarded workflow:

- `$gobs-multi-agent-dev-loop 帮我开一个 run 并推进这个需求`
- `$gobs-multi-agent-dev-loop use the 4+1 workflow for this feature`
- `$gobs-multi-agent-dev-loop 尽量减少我的参与，按 planner/challenger/builder/verifier 推进`

## Implicit Triggers

The skill should also match requests that mention:

- 多 Agent
- 自循环开发
- 4+1 workflow
- run 初始化
- scope guard
- planner / challenger / builder / verifier

## Cross-Computer Use

This skill is repo-local and portable because it lives under:

```text
.agents/skills/gobs-multi-agent-dev-loop/
```

To use it on another computer:

1. `git clone` or `git pull` the repository.
2. Open the repository root in a Codex-compatible client that loads repo-local skills.
3. Invoke it explicitly with `$gobs-multi-agent-dev-loop` if you do not want to rely on implicit matching.

## Client UX Note

`$gobs-multi-agent-dev-loop` is the most portable explicit invocation form.

If the client supports skill lists, chips, or slash-style insertion from `agents/openai.yaml`, the skill may also appear there as:

- `GOBS Multi-Agent Dev Loop`

The exact slash-menu presentation depends on the client, but the repo metadata is included so compatible clients can expose it.
