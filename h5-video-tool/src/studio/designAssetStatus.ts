import type { PortraitJobState } from '../components/production/portraitJobKey.ts';
import { getCharacterLookImage } from './productionAssets.ts';
import type { CharacterSheet, PropSheet, SceneSheet } from './productionTypes.ts';

export type DesignAssetStatus = 'missing' | 'generating' | 'review' | 'ready' | 'failed';

export type DesignAssetStatusCounts = {
  total: number;
  ready: number;
  review: number;
  generating: number;
  failed: number;
  missing: number;
};

type CharacterAssetEntry = {
  sheet: CharacterSheet;
  portraitJob?: PortraitJobState | null;
};

type ScenePropAssetEntry<TSheet extends SceneSheet | PropSheet> = {
  sheet: TSheet;
  isGenerating?: boolean;
  hasPreview?: boolean;
  hasError?: boolean;
};

function emptyCounts(): DesignAssetStatusCounts {
  return {
    total: 0,
    ready: 0,
    review: 0,
    generating: 0,
    failed: 0,
    missing: 0,
  };
}

function addStatus(counts: DesignAssetStatusCounts, status: DesignAssetStatus): DesignAssetStatusCounts {
  return {
    ...counts,
    total: counts.total + 1,
    [status]: counts[status] + 1,
  };
}

export function getCharacterAssetStatus(
  sheet: CharacterSheet,
  portraitJob?: PortraitJobState | null,
): DesignAssetStatus {
  if (portraitJob?.status === 'generating') return 'generating';
  if (portraitJob?.status === 'done') return 'review';
  if (portraitJob?.status === 'error') return 'failed';
  if (getCharacterLookImage(sheet)) return 'ready';
  return 'missing';
}

export function getScenePropAssetStatus(input: {
  hasImage: boolean;
  isGenerating?: boolean;
  hasPreview?: boolean;
  hasError?: boolean;
}): DesignAssetStatus {
  if (input.isGenerating) return 'generating';
  if (input.hasPreview) return 'review';
  if (input.hasError) return 'failed';
  if (input.hasImage) return 'ready';
  return 'missing';
}

function getScenePropMainImage(sheet: SceneSheet | PropSheet): string | undefined {
  return sheet.variants[0]?.imageDataUrl;
}

function countCharacters(items: CharacterAssetEntry[]): DesignAssetStatusCounts {
  return items.reduce((counts, item) => addStatus(counts, getCharacterAssetStatus(item.sheet, item.portraitJob)), emptyCounts());
}

function countSceneProps<TSheet extends SceneSheet | PropSheet>(items: Array<ScenePropAssetEntry<TSheet>>): DesignAssetStatusCounts {
  return items.reduce((counts, item) => addStatus(
    counts,
    getScenePropAssetStatus({
      hasImage: !!getScenePropMainImage(item.sheet),
      isGenerating: item.isGenerating,
      hasPreview: item.hasPreview,
      hasError: item.hasError,
    }),
  ), emptyCounts());
}

export function summarizeDesignAssetReadiness(input: {
  characters: CharacterAssetEntry[];
  scenes: Array<ScenePropAssetEntry<SceneSheet>>;
  props: Array<ScenePropAssetEntry<PropSheet>>;
}): {
  characters: DesignAssetStatusCounts;
  scenes: DesignAssetStatusCounts;
  props: DesignAssetStatusCounts;
  missingTotal: number;
} {
  const characters = countCharacters(input.characters);
  const scenes = countSceneProps(input.scenes);
  const props = countSceneProps(input.props);

  return {
    characters,
    scenes,
    props,
    missingTotal: characters.missing + scenes.missing + props.missing,
  };
}
