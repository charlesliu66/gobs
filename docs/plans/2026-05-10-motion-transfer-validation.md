# Motion Transfer Validation

> Run: `2026-05-11-motion-transfer-validation`
> Source checklist item: Run 5 - Motion Transfer Validation
> Status: in progress

## Goal

Validate whether Motion Transfer is ready for the current GOBS marketer workflow.

This run is a validation and governance pass, not a feature-expansion sprint. It records 10 sample cases, calculates a usable rate, and forces a clear decision:

- `continue`: ready to invest toward the main flow.
- `experimental`: keep as an experiment-only Studio entry.
- `pause`: stop presenting the entry until the underlying capability improves.

## Current Decision

Decision: `experimental`

Reason: the first validation ledger has fewer than 3 usable samples out of 10. That fails the checklist threshold for a stable/default capability, but two action families still look promising enough to keep an experiment-only entry.

## Exit Rule

If fewer than 3 out of 10 validation samples are usable, Motion Transfer must be marked `experimental` or `pause` and must not be presented as stable in the default flow.

## Suitable Action Types

Current suitable action types are fewer than 3:

- Simple idle-to-pose character gesture.
- Short weapon flourish with minimal camera change.

## High-Risk Action Types

- Multi-character combat.
- Camera orbit plus fast body motion.
- Large dance choreography with limb crossing.
- Any action requiring exact product/UI readability.

## Sample Ledger

The code fixture in `h5-video-tool/src/studio/motionTransferValidation.ts` is the canonical machine-readable ledger for this run. Each sample records:

- Reference action type.
- Character asset class.
- Generated-result assessment.
- Success/failure reason.
- Whether it is usable for ads.

## Product Boundary

Motion Transfer remains available only with an experimental notice. The UI must not say it is stable, and Campaign should not route operators to it as a default production path until a later validation run reaches the `continue` threshold.
