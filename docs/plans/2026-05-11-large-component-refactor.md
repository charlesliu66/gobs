# Large Component Refactor - Run 11 Plan

> Date: 2026-05-11
> Run: `2026-05-11-large-component-refactor`

## Goal

Reduce one high-frequency large component boundary without changing Distribution behavior.

## Selected Boundary

`h5-video-tool/src/pages/TabDistribute.tsx` currently owns page state, publish side effects, rendering, and several pure asset-option helpers. Run 11 extracts only the asset-option helpers into a typed module:

- current/create-flow asset option
- Campaign Package asset option
- local history asset options
- recent server output asset options
- merge/dedupe ordering
- prompt fallback and source labels

## Non-Goals

- No GeeLark publish API changes.
- No page UI redesign.
- No route or navigation changes.
- No hook/state extraction.
- No provider-service edits.

## Verification

- New helper unit tests for the extracted boundary.
- Existing Distribution view-model tests.
- API/frontend production builds.
- Standard workflow eval.
