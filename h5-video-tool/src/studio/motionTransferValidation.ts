import type { CreativeQualityStatus } from '../components/campaign/quality/creativeQualityTypes.ts';

export type MotionTransferValidationDecision = 'continue' | 'experimental' | 'pause';
export type MotionTransferRiskLevel = 'low' | 'medium' | 'high';

export interface MotionTransferValidationSample {
  id: string;
  referenceActionType: string;
  characterAssetClass: string;
  generatedResultAssessment: CreativeQualityStatus;
  generatedResultSummary: string;
  successOrFailureReason: string;
  usableForAds: boolean;
  riskLevel: MotionTransferRiskLevel;
}

export interface MotionTransferValidationSummary {
  sampleCount: number;
  usableCount: number;
  usableRate: number;
  decision: MotionTransferValidationDecision;
  suitableActionTypes: string[];
  highRiskActionTypes: string[];
}

export const MOTION_TRANSFER_MIN_USABLE_FOR_CONTINUE = 3;
export const MOTION_TRANSFER_VALIDATION_SAMPLE_TARGET = 10;

export const MOTION_TRANSFER_VALIDATION_SAMPLES: MotionTransferValidationSample[] = [
  {
    id: 'mtv_idle_to_hero_pose',
    referenceActionType: 'Idle-to-pose character gesture',
    characterAssetClass: 'single full-body character image',
    generatedResultAssessment: 'usable',
    generatedResultSummary: 'Character identity remains readable and the pose change is simple enough for review.',
    successOrFailureReason: 'Low camera motion and a single clear pose transition keep the output coherent.',
    usableForAds: true,
    riskLevel: 'low',
  },
  {
    id: 'mtv_weapon_flourish',
    referenceActionType: 'Short weapon flourish',
    characterAssetClass: 'single hero character with visible weapon',
    generatedResultAssessment: 'usable',
    generatedResultSummary: 'Weapon motion reads as an ad-friendly hero flourish with minor timing cleanup needed.',
    successOrFailureReason: 'The action is short, centered, and does not require exact multi-limb choreography.',
    usableForAds: true,
    riskLevel: 'medium',
  },
  {
    id: 'mtv_dance_loop',
    referenceActionType: 'Dance loop with crossed limbs',
    characterAssetClass: 'stylized character image',
    generatedResultAssessment: 'unusable',
    generatedResultSummary: 'Limb crossing causes identity drift and off-model body proportions.',
    successOrFailureReason: 'The reference motion is too complex for a single approved character still.',
    usableForAds: false,
    riskLevel: 'high',
  },
  {
    id: 'mtv_multi_character_combat',
    referenceActionType: 'Multi-character combat exchange',
    characterAssetClass: 'two character images',
    generatedResultAssessment: 'unusable',
    generatedResultSummary: 'Characters blend together and the attack direction becomes ambiguous.',
    successOrFailureReason: 'Motion Transfer cannot reliably preserve multiple character identities in this pattern.',
    usableForAds: false,
    riskLevel: 'high',
  },
  {
    id: 'mtv_camera_orbit',
    referenceActionType: 'Camera orbit around character',
    characterAssetClass: 'single character key art',
    generatedResultAssessment: 'needs_fix',
    generatedResultSummary: 'Camera motion is attractive, but costume details smear during the orbit.',
    successOrFailureReason: 'The camera move creates useful energy but loses product/character fidelity.',
    usableForAds: false,
    riskLevel: 'high',
  },
  {
    id: 'mtv_skill_cast',
    referenceActionType: 'Skill cast with VFX burst',
    characterAssetClass: 'single hero character plus skill visual reference',
    generatedResultAssessment: 'needs_fix',
    generatedResultSummary: 'The burst timing is useful, but the skill effect does not match the game reference.',
    successOrFailureReason: 'The output needs exact game VFX guidance before it can be ad-safe.',
    usableForAds: false,
    riskLevel: 'medium',
  },
  {
    id: 'mtv_ui_tap_motion',
    referenceActionType: 'UI tap or menu interaction',
    characterAssetClass: 'gameplay/UI screenshot',
    generatedResultAssessment: 'unusable',
    generatedResultSummary: 'UI text and buttons distort, so the result cannot communicate gameplay clearly.',
    successOrFailureReason: 'Motion Transfer is not a safe fit for exact UI readability.',
    usableForAds: false,
    riskLevel: 'high',
  },
  {
    id: 'mtv_fast_run',
    referenceActionType: 'Fast run cycle',
    characterAssetClass: 'single full-body character image',
    generatedResultAssessment: 'needs_fix',
    generatedResultSummary: 'Motion energy is good, but the feet and weapon silhouette wobble too much.',
    successOrFailureReason: 'Fast repeated limb motion needs more source frames than this flow provides.',
    usableForAds: false,
    riskLevel: 'medium',
  },
  {
    id: 'mtv_reaction_expression',
    referenceActionType: 'Reaction expression close-up',
    characterAssetClass: 'character portrait',
    generatedResultAssessment: 'needs_fix',
    generatedResultSummary: 'Expression direction is useful, but face identity drifts in close-up.',
    successOrFailureReason: 'Close-up identity preservation is not yet reliable enough for paid ads.',
    usableForAds: false,
    riskLevel: 'medium',
  },
  {
    id: 'mtv_mount_or_vehicle',
    referenceActionType: 'Mount or vehicle movement',
    characterAssetClass: 'character plus mount concept art',
    generatedResultAssessment: 'unusable',
    generatedResultSummary: 'The mount and rider merge, producing confusing anatomy and unreadable product value.',
    successOrFailureReason: 'Compound subjects exceed the current safe input boundary.',
    usableForAds: false,
    riskLevel: 'high',
  },
];

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function decideMotionTransferValidation(usableCount: number): MotionTransferValidationDecision {
  if (usableCount >= MOTION_TRANSFER_MIN_USABLE_FOR_CONTINUE) return 'continue';
  if (usableCount === 0) return 'pause';
  return 'experimental';
}

export function summarizeMotionTransferValidation(
  samples: MotionTransferValidationSample[] = MOTION_TRANSFER_VALIDATION_SAMPLES,
): MotionTransferValidationSummary {
  const usableSamples = samples.filter((sample) => sample.usableForAds);
  const highRiskActionTypes = uniqueStrings(
    samples
      .filter((sample) => sample.riskLevel === 'high' || sample.generatedResultAssessment === 'unusable')
      .map((sample) => sample.referenceActionType),
  );
  const suitableActionTypes = uniqueStrings(usableSamples.map((sample) => sample.referenceActionType));

  return {
    sampleCount: samples.length,
    usableCount: usableSamples.length,
    usableRate: samples.length > 0 ? usableSamples.length / samples.length : 0,
    decision: decideMotionTransferValidation(usableSamples.length),
    suitableActionTypes,
    highRiskActionTypes,
  };
}

export function getMotionTransferValidationNotice(): string {
  const summary = summarizeMotionTransferValidation();
  const percent = Math.round(summary.usableRate * 100);
  if (summary.decision === 'continue') {
    return `Validation: continue · ${summary.usableCount}/${summary.sampleCount} usable (${percent}%).`;
  }
  if (summary.decision === 'pause') {
    return `Validation: pause · ${summary.usableCount}/${summary.sampleCount} usable (${percent}%). Do not use as a stable ad-production path.`;
  }
  return `Validation: experimental · ${summary.usableCount}/${summary.sampleCount} usable (${percent}%). Use for controlled tests, not stable ad delivery.`;
}
