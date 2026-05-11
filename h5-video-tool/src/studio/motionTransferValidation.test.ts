import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOTION_TRANSFER_MIN_USABLE_FOR_CONTINUE,
  MOTION_TRANSFER_VALIDATION_SAMPLES,
  MOTION_TRANSFER_VALIDATION_SAMPLE_TARGET,
  decideMotionTransferValidation,
  getMotionTransferValidationNotice,
  summarizeMotionTransferValidation,
  type MotionTransferValidationSample,
} from './motionTransferValidation.ts';

test('Motion Transfer validation ledger contains ten explicit sample records', () => {
  assert.equal(MOTION_TRANSFER_VALIDATION_SAMPLES.length, MOTION_TRANSFER_VALIDATION_SAMPLE_TARGET);
  for (const sample of MOTION_TRANSFER_VALIDATION_SAMPLES) {
    assert.ok(sample.id);
    assert.ok(sample.referenceActionType);
    assert.ok(sample.characterAssetClass);
    assert.ok(sample.generatedResultAssessment);
    assert.ok(sample.generatedResultSummary);
    assert.ok(sample.successOrFailureReason);
    assert.equal(typeof sample.usableForAds, 'boolean');
  }
});

test('Motion Transfer current fixture evaluates to experimental because usable samples are below threshold', () => {
  const summary = summarizeMotionTransferValidation();

  assert.equal(summary.sampleCount, 10);
  assert.equal(summary.usableCount, 2);
  assert.equal(summary.usableRate, 0.2);
  assert.equal(summary.decision, 'experimental');
  assert.ok(summary.suitableActionTypes.length < MOTION_TRANSFER_MIN_USABLE_FOR_CONTINUE);
  assert.ok(summary.highRiskActionTypes.includes('Multi-character combat exchange'));
});

test('Motion Transfer exit decision enforces continue, experimental, and pause outcomes', () => {
  assert.equal(decideMotionTransferValidation(3), 'continue');
  assert.equal(decideMotionTransferValidation(2), 'experimental');
  assert.equal(decideMotionTransferValidation(0), 'pause');
});

test('Motion Transfer summary can continue only when at least three samples are usable', () => {
  const usableSample = MOTION_TRANSFER_VALIDATION_SAMPLES[0];
  const syntheticSamples: MotionTransferValidationSample[] = [
    { ...usableSample, id: 'usable_1', referenceActionType: 'Simple pose 1', usableForAds: true },
    { ...usableSample, id: 'usable_2', referenceActionType: 'Simple pose 2', usableForAds: true },
    { ...usableSample, id: 'usable_3', referenceActionType: 'Simple pose 3', usableForAds: true },
    { ...MOTION_TRANSFER_VALIDATION_SAMPLES[2], id: 'bad_1', usableForAds: false },
  ];

  const summary = summarizeMotionTransferValidation(syntheticSamples);

  assert.equal(summary.usableCount, 3);
  assert.equal(summary.decision, 'continue');
});

test('Motion Transfer Studio notice communicates experimental status and usable rate', () => {
  const notice = getMotionTransferValidationNotice();

  assert.match(notice, /experimental/);
  assert.match(notice, /2\/10 usable/);
  assert.match(notice, /not stable ad delivery/);
});
