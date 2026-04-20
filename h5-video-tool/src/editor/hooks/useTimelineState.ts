import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const ASPECT_STORAGE_KEY = 'h5-editor-aspect-ratio';

function loadStoredAspect(): AspectRatioPreset {
  try {
    const v = localStorage.getItem(ASPECT_STORAGE_KEY) as AspectRatioPreset | null;
    if (v === '9:16' || v === '16:9' || v === '1:1' || v === '4:3') return v;
  } catch {
    /* ignore */
  }
  return '9:16';
}

export function useTimelineState() {
  const [aspectRatio, setAspectRatioState] = useState<AspectRatioPreset>(loadStoredAspect);
  const undoRedo = useUndoRedo<TimelineProject>(
    normalizeTimelineProject(emptyTimelineProject(loadStoredAspect())),
  );
  const project = undoRedo.state;
  const setProject = undoRedo.setState;
  const [assets, setAssets] = useState<Record<string, MediaAsset>>({});
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [projectId, setProjectId] = useState<string>(project.id);
  const [projectName, setProjectName] = useState<string>('未命名剪辑项目');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [projectList, setProjectList] = useState<Array<Pick<EditorProjectRecord, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'aspectRatio'>>>([]);
  const suppressAutoSaveRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  /** 曾经有内容的标记；为 false 时空项目不自动保存，避免进入页面就创建空记录 */
  const hasContentRef = useRef(false);

  const setAspectRatio = useCallback((next: AspectRatioPreset) => {
    setAspectRatioState(next);
    try {
      localStorage.setItem(ASPECT_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setProject((p) => ({ ...p, aspectRatio: next }));
  }, []);

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
        setAspectRatioState((rec.aspectRatio as AspectRatioPreset) || normalized.aspectRatio || '9:16');
        setProjectId(rec.id);
        setProjectName(rec.name || '未命名剪辑项目');
        setCurrentTime(0);
        setIsPlaying(false);
        setSaveState('saved');
        hasContentRef.current = true; // 已存在的项目后续修改应继续自动保存
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
      setProjectId(next.id);
      setProjectName(name?.trim() || '未命名剪辑项目');
      setCurrentTime(0);
      setIsPlaying(false);
      setSaveState('idle');
      hasContentRef.current = false; // 新空项目不自动保存
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
    // 只有项目有内容时才自动保存；避免进入页面就创建空记录
    const hasContent =
      project.tracks.some((t) => t.clips.length > 0) ||
      (project.subtitles?.length ?? 0) > 0 ||
      Object.keys(assets).length > 0;
    if (hasContent) hasContentRef.current = true;
    if (!hasContentRef.current) return;

    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
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
          });
          setProjectId(rec.id);
          setProjectName(rec.name || projectName);
          setSaveState('saved');
          await refreshProjectList();
        } catch {
          setSaveState('error');
        }
      })();
    }, 3000);
    return () => {
      if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
    };
  }, [project, assets, aspectRatio, projectId, projectName, refreshProjectList]);

  const durationSec = useMemo(() => {
    const d = computeDurationSec(project);
    return d > 0 ? d : project.durationSec;
  }, [project]);

  const activeVideoClip = useMemo(() => {
    const vTrack = project.tracks.find((t) => t.type === 'video');
    if (!vTrack || vTrack.clips.length === 0) return null;
    /** 含右端点：播放头停在片段结尾（或工程总时长）时仍显示该段画面，避免预览与轨道不一致 */
    const clips = [...vTrack.clips]
      .map((c) => c as VideoClip)
      .sort((a, b) => a.timelineStart - b.timelineStart);
    const eps = 1e-3;
    /** 多段同时满足时取时间轴更靠后的片段（衔接点优先显示后一段） */
    let best: VideoClip | null = null;
    for (const vc of clips) {
      const end = vc.timelineStart + timelineDurationOf(vc);
      if (currentTime + eps >= vc.timelineStart && currentTime <= end + eps) {
        best = vc;
      }
    }
    return best;
  }, [project.tracks, currentTime]);

  const activeVideoUrl = useMemo(() => {
    if (!activeVideoClip) return null;
    const a = assets[activeVideoClip.assetId];
    return a?.url ?? null;
  }, [activeVideoClip, assets]);

  const sourceTimeForPreview = useMemo(() => {
    if (!activeVideoClip) return 0;
    // 时间轴偏移 → 源秒（由 clipSpeed 决定比例），供 <video>.currentTime 赋值
    const raw = toSourceSec(activeVideoClip, currentTime - activeVideoClip.timelineStart);
    const { sourceStart, sourceEnd, assetId } = activeVideoClip;
    let upper = sourceEnd;
    const fileDur = assets[assetId]?.durationSec;
    if (fileDur != null && Number.isFinite(fileDur) && fileDur > 0.05) {
      upper = Math.min(upper, fileDur);
    }
    return Math.min(Math.max(raw, sourceStart), upper);
  }, [activeVideoClip, currentTime, assets]);

  const seek = useCallback((t: number) => {
    const max = Math.max(durationSec, 0.001);
    setCurrentTime(Math.max(0, Math.min(t, max)));
  }, [durationSec]);

  /**
   * Undo/Redo/删除片段后 durationSec 可能缩短，而 currentTime 仍指向旧位置（越界）。
   * 用 effect 统一 clamp，这样所有变更源都自动处理。
   */
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
    projectName,
    setProjectName,
    saveState,
    projectList,
    refreshProjectList,
    openProject,
    createNewProject,
    removeProject,
    renameProject,
  };
}
