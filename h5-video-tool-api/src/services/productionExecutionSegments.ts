type JsonRecord = Record<string, unknown>;

export interface ExecutionTargetLookup {
  segmentId?: string;
  sourceShotIndexes?: number[];
  primaryShotIndex?: number;
  shotIndex?: number;
}

export interface ResolvedExecutionTarget {
  project: JsonRecord;
  shots: JsonRecord[];
  executionSegments: JsonRecord[];
  targetSegment?: JsonRecord;
  targetShot?: JsonRecord;
  relatedShots: JsonRecord[];
  sourceShotIndexes: number[];
  primaryShotIndex: number | null;
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readShotIndex(value: unknown): number | null {
  const normalized = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeShotIndexes(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<number>();
  const normalized: number[] = [];
  for (const value of values) {
    const shotIndex = readShotIndex(value);
    if (shotIndex == null || seen.has(shotIndex)) continue;
    seen.add(shotIndex);
    normalized.push(shotIndex);
  }
  return normalized;
}

function getProjectRecord(data: JsonRecord): JsonRecord | null {
  return asRecord(data.project);
}

export function getProjectShots(project: JsonRecord): JsonRecord[] {
  return Array.isArray(project.shots)
    ? project.shots.filter((item): item is JsonRecord => Boolean(asRecord(item)))
    : [];
}

export function getProjectExecutionSegments(project: JsonRecord): JsonRecord[] {
  return Array.isArray(project.executionSegments)
    ? project.executionSegments.filter((item): item is JsonRecord => Boolean(asRecord(item)))
    : [];
}

export function resolveExecutionTarget(
  data: JsonRecord,
  lookup: ExecutionTargetLookup,
): ResolvedExecutionTarget | null {
  const project = getProjectRecord(data);
  if (!project) return null;

  const shots = getProjectShots(project);
  const executionSegments = getProjectExecutionSegments(project);
  const normalizedLookupSources = normalizeShotIndexes(lookup.sourceShotIndexes);
  const primaryShotIndex = readShotIndex(lookup.primaryShotIndex)
    ?? readShotIndex(lookup.shotIndex)
    ?? normalizedLookupSources[0]
    ?? null;

  let targetSegment: JsonRecord | undefined;
  const requestedSegmentId = readTrimmedString(lookup.segmentId);
  if (requestedSegmentId) {
    targetSegment = executionSegments.find((segment) => readTrimmedString(segment.id) === requestedSegmentId);
  }

  if (!targetSegment && executionSegments.length > 0 && primaryShotIndex != null) {
    targetSegment = executionSegments.find((segment) => {
      const segmentPrimaryShotIndex = readShotIndex(segment.primaryShotIndex);
      if (segmentPrimaryShotIndex != null && segmentPrimaryShotIndex === primaryShotIndex) {
        return true;
      }
      const segmentSourceShotIndexes = normalizeShotIndexes(segment.sourceShotIndexes);
      if (segmentSourceShotIndexes.includes(primaryShotIndex)) {
        return true;
      }
      return normalizedLookupSources.length > 0
        && normalizedLookupSources.every((shotIndex) => segmentSourceShotIndexes.includes(shotIndex));
    });
  }

  const targetShot = primaryShotIndex == null
    ? undefined
    : shots.find((shot) => readShotIndex(shot.shotIndex) === primaryShotIndex);

  const resolvedSourceShotIndexes = targetSegment
    ? normalizeShotIndexes(targetSegment.sourceShotIndexes)
    : normalizedLookupSources;
  const effectiveSourceShotIndexes = resolvedSourceShotIndexes.length > 0
    ? resolvedSourceShotIndexes
    : (primaryShotIndex == null ? [] : [primaryShotIndex]);
  const relatedShots = shots.filter((shot) => {
    const shotIndex = readShotIndex(shot.shotIndex);
    return shotIndex != null && effectiveSourceShotIndexes.includes(shotIndex);
  });

  if (!targetSegment && !targetShot) return null;

  return {
    project,
    shots,
    executionSegments,
    targetSegment,
    targetShot,
    relatedShots,
    sourceShotIndexes: effectiveSourceShotIndexes,
    primaryShotIndex,
  };
}

export function mergeExecutionSegmentsForSave(
  incomingProject: JsonRecord | undefined,
  existingProject: JsonRecord | undefined,
): JsonRecord[] | undefined {
  const incomingSegments = incomingProject ? getProjectExecutionSegments(incomingProject) : [];
  const existingSegments = existingProject ? getProjectExecutionSegments(existingProject) : [];

  if (incomingSegments.length === 0) {
    return existingSegments.length > 0 ? existingSegments.map((segment) => ({ ...segment })) : undefined;
  }
  if (existingSegments.length === 0) {
    return incomingSegments.map((segment) => ({ ...segment }));
  }

  const existingById = new Map<string, JsonRecord>();
  for (const segment of existingSegments) {
    const segmentId = readTrimmedString(segment.id);
    if (segmentId) existingById.set(segmentId, segment);
  }

  const merged: JsonRecord[] = [];
  const consumedIds = new Set<string>();
  for (const incomingSegment of incomingSegments) {
    const segmentId = readTrimmedString(incomingSegment.id);
    const existingSegment = segmentId ? existingById.get(segmentId) : undefined;
    const nextSegment: JsonRecord = existingSegment
      ? { ...existingSegment, ...incomingSegment }
      : { ...incomingSegment };

    if (Array.isArray(existingSegment?.jobIds) || Array.isArray(incomingSegment.jobIds)) {
      const jobIds = new Set<string>();
      for (const jobId of [...(Array.isArray(existingSegment?.jobIds) ? existingSegment.jobIds : []), ...(Array.isArray(incomingSegment.jobIds) ? incomingSegment.jobIds : [])]) {
        const normalized = readTrimmedString(jobId);
        if (normalized) jobIds.add(normalized);
      }
      nextSegment.jobIds = [...jobIds];
    }

    merged.push(nextSegment);
    if (segmentId) consumedIds.add(segmentId);
  }

  for (const existingSegment of existingSegments) {
    const segmentId = readTrimmedString(existingSegment.id);
    if (segmentId && consumedIds.has(segmentId)) continue;
    merged.push({ ...existingSegment });
  }

  return merged;
}

export function appendJobId(existingJobIds: unknown, jobId: string): string[] {
  const normalizedJobId = readTrimmedString(jobId);
  const next = new Set<string>();
  if (Array.isArray(existingJobIds)) {
    for (const existingJobId of existingJobIds) {
      const normalized = readTrimmedString(existingJobId);
      if (normalized) next.add(normalized);
    }
  }
  if (normalizedJobId) next.add(normalizedJobId);
  return [...next];
}
