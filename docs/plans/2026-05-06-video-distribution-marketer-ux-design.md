# Video Distribution Marketer UX Optimization Design

## Goal

Shift the current video distribution flow from an engineer-facing "push this asset to devices" tool into a marketer-facing publishing workspace that supports safer account selection, clearer copy control, persistent publish tracking, and a more natural "pick approved content and distribute it" workflow.

## Approved Approach

Use the existing GeeLark publishing backend and current `TabDistribute` page as the foundation, then improve the experience in three layers instead of rewriting the whole module:

1. Fix the biggest marketer-facing workflow gaps first:
   - asset selection should not depend on the immediate Studio context
   - target account selection should be explicit and low-risk
   - platform-specific copy should be easier to understand and harder to misuse
   - publish status should survive refresh and support history review
2. Add marketer-grade preflight and campaign controls on top of the stable core:
   - campaign objective, audience, CTA, market/language intent
   - publish checklist and better account grouping
   - reusable drafts and publish presets
3. Add longer-horizon publishing operations capabilities only after the core workflow feels trustworthy:
   - scheduling
   - approval / handoff
   - calendar / experiment / performance loop

This keeps the near-term scope realistic while still moving the experience toward a true distribution console.

## User Persona

Primary user: market / operations teammate who wants to take an already-approved video, choose a set of social accounts, generate or refine platform-appropriate copy, publish safely, and review what happened afterward.

What this persona optimizes for:

- low risk of sending to the wrong account
- low friction when reusing approved assets
- clear copy differences by platform / market
- confidence before clicking publish
- easy recovery and review after publish

## Current UX Gaps

### 1. Distribution starts from creation context, not from publish-ready assets

Today the page is tightly coupled to `useCreateFlow()` and assumes the user arrived from the generation flow. That is convenient for creators, but awkward for marketers, who more often start from "which approved video do I want to post today?"

### 2. Account selection is too easy to misuse

The page auto-selects the first allowed account and restores a default account after some filter changes. That is efficient for demos, but too risky for real publishing.

### 3. Platform-specific copy is not clearly modeled

The backend can already generate platform-aware copy, but the UI still behaves like there is one main caption plus optional variants. That creates ambiguity and increases the chance of using the wrong copy on the wrong platform.

### 4. Publish tracking is session-local instead of operational

The "latest batch" panel is useful while staying on the same page, but it does not behave like a persistent publishing history or ops dashboard.

### 5. The page lacks marketer-grade publish confidence

The current flow has no real preflight checklist, no saved publish combinations, no campaign metadata framing, and no structured reminder of what is about to go live.

## Scope By Priority

### P0: Make the current workflow safe and usable for daily publishing

Outcome: a marketer can pick an approved video, choose accounts intentionally, understand copy by platform, publish, and later review the result without losing context.

Includes:

- independent asset picker on the distribution page
- no default account auto-selection
- explicit account review before publish
- platform-card copy model instead of silently favoring the first generated platform
- persistent publish history view backed by server task history
- publish status that survives page refresh

Does not include:

- scheduling
- approvals
- analytics

### P1: Make the workflow feel like a real campaign publishing console

Outcome: a marketer can describe campaign intent, reuse common account sets, validate readiness, and create more consistent copy.

Includes:

- campaign objective / audience / CTA / market inputs
- reusable account groups or matrix presets in the distribution page
- preflight checklist before publish
- saved publish draft or last-used publish setup
- explicit publish options such as share link / AI label when applicable

Does not include:

- multi-step approval routing
- calendar scheduling engine

### P2: Add team-grade planning and optimization loops

Outcome: publishing becomes manageable across time, teammates, and experiments.

Includes:

- scheduled publishing
- simple approval / handoff states
- publish calendar
- batch experiment support
- lightweight post-publish performance notes / learnings loop

## Recommended UX Changes

### P0.1 Asset-first distribution entry

The distribution page should support three sources for the selected video:

- current Studio / create-flow result
- recent server outputs
- recent approved / user-owned videos from history or gallery

Recommended default:

- if create-flow has a current result, prefill it as a suggestion
- otherwise show an asset picker with recent publishable videos

Success criteria:

- user can publish without first going through Studio in the same browser session
- publish CTA is available when a valid `videoPath` exists, even if `videoUrl` is not already in state

### P0.2 Safer target account selection

Replace the current "first account is already selected" behavior with explicit opt-in selection.

Recommended interaction:

- no accounts selected by default
- show platform / region summary chips
- add "select all in current filter" and "clear current selection"
- show a compact confirmation summary before publish

Success criteria:

- no implicit account selection on first load
- filtered lists never silently re-add an account

### P0.3 Platform-card copy model

Treat generated copy as a set of platform candidates, not as one caption with optional alternates.

Recommended interaction:

- generate a card per platform
- each card shows caption + hashtags + language badge
- user explicitly chooses which card becomes the publish payload for accounts on that platform
- the main editor becomes either:
  - a per-platform editable payload area, or
  - a neutral manual override with clear warning that it overrides generated platform copy

Success criteria:

- the UI never auto-promotes the first generated platform to the global source of truth without user confirmation
- language switching can either translate the active platform card or regenerate by market intent, not silently mutate all copy

### P0.4 Persistent publish history

Promote publish result tracking from "last batch in memory" to "history center."

Recommended interaction:

- a new "recent publishes" panel or tab on the distribution page
- load from `/api/geelark/tasks`
- show time, selected accounts, success/failure counts, returned links, screenshots, and reasons
- allow reopening a task detail after refresh

Success criteria:

- users can leave and return to the page without losing the last publish context
- task detail is discoverable from history even if the original session is gone

## P1 UX Additions

### P1.1 Campaign framing

Add lightweight structured inputs above copy generation:

- campaign objective
- target audience
- desired CTA
- market / language
- optional no-go phrases or compliance notes

This should feed prompt generation so the copy reflects campaign intent, not just the video and prior prompt text.

### P1.2 Publish presets and account groups

Surface reusable groups in the publish page itself rather than only in admin settings.

Recommended examples:

- "Indonesia TikTok gaming"
- "Thailand beauty test accounts"
- "US creator backup pool"

### P1.3 Preflight checklist

Before publish, show a compact checklist such as:

- video selected
- account count confirmed
- platform copy exists
- language matches target market
- optional share-link / AI label options reviewed

## P2 UX Additions

### P2.1 Scheduling and calendar

Once the immediate publishing flow is stable, add scheduled publish as a separate mode rather than forcing it into the first iteration.

### P2.2 Approval and handoff

This is useful only after asset selection, copy control, and history are already stable.

### P2.3 Learning loop

Allow simple post-publish notes such as:

- hook worked / weak
- copy too generic
- platform mismatch
- retry with shorter opener

This gives future prompt generation better operating context.

## Information Architecture Recommendation

Recommended page structure:

1. Publish asset
2. Target accounts
3. Platform copy
4. Publish review
5. Recent publishes

This is closer to the mental model of a market teammate than the current "accounts first, then maybe video and caption."

## Rollout Strategy

### Phase 1 = P0

Ship the smallest set of changes that materially reduces publish risk and makes the page usable as a standalone workflow.

### Phase 2 = P1

Add campaign framing and account grouping once the basic publishing path feels stable.

### Phase 3 = P2

Add scheduling, approvals, and feedback loops only after the first two phases prove out.

## Risks

- If asset selection is added carelessly, the page may mix create-flow state with library state in confusing ways.
- If per-platform copy is not clearly represented, users may think they are editing one thing while actually changing another.
- If publish history is added without clear grouping and filtering, the page may become noisy instead of more useful.

## Verification Plan

Product / UX verification:

- user can enter distribution without a fresh Studio session
- user must intentionally select accounts
- user can understand which copy belongs to which platform
- user can refresh and still recover recent publish details

Technical verification:

- frontend tests for account selection and copy handling
- frontend tests for asset selection state
- backend tests for publish history payload expectations if route shape changes
- `npx tsc --noEmit` in frontend and backend
- `npm run build` in frontend and backend

## Recommendation

Implement P0 first and treat it as the "make publishing trustworthy" release. Do not start with scheduling or approval. The current highest-value move is to make distribution asset-first, selection-safe, and history-aware.
