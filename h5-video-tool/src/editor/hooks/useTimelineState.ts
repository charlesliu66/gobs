import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createEmptyEditorProjectMemory, type EditorProjectMemory } from '../types/agentMemory';
import type { AspectRatioPreset, MediaAsset, TimelineProject, VideoClip } from '../types/timeline';
import {
  computeDurationSec,
  emptyTimelineProject,
  normalizeTimelineProject,
  timelineDurationOf,
  toSourceSec,
} from '../types/timeline';
import { useUndoRedo } from './useUndoRedo';
import {
  deleteEditorProject,
  listEditorProjects,
  loadEditorProject,
  renameEditorProject,
  saveEditorProject,
  type EditorProjectRecord,
} from '../../api/editor';
import {
  hasMeaningfulEditorDraft,
  shouldRequireEditorProjectNaming,
  suggestEditorProjectName,
} from '../../utils/projectLifecycle';

const ASPECT_STORAGE_KEY = 'h5-editor-aspect-ratio';

function loadStoredAspect(): AspectRatioPreset {
  try {
    const value = localStorage.getItem(ASPECT_STORAGE_KEY) as AspectRatioPreset | null;
    if (value === '9:16' || value === '16:9' || value === '1:1' || value === '4:3') {
      return value;
    }
  } catch {
    /* ignore */
  }
  return '9:16';
}

function extractAssetName(asset: MediaAsset): string | undefined {
  const originalName = asset.meta && typeof asset.meta === 'object' && 'originalName' in asset.meta
    ? (asset.meta.originalName as string | undefined)
    : undefined;
  return originalName?.trim() || undefined;
}

export function useTimelineState() {
  const [aspectRatio, setAspectRatioState] = useState<AspectRatioPreset>(loadStoredAspect);
  const undoRedo = useUndoRedo<TimelineProject>(
    normalizeTimelineProject(emptyTimelineProject(loadStoredAspect())),
  );
  const project = undoRedo.state;
  const setProject = undoRedo.setState;
  const [assets, setAssets] = useState<Record<string, MediaAsset>>({});
  const [projectMemory, setProjectMemory] = useState<EditorProjectMemory>(() => createEmptyEditorProjectMemory());
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [projectId, setProjectId] = useState<string>(project.id);
  const [hasPersistedProject, setHasPersistedProject] = useState(false);
  const [projectName, setProjectName] = useState<string>('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error' | 'needs_name'>('idle');
  const [projectList, setProjectList] = useState<
    Array<Pick<EditorProjectRecord, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'aspectRatio'>>
  >([]);
  const suppressAutoSaveRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const hasContentRef = useRef(false);

  const draftIsMeaningful = useMemo(
    () =>
      hasMeaningfulEditorDraft({
        project,
        assets,
        projectMemory,
      }),
    [project, assets, projectMemory],
  );

  const projectNamingSuggestion = useMemo(
    () =>
      suggestEditorProjectName({
        sourceProductionTitle:
          typeof project.sourceProductionTitle === 'string' ? project.sourceProductionTitle : undefined,
        assets: Object.values(assets).map((asset) => ({ originalName: extractAssetName(asset) })),
      }),
    [project.sourceProductionTitle, assets],
  );

  const requiresProjectNaming = useMemo(
    () =>
      shouldRequireEditorProjectNaming({
        projectName,
        hasPersistedProject,
        draftIsMeaningful,
      }),
    [projectName, hasPersistedProject, draftIsMeaningful],
  );

  const setAspectRatio = useCallback((next: AspectRatioPreset) => {
    setAspectRatioState(next);
    try {
      localStorage.setItem(ASPECT_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setProject((current) => ({ ...current, aspectRatio: next }));
  }, [setProject]);

  const refreshProjectList = useCallback(async () => {
    try {
      const out = await listEditorProjects();
      setProjectList(out.projects ?? []);
    } catch {
      // ignore
    }
  }, []);

  const openProject = useCallback(
    async (id: string) => {
      suppressAutoSaveRef.current = true;
      try {
        const rec = await loadEditorProject(id);
        const normalized = normalizeTimelineProject(rec.project ?? emptyTimelineProject(rec.aspectRatio ?? '9:16'));
        undoRedo.reset(normalized);
        setAssets(rec.assets ?? {});
        setProjectMemory(rec.memory ?? createEmptyEditorProjectMemory());
        setAspectRatioState((rec.aspectRatio as AspectRatioPreset) || normalized.aspectRatio || '9:16');
        setProjectId(rec.id);
        setHasPersistedProject(true);
        setProjectName((rec.name ?? '').trim());
        setCurrentTime(0);
        setIsPlaying(false);
        setSaveState('saved');
        hasContentRef.current = true;
      } finally {
        setTimeout(() => {
          suppressAutoSaveRef.current = false;
        }, 0);
      }
    },
    [undoRedo],
  );

  const createNewProject = useCallback(
    (name?: string) => {
      suppressAutoSaveRef.current = true;
      const next = normalizeTimelineProject(emptyTimelineProject(aspectRatio));
      undoRedo.reset(next);
      setAssets({});
      setProjectMemory(createEmptyEditorProjectMemory());
      setProjectId(next.id);
      setHasPersistedProject(false);
      setProjectName(name?.trim() || '');
      setCurrentTime(0);
      setIsPlaying(false);
      setSaveState('idle');
      hasContentRef.current = false;
      setTimeout(() => {
        suppressAutoSaveRef.current = false;
      }, 0);
    },
    [aspectRatio, undoRedo],
  );

  const removeProject = useCallback(
    async (id: string) => {
      await deleteEditorProject(id);
      await refreshProjectList();
      if (id === projectId) {
        createNewProject();
      }
    },
    [createNewProject, projectId, refreshProjectList],
  );

  const renameProject = useCallback(
    async (id: string, name: string) => {
      await renameEditorProject(id, name);
      if (id === projectId) setProjectName(name);
      await refreshProjectList();
    },
    [projectId, refreshProjectList],
  );

  useEffect(() => {
    void refreshProjectList();
  }, [refreshProjectList]);

  useEffect(() => {
    if (suppressAutoSaveRef.current) return;
    if (draftIsMeaningful) {
      hasContentRef.current = true;
    }
    if (!hasContentRef.current) {
      return;
    }
    if (saveTimerRef.current != null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (requiresProjectNaming) {
      setSaveState('needs_name');
      return;
    }

    setSaveState('saving');
    saveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const rec = await saveEditorProject({
            id: projectId,
            name: projectName,
            aspectRatio,
            project,
            assets,
            memory: projectMemory,
          });
          setProjectId(rec.id);
          setHasPersistedProject(true);
          setProjectName((rec.name ?? '').trim() || projectName);
          setSaveState('saved');
          await refreshProjectList();
        } catch {
          setSaveState('error');
        }
      })();
    }, 3000);

    return () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    aspectRatio,
    assets,
    draftIsMeaningful,
    project,
    projectId,
    projectMemory,
    projectName,
    refreshProjectList,
    requiresProjectNaming,
  ]);

  const durationSec = useMemo(() => {
    const duration = computeDurationSec(project);
    return duration > 0 ? duration : project.durationSec;
  }, [project]);

  const activeVideoClip = useMemo(() => {
    const videoTrack = project.tracks.find((track) => track.type === 'video');
    if (!videoTrack || videoTrack.clips.length === 0) return null;

    const clips = [...videoTrack.clips]
      .map((clip) => clip as VideoClip)
      .sort((a, b) => a.timelineStart - b.timelineStart);
    const eps = 1e-3;
    let best: VideoClip | null = null;
    for (const clip of clips) {
      const end = clip.timelineStart + timelineDurationOf(clip);
      if (currentTime + eps >= clip.timelineStart && currentTime <= end + eps) {
        best = clip;
      }
    }
    return best;
  }, [project.tracks, currentTime]);

  const activeVideoUrl = useMemo(() => {
    if (!activeVideoClip) return null;
    const asset = assets[activeVideoClip.assetId];
    return asset?.url ?? null;
  }, [activeVideoClip, assets]);

  const sourceTimeForPreview = useMemo(() => {
    if (!activeVideoClip) return 0;
    const raw = toSourceSec(activeVideoClip, currentTime - activeVideoClip.timelineStart);
    const { sourceStart, sourceEnd, assetId } = activeVideoClip;
    let upper = sourceEnd;
    const fileDur = assets[assetId]?.durationSec;
    if (fileDur != null && Number.isFinite(fileDur) && fileDur > 0.05) {
      upper = Math.min(upper, fileDur);
    }
    return Math.min(Math.max(raw, sourceStart), upper);
  }, [activeVideoClip, currentTime, assets]);

  const seek = useCallback((time: number) => {
    const max = Math.max(durationSec, 0.001);
    setCurrentTime(Math.max(0, Math.min(time, max)));
  }, [durationSec]);

  useEffect(() => {
    const max = Math.max(durationSec, 0);
    if (currentTime > max + 1e-3) {
      setCurrentTime(max);
    }
  }, [durationSec, currentTime]);

  return {
    aspectRatio,
    setAspectRatio,
    project,
    setProject,
    undo: undoRedo.undo,
    redo: undoRedo.redo,
    canUndo: undoRedo.canUndo,
    canRedo: undoRedo.canRedo,
    resetProjectHistory: undoRedo.reset,
    beginProjectBatch: undoRedo.beginBatch,
    endProjectBatch: undoRedo.endBatch,
    assets,
    setAssets,
    projectMemory,
    setProjectMemory,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    durationSec,
    activeVideoClip,
    activeVideoUrl,
    sourceTimeForPreview,
    seek,
    projectId,
    setProjectId,
    hasPersistedProject,
    projectName,
    setProjectName,
    saveState,
    projectList,
    draftIsMeaningful,
    requiresProjectNaming,
    projectNamingSuggestion,
    refreshProjectList,
    openProject,
    createNewProject,
    removeProject,
    renameProject,
  };
}
