import type { CreativeQualityStatus } from '../components/campaign/quality/creativeQualityTypes.ts';

export type CharacterShowcaseValidationDecision = 'continue' | 'experimental' | 'pause';
export type CharacterShowcaseDirection = 'character_reveal' | 'skill_or_selling_point';
export type CharacterShowcaseFit = 'video' | 'banner' | 'not_recommended';

export interface CharacterShowcaseValidationSample {
  id: string;
  characterName: string;
  characterArchetype: string;
  direction: CharacterShowcaseDirection;
  generatedResultAssessment: CreativeQualityStatus;
  characterDrift: 'none' | 'minor' | 'major';
  visualClarity: 'clear' | 'partial' | 'unclear';
  adFeeling: 'strong' | 'moderate' | 'weak';
  fit: CharacterShowcaseFit;
  successOrFailureReason: string;
  usableForAds: boolean;
}

export interface CharacterShowcaseValidationSummary {
  sampleCount: number;
  characterCount: number;
  usableCount: number;
  usableRate: number;
  decision: CharacterShowcaseValidationDecision;
  recommendedDirections: string[];
  notRecommendedDirections: string[];
  highRiskCases: string[];
  videoFitCount: number;
  bannerFitCount: number;
}

export const CHARACTER_SHOWCASE_MIN_USABLE_FOR_CONTINUE = 3;
export const CHARACTER_SHOWCASE_CHARACTER_TARGET = 5;
export const CHARACTER_SHOWCASE_SAMPLE_TARGET = 10;

export const CHARACTER_SHOWCASE_RECOMMENDED_PRESET_IDS = [
  'boss-reveal',
  'skill-flex',
  'reward-payoff',
] as const;

export const CHARACTER_SHOWCASE_NOT_RECOMMENDED_DIRECTIONS = [
  'multi-character group shots',
  'pet or mount interactions',
  'UI-heavy reward panels',
  'long environment storytelling without a character payoff',
] as const;

export const CHARACTER_SHOWCASE_VALIDATION_SAMPLES: CharacterShowcaseValidationSample[] = [
  {
    id: 'csv_hero_knight_reveal',
    characterName: 'Golden Knight',
    characterArchetype: 'armored hero',
    direction: 'character_reveal',
    generatedResultAssessment: 'usable',
    characterDrift: 'none',
    visualClarity: 'clear',
    adFeeling: 'strong',
    fit: 'video',
    successOrFailureReason: 'Single-character reveal preserves armor silhouette and lands a clear final face/weapon beat.',
    usableForAds: true,
  },
  {
    id: 'csv_hero_knight_skill',
    characterName: 'Golden Knight',
    characterArchetype: 'armored hero',
    direction: 'skill_or_selling_point',
    generatedResultAssessment: 'usable',
    characterDrift: 'minor',
    visualClarity: 'clear',
    adFeeling: 'strong',
    fit: 'video',
    successOrFailureReason: 'One VFX burst and one weapon motion read as a clean short-video payoff.',
    usableForAds: true,
  },
  {
    id: 'csv_mage_reveal',
    characterName: 'Storm Mage',
    characterArchetype: 'caster hero',
    direction: 'character_reveal',
    generatedResultAssessment: 'usable',
    characterDrift: 'minor',
    visualClarity: 'clear',
    adFeeling: 'moderate',
    fit: 'video',
    successOrFailureReason: 'Magic aura supports the reveal without hiding the face or costume shape.',
    usableForAds: true,
  },
  {
    id: 'csv_mage_skill',
    characterName: 'Storm Mage',
    characterArchetype: 'caster hero',
    direction: 'skill_or_selling_point',
    generatedResultAssessment: 'needs_fix',
    characterDrift: 'minor',
    visualClarity: 'partial',
    adFeeling: 'moderate',
    fit: 'banner',
    successOrFailureReason: 'Lightning VFX is attractive but crowds the character, making the result better as key art than video.',
    usableForAds: false,
  },
  {
    id: 'csv_archer_reveal',
    characterName: 'Forest Archer',
    characterArchetype: 'ranged hero',
    direction: 'character_reveal',
    generatedResultAssessment: 'usable',
    characterDrift: 'none',
    visualClarity: 'clear',
    adFeeling: 'moderate',
    fit: 'video',
    successOrFailureReason: 'Simple bow draw and reveal keep the silhouette readable and ad-friendly.',
    usableForAds: true,
  },
  {
    id: 'csv_archer_skill',
    characterName: 'Forest Archer',
    characterArchetype: 'ranged hero',
    direction: 'skill_or_selling_point',
    generatedResultAssessment: 'needs_fix',
    characterDrift: 'minor',
    visualClarity: 'partial',
    adFeeling: 'moderate',
    fit: 'banner',
    successOrFailureReason: 'Arrow trail is useful, but target impact is unclear without extra gameplay context.',
    usableForAds: false,
  },
  {
    id: 'csv_mascot_reveal',
    characterName: 'Treasure Mascot',
    characterArchetype: 'cute companion',
    direction: 'character_reveal',
    generatedResultAssessment: 'usable',
    characterDrift: 'none',
    visualClarity: 'clear',
    adFeeling: 'strong',
    fit: 'video',
    successOrFailureReason: 'Cute reveal works well for social feed hooks and keeps the mascot identity intact.',
    usableForAds: true,
  },
  {
    id: 'csv_mascot_reward',
    characterName: 'Treasure Mascot',
    characterArchetype: 'cute companion',
    direction: 'skill_or_selling_point',
    generatedResultAssessment: 'needs_fix',
    characterDrift: 'minor',
    visualClarity: 'partial',
    adFeeling: 'moderate',
    fit: 'banner',
    successOrFailureReason: 'Reward object is visible, but UI-like claim details are not reliable enough for video.',
    usableForAds: false,
  },
  {
    id: 'csv_dragon_rider_reveal',
    characterName: 'Dragon Rider',
    characterArchetype: 'compound mount character',
    direction: 'character_reveal',
    generatedResultAssessment: 'unusable',
    characterDrift: 'major',
    visualClarity: 'unclear',
    adFeeling: 'weak',
    fit: 'not_recommended',
    successOrFailureReason: 'Rider and dragon merge, causing identity drift and unreadable anatomy.',
    usableForAds: false,
  },
  {
    id: 'csv_dragon_rider_skill',
    characterName: 'Dragon Rider',
    characterArchetype: 'compound mount character',
    direction: 'skill_or_selling_point',
    generatedResultAssessment: 'unusable',
    characterDrift: 'major',
    visualClarity: 'unclear',
    adFeeling: 'weak',
    fit: 'not_recommended',
    successOrFailureReason: 'Compound subject plus fire VFX overwhelms the frame and loses product readability.',
    usableForAds: false,
  },
];

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function decideCharacterShowcaseValidation(usableCount: number): CharacterShowcaseValidationDecision {
  if (usableCount >= CHARACTER_SHOWCASE_MIN_USABLE_FOR_CONTINUE) return 'continue';
  if (usableCount === 0) return 'pause';
  return 'experimental';
}

export function summarizeCharacterShowcaseValidation(
  samples: CharacterShowcaseValidationSample[] = CHARACTER_SHOWCASE_VALIDATION_SAMPLES,
): CharacterShowcaseValidationSummary {
  const usableSamples = samples.filter((sample) => sample.usableForAds);
  const characters = uniqueStrings(samples.map((sample) => sample.characterName));
  const videoFitCount = samples.filter((sample) => sample.fit === 'video').length;
  const bannerFitCount = samples.filter((sample) => sample.fit === 'banner').length;
  const highRiskCases = uniqueStrings(
    samples
      .filter((sample) =>
        sample.fit === 'not_recommended' ||
        sample.characterDrift === 'major' ||
        sample.visualClarity === 'unclear',
      )
      .map((sample) => `${sample.characterName}: ${sample.successOrFailureReason}`),
  );

  return {
    sampleCount: samples.length,
    characterCount: characters.length,
    usableCount: usableSamples.length,
    usableRate: samples.length > 0 ? usableSamples.length / samples.length : 0,
    decision: decideCharacterShowcaseValidation(usableSamples.length),
    recommendedDirections: [
      'single-character reveal',
      'single-character skill payoff',
      'simple reward payoff without exact UI readability',
    ],
    notRecommendedDirections: [...CHARACTER_SHOWCASE_NOT_RECOMMENDED_DIRECTIONS],
    highRiskCases,
    videoFitCount,
    bannerFitCount,
  };
}

export function getCharacterShowcaseValidationNotice(): string {
  const summary = summarizeCharacterShowcaseValidation();
  const percent = Math.round(summary.usableRate * 100);
  if (summary.decision === 'continue') {
    return `Validation: continue · ${summary.usableCount}/${summary.sampleCount} usable (${percent}%). Best for single-character reveal or skill payoff; avoid group/UI-heavy scenes.`;
  }
  if (summary.decision === 'pause') {
    return `Validation: pause · ${summary.usableCount}/${summary.sampleCount} usable (${percent}%). Do not use as a stable ad-production path.`;
  }
  return `Validation: experimental · ${summary.usableCount}/${summary.sampleCount} usable (${percent}%). Use only for controlled tests.`;
}
