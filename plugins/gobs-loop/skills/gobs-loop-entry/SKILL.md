---
name: gobs-loop-entry
description: Use when the user invokes /gobs-loop or asks for a slash-style entry into the repo's guarded GOBS 4+1 workflow. This wrapper routes the request into the existing repo-local gobs-multi-agent-dev-loop skill so the real workflow stays centralized.
---

# GOBS Loop Entry

## Overview

This is a thin wrapper skill for slash-style invocation.

It does not define a second workflow. It forwards work into the repo's canonical guarded workflow skill:

- `.agents/skills/gobs-multi-agent-dev-loop/SKILL.md`

## When To Use

Use this skill when:

- the user types `/gobs-loop`
- the user asks for the GOBS guarded workflow through a shorter slash-like command
- the client exposes the plugin in a slash menu or composer insert UI

Do not use this wrapper when the user already explicitly invoked:

- `$gobs-multi-agent-dev-loop`

In that case, use the canonical skill directly.

## Routing Rule

1. Read `.agents/skills/gobs-multi-agent-dev-loop/SKILL.md`.
2. Treat the text after `/gobs-loop` as the user's task request.
3. Follow the canonical skill's run bootstrap, scope control, guard, and release instructions.
4. Keep documentation and release behavior aligned with the canonical skill instead of inventing wrapper-specific flow.

## Fallback

If the current client does not present repo-local plugins as a real slash command, tell the user to use:

- `$gobs-multi-agent-dev-loop`

That explicit skill invocation remains the portable fallback.
