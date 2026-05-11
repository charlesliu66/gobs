import type { OutputRecentVideoItem } from '../../api/video.ts';
import {
  getLocalPlaybackSrc,
  getRecentPromptForVideo,
  getVideoFileUrl,
  type VideoHistoryItem,
} from '../../utils/videoHistory.ts';
import type { PendingDistributionDraft } from '../distribution/packageToDistributeDraft.ts';

export type DistributeAssetSource = 'package' | 'current' | 'local' | 'output';

export interface DistributeAssetOption {
  id: string;
  source: DistributeAssetSource;
  title: string;
  subtitle?: string;
  prompt?: string;
  videoPath?: string;
  videoUrl?: string;
  taskId?: string | null;
  createdAt?: number;
}

export function buildCurrentAssetOption(input: {
  videoUrl?: string | null;
  videoPath?: string | null;
  taskId?: string | null;
  prompt?: string | null;
}): DistributeAssetOption | null {
  if (!input.videoPath?.trim() && !input.videoUrl?.trim()) return null;
  return {
    id: `current:${input.taskId || input.videoPath || input.videoUrl}`,
    source: 'current',
    title: input.videoPath?.split('/').pop() || input.taskId || 'Current Studio result',
    subtitle: input.videoPath || input.videoUrl || undefined,
    prompt: input.prompt?.trim() || undefined,
    videoPath: input.videoPath?.trim() || undefined,
    videoUrl: input.videoPath?.trim()
      ? getVideoFileUrl(input.videoPath.trim())
      : input.videoUrl?.trim() || undefined,
    taskId: input.taskId ?? null,
    createdAt: Date.now(),
  };
}

export function buildLocalAssetOptions(items: VideoHistoryItem[]): DistributeAssetOption[] {
  return items
    .map((item) => ({
      id: `local:${item.taskId}`,
      source: 'local' as const,
      title: item.videoPath?.split('/').pop() || item.taskId,
      subtitle: item.prompt?.trim() || item.videoPath || undefined,
      prompt: item.prompt?.trim() || undefined,
      videoPath: item.videoPath?.trim() || undefined,
      videoUrl: getLocalPlaybackSrc(item) || undefined,
      taskId: item.taskId,
      createdAt: item.createdAt,
    }))
    .sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0))
    .slice(0, 8);
}

export function buildOutputAssetOptions(items: OutputRecentVideoItem[]): DistributeAssetOption[] {
  return items.map((item) => ({
    id: `output:${item.path}`,
    source: 'output',
    title: item.path.split('/').pop() || item.path,
    subtitle: item.promptSummary?.trim() || item.path,
    prompt: item.promptSummary?.trim() || undefined,
    videoPath: item.path,
    videoUrl: getVideoFileUrl(item.path),
    createdAt: item.mtimeMs,
  }));
}

export function mergeAssetOptions(
  packageAsset: DistributeAssetOption | null,
  currentAsset: DistributeAssetOption | null,
  localAssets: DistributeAssetOption[],
  outputAssets: DistributeAssetOption[],
): DistributeAssetOption[] {
  const merged = [packageAsset, currentAsset, ...localAssets, ...outputAssets].filter(Boolean) as DistributeAssetOption[];
  const deduped = new Map<string, DistributeAssetOption>();
  for (const asset of merged) {
    const identity = asset.videoPath?.trim() || asset.taskId || asset.videoUrl || asset.id;
    if (!deduped.has(identity)) {
      deduped.set(identity, asset);
    }
  }
  return [...deduped.values()].sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0));
}

export function resolvePromptSeed(
  asset: DistributeAssetOption | null,
  fallbackPrompt?: string | null,
  fallbackTaskId?: string | null,
): string {
  return asset?.prompt?.trim()
    || (fallbackPrompt || '').trim()
    || getRecentPromptForVideo(asset?.taskId ?? fallbackTaskId)
    || '';
}

export function assetSourceLabel(source: DistributeAssetSource, t: (key: string) => string): string {
  if (source === 'package') return t('distribute.assetPendingPackage');
  if (source === 'current') return t('distribute.assetCurrent');
  if (source === 'local') return t('distribute.assetLocal');
  return t('distribute.assetOutput');
}

export function buildPackageAssetOption(draft: PendingDistributionDraft): DistributeAssetOption | null {
  if (!draft.selectedAsset) return null;
  return {
    id: `package:${draft.packageId}:${draft.selectedAsset.id}`,
    source: 'package',
    title: draft.selectedAsset.title,
    subtitle: draft.title,
    videoPath: draft.selectedAsset.videoPath,
    videoUrl: draft.selectedAsset.videoPath
      ? getVideoFileUrl(draft.selectedAsset.videoPath)
      : draft.selectedAsset.videoUrl,
    createdAt: Date.now(),
  };
}
