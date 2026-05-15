export type StudioGenerationTemplateId = '' | 'custom' | 'viral-dance' | 'boss-showcase' | string;

export interface StudioSeedanceReferenceReadinessInput {
  templateId: StudioGenerationTemplateId;
  videoModel: string;
  referenceCount: number;
  visualReferenceCount: number;
  validationCanGenerate: boolean;
}

export function isCustomTextOnlyFallbackAllowed(
  templateId: StudioGenerationTemplateId,
  videoModel: string,
  referenceCount: number,
): boolean {
  return templateId === 'custom' && videoModel === 'dreamina-multimodal' && referenceCount <= 0;
}

export function resolveStudioGenerationModel(
  templateId: StudioGenerationTemplateId,
  videoModel: string,
  referenceCount: number,
): string {
  return isCustomTextOnlyFallbackAllowed(templateId, videoModel, referenceCount)
    ? 'dreamina-text2video'
    : videoModel;
}

export function isStudioSeedanceReferenceReady(input: StudioSeedanceReferenceReadinessInput): boolean {
  if (input.videoModel !== 'dreamina-multimodal') return true;
  if (isCustomTextOnlyFallbackAllowed(input.templateId, input.videoModel, input.referenceCount)) return true;
  return input.validationCanGenerate;
}
