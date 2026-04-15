import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from '../components/Toast';
import { ExportPanel } from '../editor/components/ExportPanel';
import { EditorShell } from '../editor/layout/EditorShell';
import { useTimelineState } from '../editor/hooks/useTimelineState';
import { TimelinePanel } from '../editor/components/TimelinePanel';
import { TimelineClipToolbar } from '../editor/components/TimelineClipToolbar';
import { AgentPanel } from '../editor/components/AgentPanel';
import { MediaLibrary } from '../editor/components/MediaLibrary';
import { BgmMixPanel } from '../editor/components/BgmMixPanel';
import { TextClipEditor } from '../editor/components/TextClipEditor';
import { TextOverlayRenderer } from '../editor/components/TextOverlayRenderer';
import { EditorProjectManager } from '../editor/components/EditorProjectManager';
import type { AudioClip, MediaAsset, TimelineProject, VideoClip } from '../editor/types/timeline';
import type { TextClip } from '../editor/types/timeline';
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
  upsertTextClip,
  removeTextClip,
  getActiveTextClips,
  getAllTextClips,
  addIntroTextClip,
  addOutroTextClip,
} from '../editor/types/timeline';
import { getNextVideoClipAfter } from '../editor/timelinePlayback';
import {
  applyEditorAgentStream,
  chatEditorAgent,
  generateEditorMusic,
  polishEditorMusicPrompt,
  routeEditorAgentMessage,
  type EditorAgentJobProgress,
  type EditorAssetDto,
} from '../api/editor';
import {
  buildAssetNameResolver,
  formatAgentDeliverableMarkdown,
} from '../editor/utils/formatAgentDeliverable';
import { detectBgmIntent } from '../editor/utils/bgmIntent';
import { formatTimelineTime } from '../editor/utils/formatTimelineTime';
import { useSearchParams } from 'react-router-dom';

const MIN_EDIT_SEC = 0.12;

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function mixEditorMusicUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE) return p;
  return `${API_BASE.replace(/\/$/, '')}${p}`;
}

function isLikelyQuotaOrRateLimitError(msg: string): boolean {
  return /RESOURCE_EXHAUSTED|quota|rate.?limit|429|too many requests/i.test(msg);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
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
    undo,
    redo,
    canUndo,
    canRedo,
    projectId,
    projectName,
    setProjectName,
    saveState,
    projectList,
    openProject,
    createNewProject,
    removeProject,
    renameProject,
  } = useTimelineState();
  const [searchParams, setSearchParams] = useSearchParams();

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
  const [agentChatHistory, setAgentChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [libraryItems, setLibraryItems] = useState<EditorAssetDto[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
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
  const [selectedTextClipId, setSelectedTextClipId] = useState<string | null>(null);
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  /** 新建项目命名弹窗 */
  const [newProjectModal, setNewProjectModal] = useState<{ open: boolean; name: string }>({ open: false, name: '' });
  /** 首次自动打开最近项目的标记，防止重复触发 */
  const hasAutoOpenedRef = useRef(false);

  const pushLog = useCallback((line: string) => {
    setAgentLogs((prev) => [...prev, line]);
  }, []);

  /** 自动打开最近项目：没有 URL project 参数时，首次加载项目列表后自动跳到最新项目 */
  useEffect(() => {
    const qp = searchParams.get('project');
    if (qp) return; // URL 已指定项目，不干扰
    if (projectList.length === 0) return; // 列表尚未加载
    if (hasAutoOpenedRef.current) return; // 只触发一次
    hasAutoOpenedRef.current = true;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('project', projectList[0]!.id);
      return next;
    });
  }, [projectList, searchParams, setSearchParams]);

  useEffect(() => {
    const qp = searchParams.get('project');
    if (!qp) return;
    if (qp === projectId) return;
    void (async () => {
      try {
        await openProject(qp);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '加载剪辑项目失败');
      }
    })();
  }, [searchParams, openProject, projectId]);

  useEffect(() => {
    // sync URL param to reflect current projectId
  }, [projectId]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (!(ev.ctrlKey || ev.metaKey)) return;
      const key = ev.key.toLowerCase();
      if (key !== 'z') return;
      ev.preventDefault();
      if (ev.shiftKey) {
        if (canRedo) redo();
      } else if (canUndo) {
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, canUndo, canRedo]);

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
        const out = await withTimeout(
          polishEditorMusicPrompt(userMessage),
          45_000,
          '配乐提示词润色超时（45s）',
        );
        setBgmFormSync({
          prompt: out.prompt,
          negativePrompt: out.negativePrompt,
          key: Date.now(),
        });
        const res = await withTimeout(
          generateEditorMusic({
            prompt: out.prompt,
            negativePrompt: out.negativePrompt || undefined,
            sampleCount: 1,
          }),
          160_000,
          'Lyria 生成超时（160s）',
        );
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
        const msg = e instanceof Error ? e.message : String(e);
        const hint = isLikelyQuotaOrRateLimitError(msg)
          ? '（疑似模型限流/配额不足）'
          : '';
        pushLog(`自动配乐未成功：${msg}${hint}`);
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
            setAgentChatHistory((prev) => [
              ...prev,
              { role: 'user', content: userMessage },
              { role: 'assistant', content: reply },
            ]);
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

  // 读取 History 页面「导入到时间轴」存入的 pending import
  useEffect(() => {
    const raw = sessionStorage.getItem('editor_pending_import');
    if (!raw) return;
    sessionStorage.removeItem('editor_pending_import');
    try {
      const { assetId, originalName } = JSON.parse(raw) as { assetId: string; originalName: string };
      if (!assetId) return;
      const url = `${API_BASE}/api/editor/assets/files/${assetId}`;
      // 延迟一拍等 libraryItems 加载完
      const timer = setTimeout(async () => {
        const asset: EditorAssetDto = { id: assetId, url, kind: 'video', originalName, durationSec: 10 };
        await handleAddToTimeline(asset);
        toast.success(`已导入「${originalName}」到时间轴`);
      }, 800);
      return () => clearTimeout(timer);
    } catch {
      // ignore parse error
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteClip = useCallback(    (trackId: string, clipId: string) => {
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

  /** 拖拽边缘 Trim：实时调整片段入出点 */
  const handleTrimClip = useCallback(
    (clipId: string, range: { sourceStart?: number; sourceEnd?: number }) => {
      setProject((p) => updateVideoClipSourceRange(p, clipId, range));
    },
    [setProject],
  );

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

  /** 同步片段播放速度到 video 元素（预览实时生效） */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = activeVideoClip?.speed ?? 1;
  }, [activeVideoClip?.speed]);

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
    el.playbackRate = activeVideoClip.speed ?? 1;
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

  // ──────────────── 文字轨 handlers ────────────────

  const handleUpsertTextClip = useCallback((clip: TextClip) => {
    applyTimelineProject(upsertTextClip(project, clip));
  }, [project, applyTimelineProject]);

  const handleRemoveTextClip = useCallback((id: string) => {
    applyTimelineProject(removeTextClip(project, id));
    if (selectedTextClipId === id) setSelectedTextClipId(null);
  }, [project, applyTimelineProject, selectedTextClipId]);

  const handleAddIntro = useCallback(() => {
    const p = addIntroTextClip(project, '片头标题', '副标题文字', 'intro-minimal');
    applyTimelineProject(p);
    const clips = getAllTextClips(p);
    if (clips.length > 0) setSelectedTextClipId(clips[0].id);
    setShowTextPanel(true);
  }, [project, applyTimelineProject]);

  const handleAddOutro = useCallback(() => {
    const p = addOutroTextClip(project, '关注我们', '获取更多精彩内容', 'outro-follow');
    applyTimelineProject(p);
    const clips = getAllTextClips(p);
    if (clips.length > 0) setSelectedTextClipId(clips[clips.length - 1].id);
    setShowTextPanel(true);
  }, [project, applyTimelineProject]);

  const handleAddSubtitleText = useCallback(() => {
    const id = `text_${Date.now()}`;
    const clip: TextClip = {
      id,
      timelineStart: currentTime,
      timelineEnd: Math.min(currentTime + 2, project.durationSec),
      text: '字幕文字',
      presetId: 'sub-bottom',
    };
    applyTimelineProject(upsertTextClip(project, clip));
    setSelectedTextClipId(id);
    setShowTextPanel(true);
  }, [project, currentTime, applyTimelineProject]);

  const activeTextClips = useMemo(
    () => getActiveTextClips(project, currentTime),
    [project, currentTime],
  );

  const selectedTextClip = useMemo(
    () => getAllTextClips(project).find((c) => c.id === selectedTextClipId) ?? null,
    [project, selectedTextClipId],
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

    const handleCaptureCover = useCallback(() => {
    const video = document.querySelector<HTMLVideoElement>('video');
    if (!video) { toast.info('暂无视频可截取'); return; }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cover_${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('封面已截取，请检查下载文件');
    }, 'image/jpeg', 0.92);
  }, []);

  return (
    <>
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <EditorShell
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        materialsPanel={
          showTextPanel ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
                <span className="text-xs font-semibold text-[var(--color-text)]">文字编辑</span>
                <button
                  type="button"
                  onClick={() => setShowTextPanel(false)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs"
                >
                  ← 素材
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <TextClipEditor
                  clip={selectedTextClip}
                  onUpdate={handleUpsertTextClip}
                  onDelete={handleRemoveTextClip}
                  onClose={() => setShowTextPanel(false)}
                />
              </div>
            </div>
          ) : (
            <MediaLibrary
              onLoadDemo={loadDemo}
              onLibraryItemsChange={syncAssetsFromLibrary}
              onAddToTimeline={handleAddToTimeline}
              onAssetDeleted={handleLibraryAssetDeleted}
              selectedAssetIds={selectedAssetIds}
              onToggleAsset={toggleSelectAsset}
              onClearSelection={clearSelection}
            />
          )
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
                <TextOverlayRenderer activeClips={activeTextClips} timeSec={currentTime} />
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
            chatHistory={agentChatHistory}
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
            onTrimClip={handleTrimClip}
            selectedVideoClipId={selectedVideoClipId}
            onSelectVideoClip={setSelectedVideoClipId}
            onVideoClipDragEnd={handleVideoClipDragEnd}
            selectedTextClipId={selectedTextClipId}
            onSelectTextClip={setSelectedTextClipId}
            onOpenTextEditor={() => setShowTextPanel(true)}
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
            <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-2 py-1">
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-[140px] bg-transparent text-xs text-[var(--color-text)] outline-none"
                placeholder="项目名"
              />
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {saveState === 'saving'
                  ? '保存中...'
                  : saveState === 'saved'
                    ? '已保存'
                    : saveState === 'error'
                      ? '保存失败'
                      : '未保存'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowProjectManager(true)}
              className="rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              我的项目{projectList.length > 0 ? ` (${projectList.length})` : ''}
            </button>
            <button
              type="button"
              onClick={() => {
                const defaultName = `剪辑-${new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace(/\//g, '')}-${String(new Date().getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}`;
                setNewProjectModal({ open: true, name: defaultName });
              }}
              className="rounded border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 px-2 py-1 text-xs text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
            >
              + 新建
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)] disabled:opacity-40"
              title="撤销 Ctrl+Z"
            >
              撤销
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)] disabled:opacity-40"
              title="重做 Ctrl+Shift+Z"
            >
              重做
            </button>
            <div className="flex items-center gap-1 border-r border-[var(--color-border)] pr-2 mr-1">
              <button
                type="button"
                onClick={handleAddIntro}
                className="rounded px-2 py-1.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
                title="在开头添加片头"
              >
                片头
              </button>
              <button
                type="button"
                onClick={handleAddSubtitleText}
                className="rounded px-2 py-1.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
                title="在当前时间添加字幕"
              >
                + 字幕
              </button>
              <button
                type="button"
                onClick={handleAddOutro}
                className="rounded px-2 py-1.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
                title="在末尾添加片尾"
              >
                片尾
              </button>
            </div>
            <button
              type="button"
              onClick={handleCaptureCover}
              title="截取当前帧为封面"
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/40 transition-colors"
            >
              📷 截帧
            </button>
            <ExportPanel
              project={project}
              aspectRatio={aspectRatio}
              onPushLog={pushLog}
            />
          </div>
        }
      />
    </div>

    {showProjectManager && (
      <EditorProjectManager
        projectList={projectList}
        currentProjectId={projectId}
        onOpen={(id) => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('project', id);
            return next;
          });
        }}
        onNew={() => {
          const defaultName = `剪辑-${new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace(/\//g, '')}-${String(new Date().getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}`;
          setNewProjectModal({ open: true, name: defaultName });
          setShowProjectManager(false);
        }}
        onRename={renameProject}
        onDelete={removeProject}
        onClose={() => setShowProjectManager(false)}
      />
    )}

    {/* 新建项目命名弹窗 */}
    {newProjectModal.open && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        onClick={(e) => { if (e.target === e.currentTarget) setNewProjectModal({ open: false, name: '' }); }}
      >
        <div className="w-80 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-2xl">
          <h3 className="mb-1 text-sm font-semibold text-[var(--color-text)]">新建剪辑项目</h3>
          <p className="mb-3 text-[11px] text-[var(--color-text-muted)]">为新项目起一个名字，之后可以随时修改</p>
          <input
            autoFocus
            type="text"
            value={newProjectModal.name}
            onChange={(e) => setNewProjectModal((s) => ({ ...s, name: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const name = newProjectModal.name.trim() || undefined;
                createNewProject(name);
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('project');
                  return next;
                });
                setNewProjectModal({ open: false, name: '' });
              }
              if (e.key === 'Escape') setNewProjectModal({ open: false, name: '' });
            }}
            placeholder="例：产品宣传片-0415"
            className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNewProjectModal({ open: false, name: '' })}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                const name = newProjectModal.name.trim() || undefined;
                createNewProject(name);
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('project');
                  return next;
                });
                setNewProjectModal({ open: false, name: '' });
              }}
              className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white"
            >
              创建
            </button>
          </div>
        </div>
      </div>
    )}
    </>
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
