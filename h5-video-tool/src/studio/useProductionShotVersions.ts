/**
 * 分镜视频版本管理 hook：版本列表、选择、清理。
 * 从 ProductionWizard.tsx 提取。
 */
import { useCallback, useMemo } from 'react';
import type { ProductionProject, ProductionShot, ProductionShotVideoVersion } from './productionTypes';
import { resolveProductionShotPreviewVideoSrc } from '../utils/videoHistory';
import { patchShotVersion, deleteShotVersions } from '../api/production';
import { toast } from '../components/Toast';

interface UseProductionShotVersionsParams {
  project: ProductionProject;
  selectedShotIdx: number;
  setProject: React.Dispatch<React.SetStateAction<ProductionProject>>;
  serverProjectId: string | null;
}

export function useProductionShotVersions({
  project,
  selectedShotIdx,
  setProject,
  serverProjectId,
}: UseProductionShotVersionsParams) {
  const shot = project.shots[selectedShotIdx];

  const shotVideoVersions = useMemo(() => {
    if (!shot) return [] as ProductionShotVideoVersion[];
    const list = Array.isArray(shot.previewVideoVersions) ? shot.previewVideoVersions : [];
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [shot]);

  const selectedShotVideoVersion = useMemo(() => {
    if (!shot) return null;
    const selectedId = shot.selectedPreviewVideoVersionId?.trim();
    return shotVideoVersions.find((v) => v.id === selectedId) ?? shotVideoVersions[0] ?? null;
  }, [shot, shotVideoVersions]);

  const shotPreviewPlaySrc = useMemo(
    () =>
      selectedShotVideoVersion
        ? resolveProductionShotPreviewVideoSrc({
            previewVideoPath: selectedShotVideoVersion.videoPath,
            previewVideoUrl: selectedShotVideoVersion.videoUrl,
          })
        : shot
          ? resolveProductionShotPreviewVideoSrc(shot)
          : '',
    [shot, selectedShotVideoVersion],
  );

  const selectShotVideoVersion = useCallback((versionId: string) => {
    setProject((p) => {
      const shots = [...p.shots];
      const cur = shots[selectedShotIdx];
      if (!cur) return p;
      const list = Array.isArray(cur.previewVideoVersions) ? cur.previewVideoVersions : [];
      const picked = list.find((v) => v.id === versionId);
      shots[selectedShotIdx] = {
        ...cur,
        selectedPreviewVideoVersionId: versionId,
        previewVideoPath: picked?.videoPath,
        previewVideoUrl: picked?.videoUrl,
      } as ProductionShot;
      return { ...p, shots, assembled: null };
    });
    if (serverProjectId) {
      const si = shot?.shotIndex;
      if (si != null) {
        patchShotVersion(serverProjectId, si, versionId).catch((e) =>
          console.warn('[patchShotVersion]', e),
        );
      }
    }
  }, [selectedShotIdx, serverProjectId, shot?.shotIndex, setProject]);

  const keepOnlyShotVideoVersion = useCallback((versionId: string) => {
    setProject((p) => {
      const shots = [...p.shots];
      const cur = shots[selectedShotIdx];
      if (!cur) return p;
      const list = Array.isArray(cur.previewVideoVersions) ? cur.previewVideoVersions : [];
      const keep = list.find((v) => v.id === versionId);
      if (!keep) return p;
      shots[selectedShotIdx] = {
        ...cur,
        previewVideoVersions: [keep],
        selectedPreviewVideoVersionId: keep.id,
        previewVideoPath: keep.videoPath,
        previewVideoUrl: keep.videoUrl,
      } as ProductionShot;
      return { ...p, shots, assembled: null };
    });
    if (serverProjectId && shot?.shotIndex != null) {
      deleteShotVersions(serverProjectId, shot.shotIndex, versionId).catch((e) =>
        console.warn('[deleteShotVersions]', e),
      );
    }
    toast.success('已保留当前版本，其余版本已移除');
  }, [selectedShotIdx, serverProjectId, shot?.shotIndex, setProject]);

  return {
    shotVideoVersions,
    selectedShotVideoVersion,
    shotPreviewPlaySrc,
    selectShotVideoVersion,
    keepOnlyShotVideoVersion,
  };
}
