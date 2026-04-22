# TikTok Game Creative Agent Design

## Goal

Upgrade the current editing agent from a timeline-editing assistant into a `Campaign Creative Agent` for TikTok short-form game marketing.

The first phase should serve two primary business scenarios:

- TikTok short-video content for daily brand/content operations
- TikTok performance creatives for UA / paid acquisition

The first target user is the market operator, not the professional editor. The product should let a market user move from brief to 3-5 usable video variants in 10-15 minutes, while still allowing an editor to take over for fine polish.

## Recommended Positioning

Do **not** optimize the agent only around "editing smarter".

Instead, reposition it as:

> A TikTok-native game marketing creative agent that turns campaign brief, selling points, and available assets into multiple ready-to-test short-form video variants.

This is the recommended option compared with the two weaker alternatives:

- `Editing Copilot`: only improves timeline operations and execution efficiency
- `Full Auto Creative Factory`: directly closes the loop with delivery data too early and adds too much system dependency in phase 1

The recommended path is the middle route:

- `Campaign Creative Agent`
- brief-first
- template-driven but not rigid
- asset-aware
- multi-variant by default
- editor-friendly handoff

## Problem Statement

The current editing agent already has solid execution capability, but it is still optimized for editing behavior rather than marketing outcomes.

Current strengths:

- understands edit intent and can modify the timeline
- analyzes content highlights, action peaks, emotion, and role focus
- can produce rough-cut timeline results from selected assets
- can trigger music generation and preserve user-created tracks conservatively
- supports delivery notes, export, and continuity from Production Wizard into Editor

Current gaps for TikTok game marketing:

- no structured brief intake for campaign goals
- no built-in gameplay/UA creative frameworks
- no platform-native hook strategy for the first 1-3 seconds
- no audience-specific variant generation
- no selling-point-to-shot mapping logic
- no explicit CTA / endcard generation system
- no creative rationale that market users can review and give feedback on
- no clear separation between "brand content version" and "paid acquisition version"

## Target Users

### Primary: Market Operator

Typical profile:

- understands campaign goals and product selling points
- does not want to edit every cut manually
- wants fast output and clear creative rationale
- needs multiple variants for testing

Core jobs:

- turn a campaign brief into usable TikTok video variants
- express business intent in natural marketing language
- quickly compare hooks, selling points, and CTA strategies
- send a workable first cut to the editor if needed

### Secondary: Performance Marketing / UA

Typical profile:

- focuses on CTR, CVR, CPI, install, or retention-related proxies
- needs many variants from the same asset pool
- wants controlled experimentation, not one single "best cut"

Core jobs:

- mass-produce testable variants
- generate multiple hook / CTA combinations
- align creative angle with audience segment

### Secondary Support User: Video Editor

Typical profile:

- receives the first cut from market users
- wants a clean project handoff rather than redoing everything

Core jobs:

- lock approved parts and fine-polish the rest
- compare versions and understand what changed
- keep timeline control without fighting the agent

## Product Principles

1. `Brief first, timeline second`
   The user should start with campaign intent, not with editing operations.

2. `Variant-first instead of single-output`
   TikTok game marketing needs multiple angles by default.

3. `Marketing language in, editing logic out`
   Users should be able to say "make the first three seconds more hooky" or "push SSR draw benefit harder".

4. `Agent explains itself`
   Every output should carry a short explanation of audience, hook, selling point, and CTA strategy.

5. `Editors stay in control`
   The agent should suggest and generate, but never trap the editor in opaque output.

## Scope

### In Scope for Phase 1

- structured brief intake for TikTok game content
- TikTok-native hook generation
- game selling-point mapping to asset selection
- multi-variant generation
- subtitle / CTA / endcard support
- brand-content mode vs UA mode
- handoff-friendly timeline output

### Out of Scope for Phase 1

- automatic optimization based on live ad-delivery metrics
- deep attribution / ROAS feedback loops
- full media buying workflow orchestration
- fully autonomous publishing and spend allocation

## Core User Flows

### Flow A: Market user creates TikTok content variants

1. User chooses `TikTok content` or `TikTok UA`.
2. User fills a brief card:
   - campaign goal
   - game genre
   - target audience
   - core selling point
   - required CTA
   - forbidden elements
   - reference style
3. Agent scans available assets and labels them.
4. Agent proposes 3-5 creative directions.
5. User selects 1-2 directions.
6. Agent generates 3-5 timeline variants.
7. User compares outputs through a variant comparison panel.
8. User exports directly or hands off to an editor.

### Flow B: UA user mass-produces acquisition creatives

1. User selects a gameplay asset set.
2. User chooses a testing pack such as:
   - benefit-led
   - failure-to-win
   - summon / loot excitement
   - boss battle intensity
   - character appeal
3. Agent outputs a batch of variations with different hooks, subtitles, pacing, and CTA endings.
4. User exports a variant bundle with naming and metadata.

### Flow C: Editor takes over

1. Editor opens the generated project.
2. Editor sees:
   - creative rationale
   - variant differences
   - locked and editable areas
3. Editor accepts, tweaks, or partially reapplies agent suggestions.

## Information Architecture

```text
Editor / Creative Studio
|- Creative Brief
|  |- Mode: TikTok Content / TikTok UA
|  |- Campaign Goal
|  |- Target Audience
|  |- Core Selling Points
|  |- CTA
|  |- Reference Style
|  `- Risk / Forbidden Claims
|- Asset Intelligence
|  |- Auto Tags
|  |- Recommended Assets
|  |- Missing Asset Diagnosis
|  `- Asset Suitability Score
|- Creative Strategy
|  |- Hook Options
|  |- Creative Angles
|  |- Narrative Templates
|  `- Audience Versions
|- Variant Studio
|  |- Variant A/B/C...
|  |- Difference View
|  |- Subtitle Style
|  |- Music / Voice / CTA
|  `- Timeline Preview
|- Export & Delivery
|  |- TikTok Export Preset
|  |- Endcard / Cover / Caption
|  |- Batch Export
|  `- Metadata Package
`- Editor Handoff
   |- Change Summary
   |- Locked Tracks
   |- Creative Rationale
   `- Fine Cut Entry
```

## Recommended Product Surface Changes

### 1. Add a new `Creative Brief` entry layer

The current agent panel is still chat-first. For market users, that is too ambiguous.

Add a new entry module before timeline editing:

- `Mode`: TikTok content / TikTok UA
- `Objective`: awareness / click / install / event push / hero launch / version promo
- `Game genre`
- `Audience`
- `Selling points`
- `Desired tone`
- `CTA`
- `Reference creative`
- `Do not mention / do not show`

The chat box should remain, but it becomes secondary after the brief card.

### 2. Split strategy from execution

Current agent flow mostly jumps from instruction to timeline output.

Add a visible two-layer model:

- `Strategy Layer`
  - hook
  - audience
  - selling point priority
  - narrative angle
  - CTA choice
- `Execution Layer`
  - selected clips
  - clip order
  - pacing
  - text overlays
  - BGM / VO / endcard

This makes the system easier for market users to review and easier for editors to trust.

### 3. Make multi-variant generation a first-class output

Variant output should not be hidden behind repeated manual prompting.

The product should support:

- 1 brief -> 3-5 variants
- controllable diff dimensions:
  - hook only
  - CTA only
  - pacing only
  - selling point order
  - audience tone
- version rationale per variant

### 4. Add a creative rationale card

Every generated variant should include:

- target audience
- primary hook type
- main selling point
- CTA logic
- why this version differs from the others

This is important because market users need to review business intent, not just visuals.

## Feature Backlog

### P0: Must-have for first usable release

#### P0-1 Structured brief intake

- Replace pure freeform prompting with a guided brief form
- Allow "fast mode" defaults for speed
- Store reusable brief templates per game or campaign type

#### P0-2 TikTok game hook generator

- Generate 5-10 first-3-second hook options
- Categorize hooks:
  - benefit
  - surprise
  - loss/failure
  - flex/power
  - POV/challenge
  - emotional contrast

#### P0-3 Selling-point to asset mapping

- Map inputs such as:
  - SSR draw
  - hero awakening
  - boss fight
  - open-world scene
  - guild/social play
  - progression reward
- Auto-select matching clips instead of generic highlight-only cutting

#### P0-4 Asset auto-tagging for marketing use

New tags should focus on campaign intent, not only content type:

- battle
- summon
- loot/reward
- character glamour
- UI payoff
- progression
- boss threat
- story/emotion
- social/progression
- real-person talk / creator intro

#### P0-5 Content mode vs UA mode

The agent should generate different outputs for:

- `TikTok Content`
  - more world-building, vibe, creator-native style
- `TikTok UA`
  - stronger hooks, faster pacing, clearer payoff and CTA

#### P0-6 One-click multi-variant generation

- Generate 3-5 variants from one brief
- Expose variant differences clearly
- Support batch export naming rules

#### P0-7 TikTok subtitle style presets

- bold impact captions
- keyword-highlight captions
- English short-form caption style
- benefit punch captions

#### P0-8 CTA and endcard generator

- Generate endcard text and layout from CTA type
- Examples:
  - Download now
  - Play free today
  - New season live
  - Summon your hero now

#### P0-9 Creative rationale / explainability

- Show audience, hook, selling point, and CTA summary per version
- Make the output reviewable by market teams

#### P0-10 Editor-safe handoff

- lock tracks
- partial apply
- version diff summary
- rollback support

### P1: Make it feel genuinely smart

#### P1-1 Creative angle generator

For the same selling point, generate multiple angles:

- welfare-led
- power fantasy
- character fantasy
- emotional/drama
- challenge/proof
- creator-style storytelling

#### P1-2 Audience-specific variants

Support tailored versions for:

- broad audience
- anime / character-driven players
- hardcore combat users
- female-oriented character appreciation
- returning users

#### P1-3 Competitor reference decomposition

- input a TikTok link or reference asset
- extract hook rhythm, subtitle tone, pacing
- generate a "reference-inspired" but not copied version

#### P1-4 Script-first mode

- brief -> 15-second script -> storyboard -> timeline
- useful when market teams want higher controllability

#### P1-5 Voiceover / TTS mode

- generate English TikTok-style lines
- attach voiceover track into the timeline

#### P1-6 Creative fatigue detection

- detect repeated hook structures
- detect overused CTA patterns
- warn when a variant set is too similar

#### P1-7 Missing asset diagnosis

- tell the user what is missing for a chosen creative angle
- example:
  - missing reward UI
  - missing clear CTA end screen
  - missing character close-up

#### P1-8 Variant comparison board

- compare A/B/C side by side
- show hook, CTA, subtitle style, pacing differences

## Proposed Release Plan

### Phase 0: Product framing and surface definition

Goal:

- define the new product surface and naming
- avoid hiding all new logic inside the existing chat box

Deliverables:

- creative brief module
- variant studio information architecture
- terminology alignment across frontend and backend

### Phase 1: First usable market-operator release

Timeline:

- `Week 1`
  - brief intake
  - content mode vs UA mode
  - hook generator
- `Week 2`
  - selling-point mapping
  - asset auto-tagging
  - CTA / endcard generation
- `Week 3`
  - multi-variant generation
  - TikTok subtitle presets
  - rationale card
- `Week 4`
  - editor handoff
  - batch export metadata
  - usability polish

Phase 1 acceptance:

- 1 brief can generate 3-5 variants
- output includes hook + selling point + CTA explanation
- market user can export a TikTok-ready pack without timeline-first editing

### Phase 2: Intelligence and creative leverage

Timeline:

- `Week 5-6`
  - audience segmentation
  - creative angle generator
  - variant comparison board
- `Week 7-8`
  - reference decomposition
  - script-first mode
  - creative fatigue detection

## Success Metrics

### North-star metric

- brief to 3-5 usable TikTok variants in `<= 15 minutes`

### Supporting metrics

- first draft acceptance rate by market team
- time saved before editor takeover
- number of exported variants per brief
- ratio of briefs that generate at least one directly usable version
- editor rework time reduction

## Data / Service Implications

This design does **not** require changing protected low-level video generation services first.

It primarily needs orchestration changes around:

- editor brief intake
- asset tagging / scoring
- agent planning strategy
- timeline variant generation
- UI review surfaces
- export metadata generation

This keeps the first phase feasible without destabilizing the core generation stack.

## Risks

- If the product remains chat-first, market users will still not understand how to control output.
- If multi-variant generation is added without clear rationale, users will not know why versions differ.
- If UA mode and content mode are not separated, results will feel generic and underperform in both scenarios.
- If the editor handoff is weak, professional editors will reject the workflow.

## Recommendation Summary

The next major evolution of the editing agent should be:

- from `editing assistant`
- to `TikTok game campaign creative agent`

The first release should optimize for:

- structured brief intake
- game selling-point mapping
- TikTok-native hooks
- multi-variant generation
- CTA/endcard packaging
- editor-safe handoff

That combination gives the highest product leverage for market users while still staying compatible with the current editor foundation.
