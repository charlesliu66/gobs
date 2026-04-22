import { apiPost } from './client';
import type {
  StoryArcLayer,
  ProductionDesignLayer,
  ProductionShot,
  CharacterVisualProfile,
  StyleReferenceAnalysis,
  AssemblePromptsResult,
} from '../studio/productionTypes';

export async function postStoryArc(body: {
  characterBible: string;
  synopsis: string;
  styleRef: string;
  structureTemplate: string;
  replyLocale?: 'zh-CN' | 'en';
}): Promise<{ story: StoryArcLayer }> {
  return apiPost('/api/studio/story-arc', body);
}

export async function postProductionDesign(body: {
  story: StoryArcLayer;
  replyLocale?: 'zh-CN' | 'en';
}): Promise<{ productionDesign: ProductionDesignLayer }> {
  return apiPost('/api/studio/production-design', body);
}

export async function postStoryboardTable(body: {
  story: StoryArcLayer;
  productionDesign: ProductionDesignLayer;
  maxTotalDurationSec: number;
  extraNotes?: string;
  replyLocale?: 'zh-CN' | 'en';
}): Promise<{ shots: ProductionShot[] }> {
  return apiPost('/api/studio/storyboard-table', body);
}

export async function postExtractStyleReference(body: {
  imageBase64: string;
  mimeType?: string;
  replyLocale?: 'zh-CN' | 'en';
}): Promise<{ styleReference: StyleReferenceAnalysis }> {
  return apiPost('/api/studio/extract-style-reference', body);
}

export async function postExtractCharacterVisuals(body: {
  imageBase64: string;
  mimeType?: string;
  replyLocale?: 'zh-CN' | 'en';
}): Promise<{ characterVisualProfile: CharacterVisualProfile }> {
  return apiPost('/api/studio/extract-character-visuals', body);
}

export async function postAssemblePrompts(body: {
  shots: ProductionShot[];
  characterVisualProfile?: CharacterVisualProfile | null;
  replyLocale?: 'zh-CN' | 'en';
}): Promise<AssemblePromptsResult> {
  return apiPost('/api/studio/assemble-prompts', body);
}
