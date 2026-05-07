# Challenger Review - 2026-05-07-campaign-advanced-studio-phase1

## Inputs
- Planner spec: `docs/workflow/runs/2026-05-07-campaign-advanced-studio-phase1/planner-spec.md`
- Review time: 2026-05-07T05:10:00Z

## Findings

| ID | Area | Severity | Finding | Required action |
|---|---|---|---|---|
| C-001 | Scope | must-fix | This slice can easily drift from “nav regrouping and CTA hierarchy” into route cleanup or component-test infrastructure work. | Keep `App.tsx` read-only, do not add route aliases, and prefer the existing locale regression harness over new component-test setup. |
| C-002 | UX | should-fix | If `/projects` moves under `Advanced Studio` but keeps a campaign-first nav label, the page and shell will still disagree. | Update `layout.projects` in the same slice so the nav label matches the advanced workspace framing. |
| C-003 | Product shape | should-fix | If Home only moves `/projects` but leaves review CTAs generic, the default follow-on action is still visually ambiguous. | Add a dedicated review-oriented CTA or stronger review wording in `Home.tsx` / `messages.ts`, without changing route behavior. |

## Verdict
- Gate 1.5: PASS
- Blocking item count: 0
- Notes: Builder may start after the session anchor lists only home/nav/copy/test files and explicitly keeps routes and project behavior out of scope.
