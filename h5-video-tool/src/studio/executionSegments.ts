import type {
  ProductionExecutionSegment,
  ProductionExecutionSegmentMode,
  ProductionExecutionSegmentStatus,
  ProductionProject,
  ProductionShot,
  ProductionShotVideoVersion,
} from './productionTypes.ts';

const MIN_SEGMENT_DURATION_SEC = 4;
const MAX_SEGMENT_DURATION_SEC = 15;
const MAX_MERGED_SHORT_SHOTS = 3;

function clampSegmentDuration(durationSec: number): number {
  return Math.max(MIN_SEGMENT_DURATION_SEC, Math.min(MAX_SEGMENT_DURATION_SEC, Math.round(durationSec || 0)));
}

function joinPromptParts(parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function buildShotStoryboardText(shot: ProductionShot): string {
  return (
    shot.videoStoryboardOverride?.trim()
    || joinPromptParts([
      shot.subject,
      shot.action,
      shot.composition,
      shot.lighting,
      shot.emotion,
      shot.notes,
      shot.structuredStill?.sp_subject,
      shot.structuredStill?.sp_environment,
      shot.structuredMotion?.mp_motion,
      shot.structuredMotion?.mp_camera,
    ])
  );
}

function normalizeVersions(
  versions: ProductionShotVideoVersion[] | undefined,
  fallbackKey: string,
): ProductionShotVideoVersion[] | undefined {
  if (!Array.isArray(versions) || versions.length === 0) return undefined;
  const normalized = versions
    .filter((version) => !!(version?.videoPath?.trim() || version?.videoUrl?.trim()))
    .map((version, index) => ({
      ...version,
      id: version.id?.trim() || `${fallbackKey}-v${index + 1}`,
      taskId: version.taskId?.trim() || `${fallbackKey}-task-${index + 1}`,
      createdAt: Number(version.createdAt) || Date.now(),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
  return normalized.length > 0 ? normalized : undefined;
}

function inferLegacySegmentStatus(shot: ProductionShot): ProductionExecutionSegmentStatus {
  const hasVideo = !!shot.previewVideoPath?.trim()
    || !!shot.previewVideoUrl?.trim()
    || !!shot.previewVideoVersions?.some((version) => !!(version?.videoPath?.trim() || version?.videoUrl?.trim()));
  if (hasVideo) return 'done';
  if (shot.lastVideoError?.cancelled) return 'cancelled';
  if (shot.lastVideoError?.reason) return 'failed';
  if (shot.pendingVideoSubmitId?.trim()) return 'processing';
  return 'idle';
}

function buildSegmentLabel(
  shotIndex: number,
  mode: ProductionExecutionSegmentMode,
  segmentOrder: number,
  totalParts = 1,
): string {
  if (mode === 'split_long' && totalParts > 1) return `#${shotIndex} Part ${segmentOrder + 1}/${totalParts}`;
  if (mode === 'merged_short') return `Merged ${segmentOrder + 1}`;
  return `#${shotIndex}`;
}

function buildDirectSegment(shot: ProductionShot, segmentOrder: number): ProductionExecutionSegment {
  const fallbackKey = `seg-${shot.shotIndex}-${segmentOrder}`;
  const versions = normalizeVersions(shot.previewVideoVersions, fallbackKey);
  const selected = versions?.find((version) => version.id === shot.selectedPreviewVideoVersionId) ?? versions?.[0];
  return {
    id: `seg-${shot.shotIndex}-${segmentOrder}`,
    segmentOrder,
    sourceShotIndexes: [shot.shotIndex],
    primaryShotIndex: shot.shotIndex,
    mode: 'direct',
    durationSec: clampSegmentDuration(shot.durationSec),
    storyboardText: buildShotStoryboardText(shot),
    segmentLabel: buildSegmentLabel(shot.shotIndex, 'direct', segmentOrder),
    status: inferLegacySegmentStatus(shot),
    submitId: shot.pendingVideoSubmitId,
    pendingVideoSubmitId: shot.pendingVideoSubmitId,
    videoUrl: selected?.videoUrl ?? shot.previewVideoUrl,
    videoPath: selected?.videoPath ?? shot.previewVideoPath,
    previewVideoVersions: versions,
    selectedPreviewVideoVersionId: selected?.id,
    failReason: shot.lastVideoError?.reason,
    lastVideoError: shot.lastVideoError ? { ...shot.lastVideoError } : undefined,
    batchJobIds: versions
      ?.map((version) => version.batchJobId?.trim())
      .filter((value): value is string => !!value),
    jobIds: versions
      ?.map((version) => version.batchJobId?.trim())
      .filter((value): value is string => !!value),
  };
}

function shouldMergeShots(current: ProductionShot, next: ProductionShot): boolean {
  const sameScene = !!current.sceneRef && !!next.sceneRef && current.sceneRef === next.sceneRef;
  const sameSubject = !!current.subject.trim() && current.subject.trim() === next.subject.trim();
  return sameScene || sameSubject;
}

function buildMergedShortSegment(shots: ProductionShot[], segmentOrder: number): ProductionExecutionSegment {
  const sourceShotIndexes = shots.map((shot) => shot.shotIndex);
  const totalDuration = shots.reduce((sum, shot) => sum + Math.max(1, Math.round(shot.durationSec || 0)), 0);
  return {
    id: `seg-merged-${sourceShotIndexes.join('-')}`,
    segmentOrder,
    sourceShotIndexes,
    primaryShotIndex: sourceShotIndexes[0]!,
    mode: 'merged_short',
    durationSec: clampSegmentDuration(totalDuration),
    storyboardText: shots
      .map((shot, index) => `Part ${index + 1}: ${buildShotStoryboardText(shot)}`)
      .join('\n'),
    segmentLabel: `#${sourceShotIndexes[0]}-${sourceShotIndexes[sourceShotIndexes.length - 1]} merged`,
    status: 'idle',
  };
}

function splitLongShot(shot: ProductionShot, segmentOrderStart: number): ProductionExecutionSegment[] {
  const sourceText = buildShotStoryboardText(shot);
  const pieces = Math.max(2, Math.ceil((shot.durationSec || MAX_SEGMENT_DURATION_SEC) / MAX_SEGMENT_DURATION_SEC));
  const durationPerPiece = clampSegmentDuration(Math.ceil((shot.durationSec || MAX_SEGMENT_DURATION_SEC) / pieces));
  return Array.from({ length: pieces }, (_, index) => ({
    id: `seg-split-${shot.shotIndex}-${index + 1}`,
    segmentOrder: segmentOrderStart + index,
    sourceShotIndexes: [shot.shotIndex],
    primaryShotIndex: shot.shotIndex,
    mode: 'split_long',
    durationSec: durationPerPiece,
    storyboardText: `Part ${index + 1}/${pieces}: ${sourceText}`,
    segmentLabel: buildSegmentLabel(shot.shotIndex, 'split_long', index, pieces),
    status: 'idle',
  }));
}

export function buildExecutionSegmentsFromShots(shots: ProductionShot[]): ProductionExecutionSegment[] {
  const segments: ProductionExecutionSegment[] = [];
  let cursor = 0;
  let segmentOrder = 0;

  while (cursor < shots.length) {
    const shot = shots[cursor]!;
    const roundedDuration = Math.max(1, Math.round(shot.durationSec || 0));

    if (roundedDuration > MAX_SEGMENT_DURATION_SEC) {
      const split = splitLongShot(shot, segmentOrder);
      segments.push(...split);
      segmentOrder += split.length;
      cursor += 1;
      continue;
    }

    if (roundedDuration < MIN_SEGMENT_DURATION_SEC) {
      const shortShots: ProductionShot[] = [shot];
      let total = roundedDuration;
      let nextIndex = cursor + 1;
      while (
        nextIndex < shots.length
        && shortShots.length < MAX_MERGED_SHORT_SHOTS
        && total < MIN_SEGMENT_DURATION_SEC
      ) {
        const nextShot = shots[nextIndex]!;
        const nextDuration = Math.max(1, Math.round(nextShot.durationSec || 0));
        if (!shouldMergeShots(shortShots[shortShots.length - 1]!, nextShot)) break;
        if (total + nextDuration > MAX_SEGMENT_DURATION_SEC) break;
        shortShots.push(nextShot);
        total += nextDuration;
        nextIndex += 1;
      }

      if (shortShots.length > 1 || total >= MIN_SEGMENT_DURATION_SEC) {
        segments.push(buildMergedShortSegment(shortShots, segmentOrder));
        segmentOrder += 1;
        cursor += shortShots.length;
        continue;
      }
    }

    segments.push(buildDirectSegment(shot, segmentOrder));
    segmentOrder += 1;
    cursor += 1;
  }

  return segments;
}

function normalizeExistingSegment(
  segment: ProductionExecutionSegment,
  shotMap: Map<number, ProductionShot>,
  fallbackOrder: number,
): ProductionExecutionSegment {
  const primaryShot = shotMap.get(segment.primaryShotIndex);
  const fallbackKey = segment.id?.trim() || `segment-${segment.primaryShotIndex}-${fallbackOrder}`;
  const versions = normalizeVersions(segment.previewVideoVersions, fallbackKey);
  const selected = versions?.find((version) => version.id === segment.selectedPreviewVideoVersionId) ?? versions?.[0];
  const sourceShotIndexes = Array.from(new Set(
    (Array.isArray(segment.sourceShotIndexes) && segment.sourceShotIndexes.length > 0
      ? segment.sourceShotIndexes
      : [segment.primaryShotIndex]
    ).filter((value): value is number => Number.isFinite(value)),
  )).sort((a, b) => a - b);
  const fallbackStatus = primaryShot ? inferLegacySegmentStatus(primaryShot) : 'idle';
  return {
    ...segment,
    id: fallbackKey,
    segmentOrder: Number.isFinite(segment.segmentOrder) ? segment.segmentOrder : fallbackOrder,
    sourceShotIndexes: sourceShotIndexes.length > 0 ? sourceShotIndexes : [segment.primaryShotIndex],
    durationSec: clampSegmentDuration(segment.durationSec || primaryShot?.durationSec || MIN_SEGMENT_DURATION_SEC),
    storyboardText: segment.storyboardText?.trim() || (primaryShot ? buildShotStoryboardText(primaryShot) : ''),
    segmentLabel: segment.segmentLabel?.trim() || buildSegmentLabel(segment.primaryShotIndex, segment.mode, fallbackOrder),
    status: segment.status ?? fallbackStatus,
    pendingVideoSubmitId: segment.pendingVideoSubmitId?.trim() || segment.submitId?.trim() || primaryShot?.pendingVideoSubmitId || undefined,
    videoUrl: selected?.videoUrl ?? (segment.videoUrl?.trim() || primaryShot?.previewVideoUrl || undefined),
    videoPath: selected?.videoPath ?? (segment.videoPath?.trim() || primaryShot?.previewVideoPath || undefined),
    previewVideoVersions: versions,
    selectedPreviewVideoVersionId: selected?.id,
    failReason: segment.failReason?.trim() || segment.lastVideoError?.reason || primaryShot?.lastVideoError?.reason || undefined,
    lastVideoError: segment.lastVideoError ? { ...segment.lastVideoError } : primaryShot?.lastVideoError ? { ...primaryShot.lastVideoError } : undefined,
    batchJobIds: Array.from(new Set((segment.batchJobIds ?? []).filter(Boolean))),
    jobIds: Array.from(new Set((segment.jobIds ?? segment.batchJobIds ?? []).filter(Boolean))),
  };
}

export function applyExecutionSegmentsToShots(
  shots: ProductionShot[],
  segments: ProductionExecutionSegment[],
): ProductionShot[] {
  return shots.map((shot) => ({
    ...shot,
    executionSegmentIds: segments
      .filter((segment) => segment.sourceShotIndexes.includes(shot.shotIndex))
      .map((segment) => segment.id),
  }));
}

export function ensureExecutionSegments(project: ProductionProject): ProductionProject {
  const shots = project.shots ?? [];
  const shotMap = new Map(shots.map((shot) => [shot.shotIndex, shot]));
  const baseSegments = Array.isArray(project.executionSegments) && project.executionSegments.length > 0
    ? project.executionSegments.map((segment, index) => normalizeExistingSegment(segment, shotMap, index))
    : buildExecutionSegmentsFromShots(shots);
  const coveredShotIndexes = new Set(baseSegments.flatMap((segment) => segment.sourceShotIndexes));
  const fillerSegments = shots
    .filter((shot) => !coveredShotIndexes.has(shot.shotIndex))
    .map((shot, index) => buildDirectSegment(shot, baseSegments.length + index));
  const nextSegments = [...baseSegments, ...fillerSegments]
    .sort((a, b) => a.segmentOrder - b.segmentOrder || a.primaryShotIndex - b.primaryShotIndex);

  return {
    ...project,
    executionSegments: nextSegments,
    shots: applyExecutionSegmentsToShots(shots, nextSegments),
  };
}

export function getSegmentsForShot(
  project: Pick<ProductionProject, 'executionSegments'>,
  shot: Pick<ProductionShot, 'shotIndex' | 'executionSegmentIds'>,
): ProductionExecutionSegment[] {
  const allSegments = project.executionSegments ?? [];
  const ids = new Set(shot.executionSegmentIds ?? []);
  return allSegments
    .filter((segment) => (
      ids.size > 0
        ? ids.has(segment.id)
        : segment.sourceShotIndexes.includes(shot.shotIndex)
    ))
    .sort((a, b) => a.segmentOrder - b.segmentOrder || a.primaryShotIndex - b.primaryShotIndex);
}
