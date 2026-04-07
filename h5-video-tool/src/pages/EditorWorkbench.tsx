import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { EditorShell } from '../editor/layout/EditorShell';
import { useTimelineState } from '../editor/hooks/useTimelineState';
import { TimelinePanel } from '../editor/components/TimelinePanel';
import { TimelineClipToolbar } from '../editor/components/TimelineClipToolbar';
import { AgentPanel } from '../editor/components/AgentPanel';
import { MediaLibrary } from '../editor/components/MediaLibrary';
import { BgmMixPanel } from '../editor/components/BgmMixPanel';
import type { AudioClip, MediaAsset, TimelineProject, VideoClip } from '../editor/types/timeline';
import {
  appendVideoClipToProject,
  computeDurationSec,
  moveClipTimelineStart,
  normalizeTimelineProject,
  removeClipFromProject,
  removeSubtitleCue,
  removeVideoClipsByAssetId,
  reorderVideoClip,
  setBgmClipOnProject,
  setVideoClipTransitionAfter,
  setVideoClipSpeed,
  setVideoClipVolume,
  snapVideoClipsSequential,
  splitVideoClipAtPlayhead,
  trimVideoClipHeadToPlayhead,
  trimVideoClipTailToPlayhead,
  updateVideoClipSourceRange,
  upsertSubtitleCue,
  withSyncedDuration,
} from '../editor/types/timeline';
import { getNextVideoClipAfter } from '../editor/timelinePlayback';
import {
  applyEditorAgentStream,
  chatEditorAgent,
  generateEditorMusic,
  getEditorExportStatus,
  polishEditorMusicPrompt,
  routeEditorAgentMessage,
  startEditorExport,
  type EditorAgentJobProgress,
  type EditorAssetDto,
} from '../api/editor';
import {
  buildAssetNameResolver,
  formatAgentDeliverableMarkdown,
} from '../editor/utils/formatAgentDeliverable';
import { detectBgmIntent } from '../editor/utils/bgmIntent';
import { formatTimelineTime } from '../editor/utils/formatTimelineTime';

const MIN_EDIT_SEC = 0.12;

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function mixEditorMusicUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE) return p;
  return `${API_BASE.replace(/\/$/, '')}${p}`;
}

/** 公开示例视频（MDN CC0），用于本地预览联调 */
const DEMO_VIDEO_URL =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm';

function uniqueVideoAssetIds(p: TimelineProject): string[] {
  const s = new Set<string>();
  for (const t of p.tracks) {
    if (t.type !== 'video') continue;
    for (const c of t.clips) {
      s.add((c as VideoClip).assetId);
    }
  }
  return [...s];
}

/** Agent 返回的时间轴可能引用素材 id，若 assets 中尚无 url，从左侧库补全以便预览 */
function mergeAssetsForTimelineClips(
  nextProject: TimelineProject,
  libraryItems: EditorAssetDto[],
  setAssets: Dispatch<SetStateAction<Record<string, MediaAsset>>>,
) {
  const needed = uniqueVideoAssetIds(nextProject);
  setAssets((prev) => {
    const next = { ...prev };
    for (const id of needed) {
      if (next[id]?.url) continue;
      const lib = libraryItems.find((a) => a.id === id);
      if (lib) {
        next[id] = {
          id: lib.id,
          url: lib.url,
          kind: 'video',
          meta: { originalName: lib.originalName },
        };
      }
    }
    return next;
  });
}

export function EditorWorkbench() {
  const {
    aspectRatio,
    setAspectRatio,
    project,
    setProject,
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
  } = useTimelineState();

  const videoRef = useRef<HTMLVideoElement>(null);
  const bgmAudioRef = useRef<HTMLAudioElement>(null);
  const previewColumnRef = useRef<HTMLDivElement>(null);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const projectRef = useRef(project);
  const sourceTimeForPreviewRef = useRef(sourceTimeForPreview);
  const activeVideoClipRef = useRef(activeVideoClip);
  projectRef.current = project;
  sourceTimeForPreviewRef.current = sourceTimeForPreview;
  activeVideoClipRef.current = activeVideoClip;
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [agentBusy, setAgentBusy] = useState(false);
  const [libraryItems, setLibraryItems] = useState<EditorAssetDto[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportHint, setExportHint] = useState<string | null>(null);
  /** Agent 成功后展示成片 Markdown 表（对标竞品交付物） */
  const [agentDeliverable, setAgentDeliverable] = useState<string | null>(null);
  /** Agent 自动配乐成功后同步到左下「配乐生成」文案 */
  const [bgmFormSync, setBgmFormSync] = useState<{
    prompt: string;
    negativePrompt: string;
    key: number;
  } | null>(null);
  /** 剪辑任务 SSE 进度（仅 edit 路径） */
  const [agentJobProgress, setAgentJobProgress] = useState<EditorAgentJobProgress | null>(null);
  /** 时间轴上选中的视频片段（微调 / 溯源） */
  const [selectedVideoClipId, setSelectedVideoClipId] = useState<string | null>(null);

  const pushLog = useCallback((line: string) => {
    setAgentLogs((prev) => [...prev, line]);
  }, []);

  const syncAssetsFromLibrary = useCallback(
    (list: EditorAssetDto[]) => {
      setLibraryItems(list);
      setAssets((prev) => {
        const next = { ...prev };
        for (const a of list) {
          next[a.id] = {
            id: a.id,
            url: a.url,
            kind: 'video' as const,
            meta: { originalName: a.originalName },
          };
        }
        return next;
      });
    },
    [setAssets],
  );

  useEffect(() => {
    const valid = new Set(libraryItems.map((a) => a.id));
    setSelectedAssetIds((prev) => prev.filter((id) => valid.has(id)));
  }, [libraryItems]);

  const toggleSelectAsset = useCallback((id: string) => {
    setSelectedAssetIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const clearSelection = useCallback(() => setSelectedAssetIds([]), []);

  /** 从素材库删除服务端文件后：同步本地缓存、勾选与时间轴片段 */
  const handleLibraryAssetDeleted = useCallback(
    (assetId: string) => {
      setIsPlaying(false);
      setSelectedAssetIds((prev) => prev.filter((id) => id !== assetId));
      setAssets((prev) => {
        const next = { ...prev };
        delete next[assetId];
        return next;
      });
      setProject((p) => removeVideoClipsByAssetId(p, assetId));
      setCurrentTime(0);
    },
    [setAssets, setProject, setCurrentTime, setIsPlaying],
  );

  const runAutoBgmFromAgentMessage = useCallback(
    async (userMessage: string) => {
      pushLog('进度：检测到配乐需求，正在润色并生成 BGM（Lyria）…');
      try {
        const out = await polishEditorMusicPrompt(userMessage);
        setBgmFormSync({
          prompt: out.prompt,
          negativePrompt: out.negativePrompt,
          key: Date.now(),
        });
        const res = await generateEditorMusic({
          prompt: out.prompt,
          negativePrompt: out.negativePrompt || undefined,
          sampleCount: 1,
        });
        const item = res.items[0];
        if (!item) throw new Error('未返回音频');
        const url = mixEditorMusicUrl(item.url);
        setAssets((prev) => ({
          ...prev,
          [item.id]: {
            id: item.id,
            url,
            kind: 'audio' as const,
            durationSec: item.durationSec,
            meta: { bgm: true },
          },
        }));
        setProject((p) => setBgmClipOnProject(p, item.id, item.durationSec));
        pushLog('已根据对话自动完成配乐；不满意可在左下「配乐生成」微调后再点「生成」。');
      } catch (e) {
        pushLog(`自动配乐未成功：${e instanceof Error ? e.message : String(e)}`);
      }
    },
    [pushLog, setAssets, setProject],
  );

  const handleAgentApply = useCallback(
    async (userMessage: string) => {
      let agentOk = false;
      setAgentBusy(true);
      setAgentDeliverable(null);
      setAgentJobProgress(null);
      try {
        let route: Awaited<ReturnType<typeof routeEditorAgentMessage>>;
        try {
          route = await routeEditorAgentMessage(userMessage);
        } catch (e) {
          pushLog(`错误：意图识别失败：${e instanceof Error ? e.message : String(e)}`);
          return;
        }
        if (route.intent === 'chat') {
          try {
            const { reply } = await chatEditorAgent(userMessage);
            pushLog(`助手：${reply}`);
          } catch (e) {
            pushLog(`错误：对话失败：${e instanceof Error ? e.message : String(e)}`);
          }
          return;
        }

        let ids = [...selectedAssetIds];
        if (ids.length === 0) {
          ids = uniqueVideoAssetIds(project);
        }
        if (ids.length === 0) {
          pushLog('请先勾选左侧素材，或先在时间轴上加入至少一段视频。');
          return;
        }

        const assetPayload: Array<{ id: string; originalName: string; durationSec: number }> = [];
        const durUpdates: Record<string, number> = {};
        let assetsForNames: Record<string, MediaAsset> = { ...assets };

        for (const id of ids) {
          const m = assets[id];
          if (!m) {
            assetPayload.push({ id, originalName: id, durationSec: 60 });
            continue;
          }
          let dur = m.durationSec;
          if (dur == null || !Number.isFinite(dur)) {
            try {
              dur = await probeVideoDuration(m.url);
              durUpdates[id] = dur;
            } catch {
              dur = 60;
            }
          }
          assetPayload.push({
            id,
            originalName: String(m.meta?.originalName ?? id),
            durationSec: Math.min(Math.max(dur, 0.5), 36000),
          });
        }

        if (Object.keys(durUpdates).length > 0) {
          for (const [id, d] of Object.entries(durUpdates)) {
            const o = assetsForNames[id];
            if (o) assetsForNames[id] = { ...o, durationSec: d };
          }
          setAssets((prev) => {
            const next = { ...prev };
            for (const [id, d] of Object.entries(durUpdates)) {
              const o = next[id];
              if (o) next[id] = { ...o, durationSec: d };
            }
            return next;
          });
        }

        const { summary, project: nextProject, llmUsage } = await applyEditorAgentStream(
          {
            userMessage,
            aspectRatio,
            selectedAssetIds: ids,
            assets: assetPayload,
            currentProject: project,
          },
          (p) => setAgentJobProgress(p),
        );
        const syncedProject = withSyncedDuration(
          snapVideoClipsSequential(normalizeTimelineProject(nextProject)),
        );
        setProject(syncedProject);
        mergeAssetsForTimelineClips(syncedProject, libraryItems, setAssets);
        setCurrentTime(0);
        setIsPlaying(false);

        const resolveName = buildAssetNameResolver(assetsForNames, libraryItems);
        setAgentDeliverable(formatAgentDeliverableMarkdown(syncedProject, resolveName));

        pushLog(`Agent：${summary}`);
        if (llmUsage?.totals) {
          const t = llmUsage.totals;
          pushLog(
            `Token 合计：prompt ${t.prompt_tokens ?? '—'} · completion ${t.completion_tokens ?? '—'} · total ${t.total_tokens ?? '—'}`,
          );
        }
        agentOk = true;
      } finally {
        setAgentJobProgress(null);
        setAgentBusy(false);
      }
      if (agentOk && detectBgmIntent(userMessage)) {
        void runAutoBgmFromAgentMessage(userMessage);
      }
    },
    [
      selectedAssetIds,
      project,
      aspectRatio,
      assets,
      libraryItems,
      setAssets,
      setProject,
      setCurrentTime,
      setIsPlaying,
      pushLog,
      runAutoBgmFromAgentMessage,
    ],
  );

  const handleAddToTimeline = useCallback(
    async (asset: EditorAssetDto) => {
      let sourceLen = 10;
      try {
        sourceLen = await probeVideoDuration(asset.url);
      } catch {
        pushLog('无法读取视频时长，使用默认 10s 片段。');
      }
      sourceLen = Math.min(Math.max(sourceLen, 0.5), 300);
      setAssets((prev) => ({
        ...prev,
        [asset.id]: {
          id: asset.id,
          url: asset.url,
          kind: 'video' as const,
          durationSec: sourceLen,
          meta: { originalName: asset.originalName },
        },
      }));
      setProject((p) => snapVideoClipsSequential(appendVideoClipToProject(p, asset.id, sourceLen)));
      pushLog(`已将「${asset.originalName}」追加到 V1（约 ${sourceLen.toFixed(1)}s）。`);
    },
    [setAssets, setProject, pushLog],
  );

  const handleDeleteClip = useCallback(
    (trackId: string, clipId: string) => {
      /** 原声轨片段由视频轨镜像生成，删除请改视频轨 */
      if (trackId === 'a1') return;
      setIsPlaying(false);
      setSelectedVideoClipId((prev) => (prev === clipId ? null : prev));
      setProject((p) => {
        const next = removeClipFromProject(p, trackId, clipId);
        const tr = next.tracks.find((x) => x.id === trackId);
        if (tr?.type === 'video') return snapVideoClipsSequential(next);
        return next;
      });
    },
    [setProject, setIsPlaying],
  );

  const handleMoveClip = useCallback(
    (trackId: string, clipId: string, newTimelineStart: number) => {
      setProject((p) => moveClipTimelineStart(p, trackId, clipId, newTimelineStart));
    },
    [setProject],
  );

  /** 视频轨拖拽松手后：所有视频片段按左右顺序首尾吸附（消除缝隙黑场） */
  const handleVideoClipDragEnd = useCallback(() => {
    setIsPlaying(false);
    setProject((p) => snapVideoClipsSequential(p));
  }, [setProject, setIsPlaying]);

  const loadDemo = useCallback(() => {
    const assetId = 'demo_flower';
    setAssets((prev) => ({
      ...prev,
      [assetId]: {
        id: assetId,
        url: DEMO_VIDEO_URL,
        kind: 'video' as const,
        durationSec: 30,
      },
    }));
    const clip: VideoClip = {
      id: 'clip_demo_1',
      assetId,
      sourceStart: 0,
      sourceEnd: 12,
      timelineStart: 0,
    };
    setProject((p) => {
      const base = normalizeTimelineProject(p);
      const tracks = base.tracks.map((t) => {
        if (t.type !== 'video') return t;
        return { ...t, clips: [clip] };
      });
      const next: TimelineProject = { ...base, tracks };
      return snapVideoClipsSequential({ ...next, durationSec: computeDurationSec(next) });
    });
    setCurrentTime(0);
    pushLog('已加载示例视频片段（12s）到视频轨。');
  }, [setAssets, setProject, setCurrentTime, pushLog]);

  /** 暂停：必须 pause，否则解码器会继续跑；并同步源时间 */
  useEffect(() => {
    if (isPlaying) return;
    const el = videoRef.current;
    if (!el || !activeVideoUrl) return;
    el.pause();
    el.currentTime = sourceTimeForPreview;
  }, [isPlaying, activeVideoUrl, sourceTimeForPreview, activeVideoClip?.id, activeVideoClip?.sourceStart]);

  /** 播放：仅时间轴内有当前视频片段时才 play；间隙或结束后保持 pause */
  useEffect(() => {
    if (!isPlaying) return;
    const el = videoRef.current;
    if (!el || !activeVideoUrl) return;
    if (!activeVideoClip) {
      el.pause();
      return;
    }
    el.currentTime = sourceTimeForPreviewRef.current;
    el.play().catch(() => setIsPlaying(false));
  }, [isPlaying, activeVideoUrl, activeVideoClip?.id, setIsPlaying]);

  const canPreview =
    durationSec > 0 &&
    uniqueVideoAssetIds(project).some((id) => Boolean(assets[id]?.url));

  const bgmClip = useMemo(() => {
    const tr = project.tracks.find((t) => t.id === 'a2');
    return (tr?.clips[0] as AudioClip | undefined) ?? null;
  }, [project.tracks]);

  const bgmUrl = useMemo(
    () => (bgmClip ? assets[bgmClip.assetId]?.url ?? null : null),
    [bgmClip, assets],
  );

  const selectedVideoClip = useMemo(() => {
    if (!selectedVideoClipId) return null;
    const v = project.tracks.find((t) => t.id === 'v1');
    const found = (v?.clips as VideoClip[] | undefined)?.find((c) => c.id === selectedVideoClipId);
    return found ?? null;
  }, [project.tracks, selectedVideoClipId]);

  /** 选中片段若已被删或 Agent 重写，清除选中 */
  useEffect(() => {
    if (!selectedVideoClipId) return;
    const v = project.tracks.find((t) => t.id === 'v1');
    const exists = (v?.clips as VideoClip[] | undefined)?.some((c) => c.id === selectedVideoClipId);
    if (!exists) setSelectedVideoClipId(null);
  }, [project.tracks, selectedVideoClipId]);

  const activeSubtitleText = useMemo(() => {
    const cues = project.subtitles ?? [];
    for (const c of cues) {
      if (currentTime >= c.startSec - 1e-3 && currentTime < c.endSec - 1e-3) return c.text;
    }
    return null;
  }, [project.subtitles, currentTime]);

  const applyTimelineProject = useCallback(
    (next: TimelineProject) => {
      setIsPlaying(false);
      setProject(withSyncedDuration(snapVideoClipsSequential(normalizeTimelineProject(next))));
    },
    [setProject, setIsPlaying],
  );

  const resolveAssetName = useMemo(
    () => buildAssetNameResolver(assets, libraryItems),
    [assets, libraryItems],
  );

  const clipToolbarCaps = useMemo(() => {
    if (!selectedVideoClip) {
      return {
        canSplit: false,
        canTrimHead: false,
        canTrimTail: false,
        canMoveEarlier: false,
        canMoveLater: false,
      };
    }
    const vc = selectedVideoClip;
    const len = vc.sourceEnd - vc.sourceStart;
    const tEnd = vc.timelineStart + len;
    const t = currentTime;
    const eps = 0.02;
    const inside = t > vc.timelineStart + eps && t < tEnd - eps;
    const srcAt = vc.sourceStart + (t - vc.timelineStart);
    const canSplit =
      inside &&
      srcAt >= vc.sourceStart + MIN_EDIT_SEC &&
      srcAt <= vc.sourceEnd - MIN_EDIT_SEC;
    const canTrimHead = inside && tEnd - t >= MIN_EDIT_SEC;
    const canTrimTail = inside && t - vc.timelineStart >= MIN_EDIT_SEC;

    const vTrack = project.tracks.find((x) => x.id === 'v1');
    const ordered = [...((vTrack?.clips ?? []) as VideoClip[])].sort((a, b) => a.timelineStart - b.timelineStart);
    const idx = ordered.findIndex((c) => c.id === vc.id);
    const canMoveEarlier = idx > 0;
    const canMoveLater = idx >= 0 && idx < ordered.length - 1;

    return { canSplit, canTrimHead, canTrimTail, canMoveEarlier, canMoveLater };
  }, [selectedVideoClip, currentTime, project.tracks]);

  const clipSummaryLine = useMemo(() => {
    if (!selectedVideoClip) return '';
    const name = resolveAssetName(selectedVideoClip.assetId);
    const shot = selectedVideoClip.shotIndex != null ? `镜${selectedVideoClip.shotIndex} · ` : '';
    return `${shot}${name} · 源 ${formatTimelineTime(selectedVideoClip.sourceStart)}→${formatTimelineTime(selectedVideoClip.sourceEnd)} · 成片 ${formatTimelineTime(selectedVideoClip.timelineStart)} 起`;
  }, [selectedVideoClip, resolveAssetName]);

  const handleClipSplit = useCallback(() => {
    if (!selectedVideoClipId) return;
    const r = splitVideoClipAtPlayhead(project, selectedVideoClipId, currentTime);
    if (!r) {
      pushLog('拆分失败：将播放头移到片段内部，且两侧至少保留约 0.12s。');
      return;
    }
    applyTimelineProject(r.project);
    setSelectedVideoClipId(r.newClipIdRight);
    pushLog('已在播放头处拆分。');
  }, [project, selectedVideoClipId, currentTime, applyTimelineProject, pushLog]);

  const handleClipTrimHead = useCallback(() => {
    if (!selectedVideoClipId) return;
    const next = trimVideoClipHeadToPlayhead(project, selectedVideoClipId, currentTime);
    if (!next) {
      pushLog('掐头失败：播放头需在片段内，且剩余段长需足够。');
      return;
    }
    applyTimelineProject(next);
    pushLog('已掐头：丢弃播放头之前的画面。');
  }, [project, selectedVideoClipId, currentTime, applyTimelineProject, pushLog]);

  const handleClipTrimTail = useCallback(() => {
    if (!selectedVideoClipId) return;
    const next = trimVideoClipTailToPlayhead(project, selectedVideoClipId, currentTime);
    if (!next) {
      pushLog('去尾失败：播放头需在片段内，且剩余段长需足够。');
      return;
    }
    applyTimelineProject(next);
    pushLog('已去尾：丢弃播放头之后的画面。');
  }, [project, selectedVideoClipId, currentTime, applyTimelineProject, pushLog]);

  const handleClipDelete = useCallback(() => {
    if (!selectedVideoClipId) return;
    handleDeleteClip('v1', selectedVideoClipId);
    pushLog('已删除片段。');
  }, [selectedVideoClipId, handleDeleteClip, pushLog]);

  const handleSetSourceRange = useCallback(
    (start: number, end: number) => {
      if (!selectedVideoClipId) return;
      const next = updateVideoClipSourceRange(project, selectedVideoClipId, { sourceStart: start, sourceEnd: end });
      applyTimelineProject(next);
      pushLog(`已设置入出点 ${start.toFixed(2)}s → ${end.toFixed(2)}s`);
    },
    [project, selectedVideoClipId, applyTimelineProject, pushLog],
  );

  const handleSetSpeed = useCallback(
    (speed: number) => {
      if (!selectedVideoClipId) return;
      applyTimelineProject(setVideoClipSpeed(project, selectedVideoClipId, speed));
      pushLog(`播放速度已设为 ${speed}x`);
    },
    [project, selectedVideoClipId, applyTimelineProject, pushLog],
  );

  const handleSetVolume = useCallback(
    (volume: number) => {
      if (!selectedVideoClipId) return;
      applyTimelineProject(setVideoClipVolume(project, selectedVideoClipId, volume));
    },
    [project, selectedVideoClipId, applyTimelineProject],
  );

  const handleClipMoveEarlier = useCallback(() => {
    if (!selectedVideoClipId) return;
    applyTimelineProject(reorderVideoClip(project, selectedVideoClipId, 'up'));
  }, [project, selectedVideoClipId, applyTimelineProject]);

  const handleClipMoveLater = useCallback(() => {
    if (!selectedVideoClipId) return;
    applyTimelineProject(reorderVideoClip(project, selectedVideoClipId, 'down'));
  }, [project, selectedVideoClipId, applyTimelineProject]);

  const handleClipTransition = useCallback(
    (mode: 'cut' | 'crossfade') => {
      if (!selectedVideoClipId) return;
      applyTimelineProject(
        setVideoClipTransitionAfter(project, selectedVideoClipId, mode === 'cut' ? undefined : 'crossfade'),
      );
    },
    [project, selectedVideoClipId, applyTimelineProject],
  );

  const handleAddSubtitleAtPlayhead = useCallback(
    (text: string, startSec: number, endSec: number) => {
      const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      applyTimelineProject(upsertSubtitleCue(project, { id, startSec, endSec, text }));
      pushLog('已添加字幕。');
    },
    [project, applyTimelineProject, pushLog],
  );

  const handleRemoveSubtitle = useCallback(
    (cueId: string) => {
      applyTimelineProject(removeSubtitleCue(project, cueId));
      pushLog('已删除字幕。');
    },
    [project, applyTimelineProject, pushLog],
  );

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const m = project.mix ?? { sourceAudio: 1, bgm: 0.85 };
    v.volume = m.sourceAudio;
  }, [project.mix?.sourceAudio]);

  useEffect(() => {
    const el = bgmAudioRef.current;
    if (!el || !bgmUrl || !bgmClip) return;
    const m = project.mix ?? { sourceAudio: 1, bgm: 0.85 };
    el.volume = m.bgm;
    const clipEnd = bgmClip.timelineStart + (bgmClip.sourceEnd - bgmClip.sourceStart);
    if (currentTime < bgmClip.timelineStart || currentTime >= clipEnd - 0.03) {
      el.pause();
      return;
    }
    const local = bgmClip.sourceStart + (currentTime - bgmClip.timelineStart);
    if (Math.abs(el.currentTime - local) > 0.25) el.currentTime = local;
    if (isPlaying) void el.play();
    else el.pause();
  }, [bgmUrl, bgmClip, currentTime, isPlaying, project.mix]);

  const togglePlay = useCallback(() => {
    if (!canPreview) return;
    setIsPlaying((p) => !p);
  }, [canPreview, setIsPlaying]);

  useEffect(() => {
    const syncFs = () => {
      setPreviewFullscreen(document.fullscreenElement === previewColumnRef.current);
    };
    document.addEventListener('fullscreenchange', syncFs);
    return () => document.removeEventListener('fullscreenchange', syncFs);
  }, []);

  const togglePreviewFullscreen = useCallback(async () => {
    const el = previewColumnRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      /* 部分浏览器拒绝无用户手势 */
    }
  }, []);

  const handleExport = useCallback(async () => {
    setExportBusy(true);
    setExportHint(null);
    try {
      const { jobId } = await startEditorExport({ project, aspectRatio });
      setExportHint(`任务 ${jobId} 已提交…`);
      let tries = 0;
      while (tries < 60) {
        await new Promise((r) => setTimeout(r, 400));
        const st = await getEditorExportStatus(jobId);
        if (st.status === 'done') {
          if (st.downloadUrl) {
            setExportHint(`完成：${st.downloadUrl}`);
          } else {
            setExportHint('Mock：任务已完成（暂无真实 MP4 文件，后续接 FFmpeg）');
          }
          pushLog(`导出任务完成：${jobId}`);
          break;
        }
        if (st.status === 'error') {
          setExportHint(st.error || '导出失败');
          break;
        }
        tries += 1;
      }
    } catch (e) {
      setExportHint(e instanceof Error ? e.message : '导出请求失败');
    } finally {
      setExportBusy(false);
    }
  }, [project, aspectRatio, pushLog]);

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <EditorShell
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        materialsPanel={
          <MediaLibrary
            onLoadDemo={loadDemo}
            onLibraryItemsChange={syncAssetsFromLibrary}
            onAddToTimeline={handleAddToTimeline}
            onAssetDeleted={handleLibraryAssetDeleted}
            selectedAssetIds={selectedAssetIds}
            onToggleAsset={toggleSelectAsset}
            onClearSelection={clearSelection}
          />
        }
        musicPanel={
          <BgmMixPanel
            project={project}
            setProject={setProject}
            setAssets={setAssets}
            onPushLog={pushLog}
            promptSync={bgmFormSync}
          />
        }
        previewPanel={
          <div
            ref={previewColumnRef}
            className="flex h-full min-h-0 flex-col bg-[var(--color-surface)] [&:fullscreen]:bg-black"
          >
            <div className="border-b border-[var(--color-border)] px-3 py-2">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">预览</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-black p-2">
              <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg bg-black ring-1 ring-white/10">
                {canPreview && activeVideoUrl ? (
                  <video
                    key={activeVideoUrl}
                    ref={videoRef}
                    src={activeVideoUrl}
                    className="h-full w-full object-cover object-center"
                    playsInline
                    muted={false}
                    onLoadedMetadata={(e) => {
                      const el = e.currentTarget;
                      if (!activeVideoClip) return;
                      let t = sourceTimeForPreview;
                      const d = el.duration;
                      if (Number.isFinite(d) && d > 0) {
                        t = Math.min(t, Math.max(0, d - 1e-3));
                      }
                      el.currentTime = t;
                    }}
                    onTimeUpdate={(e) => {
                      if (!isPlaying || !activeVideoClip) return;
                      const el = e.currentTarget;
                      const vc = activeVideoClip;
                      /** 源文件不得越过片段出点，否则画面会跑到时间轴外 */
                      if (el.currentTime > vc.sourceEnd - 0.001) {
                        el.currentTime = vc.sourceEnd;
                      }
                      const t = vc.timelineStart + (el.currentTime - vc.sourceStart);
                      setCurrentTime(t);
                      const clipEnd = vc.timelineStart + (vc.sourceEnd - vc.sourceStart);
                      if (t < clipEnd - 0.08) return;
                      el.pause();
                      const next = getNextVideoClipAfter(projectRef.current, vc);
                      if (next) {
                        setCurrentTime(next.timelineStart);
                      } else {
                        setIsPlaying(false);
                        seek(clipEnd);
                      }
                    }}
                    onEnded={() => {
                      const el = videoRef.current;
                      el?.pause();
                      const vc = activeVideoClipRef.current;
                      if (!vc) return;
                      const clipEnd = vc.timelineStart + (vc.sourceEnd - vc.sourceStart);
                      setIsPlaying(false);
                      seek(clipEnd);
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                    加载示例、上传素材或 Agent 生成时间轴后预览
                  </div>
                )}
                {activeSubtitleText ? (
                  <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 max-w-[92%] -translate-x-1/2 rounded-md bg-black/55 px-3 py-2 text-center text-sm font-medium leading-snug text-white shadow-lg">
                    {activeSubtitleText}
                  </div>
                ) : null}
                {bgmUrl && bgmClip ? (
                  <audio
                    key={bgmClip.id}
                    ref={bgmAudioRef}
                    src={bgmUrl}
                    preload="auto"
                    className="hidden"
                    aria-hidden
                  />
                ) : null}
              </div>
            </div>
          </div>
        }
        agentPanel={
          <AgentPanel
            logs={agentLogs}
            onPushLog={pushLog}
            onApply={handleAgentApply}
            busy={agentBusy}
            jobProgress={agentJobProgress}
            selectedCount={selectedAssetIds.length}
            timelineAssetCount={uniqueVideoAssetIds(project).length}
            deliverableMarkdown={agentDeliverable}
          />
        }
        timelinePanel={
          <TimelinePanel
            project={project}
            currentTime={currentTime}
            durationSec={Math.max(durationSec, 0.01)}
            onSeek={(t) => {
              setIsPlaying(false);
              seek(t);
            }}
            onDeleteClip={handleDeleteClip}
            onMoveClip={handleMoveClip}
            selectedVideoClipId={selectedVideoClipId}
            onSelectVideoClip={setSelectedVideoClipId}
            onVideoClipDragEnd={handleVideoClipDragEnd}
            onMixChange={(partial) => {
              setProject((p) => {
                const n = normalizeTimelineProject(p);
                const m = n.mix ?? { sourceAudio: 1, bgm: 0.85 };
                return {
                  ...n,
                  mix: {
                    sourceAudio: partial.sourceAudio ?? m.sourceAudio,
                    bgm: partial.bgm ?? m.bgm,
                  },
                };
              });
            }}
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            canPlay={canPreview}
            onEnterPreviewFullscreen={togglePreviewFullscreen}
            previewFullscreen={previewFullscreen}
            clipToolbar={
              <TimelineClipToolbar
                hasSelection={Boolean(selectedVideoClip)}
                canSplit={clipToolbarCaps.canSplit}
                canTrimHead={clipToolbarCaps.canTrimHead}
                canTrimTail={clipToolbarCaps.canTrimTail}
                canMoveEarlier={clipToolbarCaps.canMoveEarlier}
                canMoveLater={clipToolbarCaps.canMoveLater}
                transition={selectedVideoClip?.transitionAfter === 'crossfade' ? 'crossfade' : 'cut'}
                summaryLine={clipSummaryLine}
                currentTime={currentTime}
                timelineDuration={durationSec}
                clipSourceStart={selectedVideoClip?.sourceStart}
                clipSourceEnd={selectedVideoClip?.sourceEnd}
                clipSpeed={selectedVideoClip?.speed ?? 1}
                clipVolume={selectedVideoClip?.volume ?? 100}
                onSplit={handleClipSplit}
                onTrimHead={handleClipTrimHead}
                onTrimTail={handleClipTrimTail}
                onDelete={handleClipDelete}
                onMoveEarlier={handleClipMoveEarlier}
                onMoveLater={handleClipMoveLater}
                onTransitionChange={handleClipTransition}
                onAddSubtitle={handleAddSubtitleAtPlayhead}
                subtitleCueCount={project.subtitles?.length ?? 0}
                subtitleCues={project.subtitles ?? []}
                onRemoveSubtitle={handleRemoveSubtitle}
                onSetSourceRange={handleSetSourceRange}
                onSetSpeed={handleSetSpeed}
                onSetVolume={handleSetVolume}
              />
            }
          />
        }
        topBarExtra={
          <div className="flex items-center gap-2">
            {exportHint && (
              <span className="max-w-[200px] truncate text-[10px] text-[var(--color-text-muted)]" title={exportHint}>
                {exportHint}
              </span>
            )}
            <button
              type="button"
              disabled={exportBusy}
              onClick={handleExport}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {exportBusy ? '导出中…' : '一键导出 MP4'}
            </button>
          </div>
        }
      />
    </div>
  );
}

function probeVideoDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      const d = v.duration;
      v.removeAttribute('src');
      v.load();
      resolve(Number.isFinite(d) && d > 0 ? d : 10);
    };
    v.onerror = () => reject(new Error('无法读取元数据'));
    v.src = url;
  });
}
