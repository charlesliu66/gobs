import { getCharacterShowcaseValidationNotice } from '../studio/characterShowcaseValidation.ts';
import { getMotionTransferValidationNotice } from '../studio/motionTransferValidation.ts';
import { SEEDANCE_DURATION_OPTIONS } from './seedanceSourceConstraints.ts';

export const ACTIVE_STUDIO_TEMPLATE_IDS = ['viral-dance', 'boss-showcase'] as const;
export const REMOVED_STUDIO_TEMPLATE_IDS = ['short-drama', 'cat-harem', 'cg-trailer'] as const;

const REMOVED_TEMPLATE_ID_SET = new Set<string>(REMOVED_STUDIO_TEMPLATE_IDS);
const ACTIVE_TEMPLATE_ID_SET = new Set<string>(ACTIVE_STUDIO_TEMPLATE_IDS);

type TemplateLike = {
  id: string;
  duration?: number;
  aspectRatio?: string;
};

export function filterVisibleStudioTemplates<T extends TemplateLike>(templates: T[]): T[] {
  return templates.filter((template) => ACTIVE_TEMPLATE_ID_SET.has(template.id) && !REMOVED_TEMPLATE_ID_SET.has(template.id));
}

export function getStudioTemplateDurationOptions(templateId: string, multiShotEnabled = false): number[] {
  void multiShotEnabled;
  if (templateId === 'custom') return [...SEEDANCE_DURATION_OPTIONS];
  if (templateId === 'viral-dance') return [5, 8, 10, 15];
  if (templateId === 'boss-showcase') return [10, 15];
  return [...SEEDANCE_DURATION_OPTIONS];
}

export function getStudioTemplateAspectRatioOptions(templateId: string, multiShotEnabled = false): string[] {
  if (templateId === 'custom') return multiShotEnabled ? ['16:9', '9:16'] : ['9:16', '16:9', '1:1'];
  if (templateId === 'viral-dance') return ['9:16'];
  if (templateId === 'boss-showcase') return ['9:16', '16:9'];
  return ['16:9', '9:16'];
}

export function isValidStudioDuration(templateId: string, duration: number, multiShotEnabled = false): boolean {
  return getStudioTemplateDurationOptions(templateId, multiShotEnabled).includes(duration);
}

export function isValidStudioAspectRatio(templateId: string, aspectRatio: string, multiShotEnabled = false): boolean {
  return getStudioTemplateAspectRatioOptions(templateId, multiShotEnabled).includes(aspectRatio);
}

export function getStudioTemplateDisplayMeta(template: TemplateLike): string {
  if (template.id === 'custom') return '4-15s · 9:16 / 16:9 / 1:1';
  if (template.id === 'viral-dance') return '5-15s · 9:16';
  if (template.id === 'boss-showcase') return '10-15s · 9:16 / 16:9';
  return `${template.duration ?? '-'}s · ${template.aspectRatio ?? '-'}`;
}

export function getStudioTemplateValidationNotice(templateId: string): string | undefined {
  if (templateId === 'viral-dance') return getMotionTransferValidationNotice();
  if (templateId === 'boss-showcase') return getCharacterShowcaseValidationNotice();
  return undefined;
}
