import path from 'path';
import type {
  AssetPreprocessSummary,
  AssetRecord,
  TeamAssetCategory,
  TeamAssetCategorySource,
} from '../types/assetLibrary.js';
import { TEAM_ASSET_CATEGORIES } from '../types/assetLibrary.js';

export interface AssetReuseFields {
  team_category: TeamAssetCategory;
  team_category_source: TeamAssetCategorySource;
  reuse_category: TeamAssetCategory;
  preprocess: AssetPreprocessSummary;
}

const TEAM_CATEGORY_SET = new Set<TeamAssetCategory>(TEAM_ASSET_CATEGORIES);

const AI_CATEGORY_TO_TEAM_CATEGORY: Record<string, TeamAssetCategory> = {
  '角色': 'character_image',
  '场景': 'scene_image',
  'UI素材': 'ui_screenshot',
  '宣传图': 'reference_image',
  '视频片段': 'video_clip',
  '武器道具': 'reference_image',
};

export function isTeamAssetCategory(value: string): value is TeamAssetCategory {
  return TEAM_CATEGORY_SET.has(value as TeamAssetCategory);
}

function fileTypeFromMime(mimetype: string): AssetPreprocessSummary['file_type'] {
  const normalized = mimetype.toLowerCase();
  if (normalized.startsWith('image/')) return 'image';
  if (normalized.startsWith('video/')) return 'video';
  if (normalized.startsWith('audio/')) return 'audio';
  return 'other';
}

function reducedRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

export function aspectRatioLabel(width: number | null, height: number | null): string | null {
  if (!width || !height || width <= 0 || height <= 0) return null;
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.03) return '1:1';
  if (Math.abs(ratio - 16 / 9) < 0.03) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.03) return '9:16';
  if (Math.abs(ratio - 4 / 5) < 0.03) return '4:5';
  return reducedRatio(width, height);
}

function inferCategoryFromFilename(filename: string, fileType: AssetPreprocessSummary['file_type']): TeamAssetCategory | null {
  const normalized = `${filename} ${path.basename(filename, path.extname(filename))}`.toLowerCase();
  if (/logo|brand|icon|标志|商标|logo/.test(normalized)) return 'logo';
  if (/banner|kv|key[_ -]?visual|poster|横幅|主视觉|海报/.test(normalized)) return 'finished_banner';
  if (/ui|hud|screen|interface|界面|截图/.test(normalized)) return 'ui_screenshot';
  if (/gameplay|playtest|battle|combat|玩法|战斗|实机/.test(normalized)) {
    return fileType === 'video' ? 'video_clip' : 'gameplay_screenshot';
  }
  if (/character|hero|unit|role|avatar|角色|英雄|立绘/.test(normalized)) return 'character_image';
  if (/scene|background|bg|map|level|场景|背景|地图/.test(normalized)) return 'scene_image';
  return null;
}

export function resolveTeamAssetCategory(asset: Pick<AssetRecord, 'team_category' | 'ai_category' | 'mimetype' | 'filename'>): {
  category: TeamAssetCategory;
  source: TeamAssetCategorySource;
} {
  if (asset.team_category && isTeamAssetCategory(asset.team_category)) {
    return { category: asset.team_category, source: 'manual' };
  }

  const aiCategory = AI_CATEGORY_TO_TEAM_CATEGORY[asset.ai_category ?? ''];
  if (aiCategory) {
    return { category: aiCategory, source: 'ai_category' };
  }

  const fileType = fileTypeFromMime(asset.mimetype || '');
  const filenameCategory = inferCategoryFromFilename(asset.filename || '', fileType);
  if (filenameCategory) {
    return { category: filenameCategory, source: 'filename' };
  }

  if (fileType === 'video') return { category: 'video_clip', source: 'mime' };
  if (fileType === 'image') return { category: 'reference_image', source: 'mime' };
  return { category: 'reference_image', source: 'fallback' };
}

export function buildAssetPreprocessSummary(
  asset: Pick<AssetRecord, 'mimetype' | 'width' | 'height' | 'duration' | 'orientation' | 'has_audio' | 'team_category' | 'ai_category' | 'filename'>,
  options: { thumbnailReady: boolean },
): AssetPreprocessSummary {
  const resolved = resolveTeamAssetCategory(asset);
  return {
    file_type: fileTypeFromMime(asset.mimetype || ''),
    width: asset.width ?? null,
    height: asset.height ?? null,
    aspect_ratio: aspectRatioLabel(asset.width ?? null, asset.height ?? null),
    orientation: asset.orientation ?? null,
    thumbnail_ready: options.thumbnailReady,
    duration_sec: asset.duration ?? null,
    has_audio: asset.has_audio === 1,
    campaign_asset_category: resolved.category,
  };
}

export function buildAssetReuseFields(
  asset: Pick<AssetRecord, 'team_category' | 'ai_category' | 'mimetype' | 'filename' | 'width' | 'height' | 'duration' | 'orientation' | 'has_audio'>,
  options: { thumbnailReady: boolean },
): AssetReuseFields {
  const resolved = resolveTeamAssetCategory(asset);
  return {
    team_category: resolved.category,
    team_category_source: resolved.source,
    reuse_category: resolved.category,
    preprocess: buildAssetPreprocessSummary(asset, options),
  };
}
