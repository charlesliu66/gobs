import {
  PRODUCTION_STORAGE_KEY,
  type CharacterSheet,
  type ProductionProject,
  type ProductionShot,
  type ProductionShotVideoVersion,
  type SceneSheet,
  type StructureTemplate,
} from './productionTypes';
import {
  buildCharacterSheetsFromStory,
  buildPropSheetsFromProductionDesign,
  buildSceneSheetsFromStory,
  ensureCharacterLookTree,
  mergePropSheetsPreservingImages,
  mergeSceneSheetsFromL2,
} from './productionAssets';

export interface StoredWizard {
  project: ProductionProject;
  characterBible: string;
  synopsis: string;
  structureTemplate: StructureTemplate;
  maxTotalDurationSec: number;
  step: number;
  storyGenre: string;
}

export function migrateProject(p: ProductionProject): ProductionProject {
  const next: ProductionProject = { ...p };
  if (p.story) {
    if (!next.characterAssets?.length) {
      next.characterAssets = buildCharacterSheetsFromStory(p.story);
    }
    if (!next.sceneAssets?.length) {
      next.sceneAssets = buildSceneSheetsFromStory(p.story);
    }
    if (next.productionDesign && next.sceneAssets?.length) {
      next.sceneAssets = mergeSceneSheetsFromL2(next.sceneAssets, next.productionDesign);
    }
  }
  if (next.productionDesign?.props?.length) {
    const built = buildPropSheetsFromProductionDesign(next.productionDesign);
    next.propAssets = mergePropSheetsPreservingImages(built, next.propAssets ?? []);
  }
  if (!next.meta.aspectRatio) {
    next.meta = { ...next.meta, aspectRatio: '16:9' };
  }
  if (next.characterAssets?.length) {
    next.characterAssets = next.characterAssets.map((ch) => ensureCharacterLookTree(ch));
  }
  if (next.shots?.length) {
    next.shots = next.shots.map((shot) => {
      const versions = Array.isArray((shot as ProductionShot).previewVideoVersions)
        ? ((shot as ProductionShot).previewVideoVersions as ProductionShotVideoVersion[])
            .filter((v) => !!(v?.videoPath?.trim() || v?.videoUrl?.trim()))
            .map((v, idx) => ({
              ...v,
              id: v.id?.trim() || `legacy-${shot.shotIndex}-${idx}-${v.createdAt || Date.now()}`,
              taskId: v.taskId?.trim() || `legacy-${shot.shotIndex}-${idx}`,
              createdAt: Number(v.createdAt) || Date.now(),
            }))
            .sort((a, b) => b.createdAt - a.createdAt)
        : [];
      const fallbackPath = shot.previewVideoPath?.trim();
      const fallbackUrl = shot.previewVideoUrl?.trim();
      const needFallback = versions.length === 0 && !!(fallbackPath || fallbackUrl);
      const normalized = needFallback
        ? [
            {
              id: `legacy-${shot.shotIndex}-${Date.now()}`,
              taskId: `legacy-${shot.shotIndex}`,
              createdAt: Date.now(),
              ...(fallbackPath ? { videoPath: fallbackPath } : {}),
              ...(fallbackUrl ? { videoUrl: fallbackUrl } : {}),
            } as ProductionShotVideoVersion,
          ]
        : versions;
      const selectedId = shot.selectedPreviewVideoVersionId?.trim();
      const selected = normalized.find((v) => v.id === selectedId) ?? normalized[0];
      return {
        ...shot,
        previewVideoVersions: normalized,
        selectedPreviewVideoVersionId: selected?.id,
        ...(selected?.videoPath ? { previewVideoPath: selected.videoPath } : { previewVideoPath: undefined }),
        ...(selected?.videoUrl ? { previewVideoUrl: selected.videoUrl } : { previewVideoUrl: undefined }),
      } as ProductionShot;
    });
  }
  return next;
}

export function loadStored(): StoredWizard | null {
  try {
    const raw = localStorage.getItem(PRODUCTION_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (data && typeof data === 'object' && 'project' in data) {
      const s = data as StoredWizard;
      if (s.project?.schemaVersion === '1.0.0') {
        return {
          ...s,
          storyGenre: s.storyGenre ?? '',
          project: migrateProject(s.project),
        };
      }
    }
    const legacy = data as ProductionProject;
    if (legacy?.schemaVersion === '1.0.0') {
      return {
        project: migrateProject(legacy),
        characterBible: '',
        synopsis: '',
        structureTemplate: 'three_act',
        maxTotalDurationSec: 60,
        step: 0,
        storyGenre: '',
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveStored(s: StoredWizard) {
  try {
    localStorage.setItem(PRODUCTION_STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

/**
 * 合并两组 shots 的视频版本数据：按 shotIndex 匹配，
 * 对每个镜头做 union merge（按 version.id 去重），保留双方的视频。
 * 用于页面刷新时防止服务端旧数据覆盖 localStorage 中已保存的新视频。
 */
export function mergeShotVideoVersions(
  serverShots: ProductionShot[],
  localShots: ProductionShot[],
): ProductionShot[] {
  if (!localShots?.length) return serverShots;
  const localMap = new Map(localShots.map((s) => [s.shotIndex, s]));
  return serverShots.map((serverShot) => {
    const localShot = localMap.get(serverShot.shotIndex);
    if (!localShot) return serverShot;

    const serverVersions = Array.isArray(serverShot.previewVideoVersions)
      ? serverShot.previewVideoVersions
      : [];
    const localVersions = Array.isArray(localShot.previewVideoVersions)
      ? localShot.previewVideoVersions
      : [];

    if (localVersions.length === 0) return serverShot;
    if (serverVersions.length === 0) {
      // Server has no versions — adopt local
      const selected = localVersions.find(
        (v) => v.id === localShot.selectedPreviewVideoVersionId,
      ) ?? localVersions[0];
      return {
        ...serverShot,
        previewVideoVersions: localVersions,
        selectedPreviewVideoVersionId: selected?.id,
        previewVideoPath: selected?.videoPath,
        previewVideoUrl: selected?.videoUrl,
        pendingVideoSubmitId:
          serverShot.pendingVideoSubmitId || localShot.pendingVideoSubmitId,
      } as ProductionShot;
    }

    // Both have versions — union merge by version id, preferring local for dupes
    const merged = new Map<string, ProductionShotVideoVersion>();
    for (const v of serverVersions) merged.set(v.id, v);
    for (const v of localVersions) merged.set(v.id, v); // local overwrites dupes
    const union = [...merged.values()].sort((a, b) => b.createdAt - a.createdAt);

    // If local has strictly more versions, it likely contains a newer generation
    // that the server missed (flushServerSync failed). Pick local's selection.
    const localIsNewer = localVersions.length > serverVersions.length
      || (localVersions[0]?.createdAt ?? 0) > (serverVersions[0]?.createdAt ?? 0);
    const preferredSelectedId = localIsNewer
      ? localShot.selectedPreviewVideoVersionId
      : serverShot.selectedPreviewVideoVersionId;
    const selected = union.find((v) => v.id === preferredSelectedId) ?? union[0];

    return {
      ...serverShot,
      previewVideoVersions: union,
      selectedPreviewVideoVersionId: selected?.id,
      previewVideoPath: selected?.videoPath,
      previewVideoUrl: selected?.videoUrl,
      pendingVideoSubmitId:
        serverShot.pendingVideoSubmitId || localShot.pendingVideoSubmitId,
    } as ProductionShot;
  });
}

/** 从剧本同步资产时保留已有定妆图 */
export function mergeCharacterSheetsPreservingLooks(
  next: CharacterSheet[],
  prev: CharacterSheet[],
): CharacterSheet[] {
  return next.map((sheet) => {
    const old = prev.find((o) => o.name.trim() === sheet.name.trim());
    if (!old) return ensureCharacterLookTree(sheet);
    const ne = ensureCharacterLookTree(sheet);
    const oe = ensureCharacterLookTree(old);
    return {
      ...ne,
      id: oe.id,
      lookTree: oe.lookTree,
      activeLookId: oe.activeLookId,
      variants: oe.variants,
    };
  });
}

export function mergeSceneSheetsPreservingImages(next: SceneSheet[], prev: SceneSheet[]): SceneSheet[] {
  return next.map((sheet) => {
    const old = prev.find((o) => o.sceneRef === sheet.sceneRef);
    if (!old) return sheet;
    return { ...sheet, id: old.id, variants: old.variants };
  });
}

