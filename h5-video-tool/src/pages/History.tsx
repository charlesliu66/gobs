import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import type { BatchJobDto } from '../api/batchJobs';
import { appendFileAccessToken } from '../api/client';
import { uploadEditorAsset } from '../api/editor';
import { pollRemixUntilDone, submitRemixMerge } from '../api/remix';
import {
  getKlingRecentList,
  klingVideoProxyUrl,
  resolveKlingPlaybackUrl,
  type KlingVideoListRow,
} from '../api/video';
import { BatchJobsBoard } from '../components/BatchJobsBoard';
import { RunningStatus } from '../components/RunningStatus';
import { toast } from '../components/Toast';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { formatDateTime } from '../i18n/locale.ts';
import {
  hideCloudTask,
  loadCloudHiddenIds,
  loadCloudStarredIds,
  toggleCloudStarred,
} from '../utils/historyPrefs';
import { absoluteApiUrl } from '../utils/absoluteApiUrl';
import {
  getLocalPlaybackSrc,
  loadVideoHistory,
  removeVideoFromHistory,
  saveVideoToHistory,
  toggleVideoHistoryStarred,
  type VideoHistoryItem,
} from '../utils/videoHistory';

type HistoryTab = 'cloud' | 'local' | 'batch';

function buildSimpleSrt(text: string): string {
  return `1\n00:00:00,000 --> 00:59:59,999\n${text.replace(/\r/g, '').replace(/\n/g, ' ')}\n`;
}

function sortLocalItems(items: VideoHistoryItem[]): VideoHistoryItem[] {
  return [...items].sort((a, b) => {
    const sa = a.starred ? 1 : 0;
    const sb = b.starred ? 1 : 0;
    if (sb !== sa) return sb - sa;
    return b.createdAt - a.createdAt;
  });
}

function sortCloudRows(rows: KlingVideoListRow[], starred: Set<string>): KlingVideoListRow[] {
  return [...rows].sort((a, b) => {
    const sa = starred.has(a.taskId) ? 1 : 0;
    const sb = starred.has(b.taskId) ? 1 : 0;
    if (sb !== sa) return sb - sa;
    const ta = a.createdAt || '';
    const tb = b.createdAt || '';
    return tb.localeCompare(ta);
  });
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        className={filled ? 'text-amber-400' : 'text-[var(--color-text-muted)]'}
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function History() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, uiLocale } = useLocale();
  const text = useCallback(
    (path: string, vars?: Record<string, string | number>) =>
      Object.entries(vars ?? {}).reduce(
        (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
        t(path),
      ),
    [t],
  );

  const [tab, setTab] = useState<HistoryTab>('cloud');
  const [items, setItems] = useState<VideoHistoryItem[]>(() => loadVideoHistory());
  const [cloudItems, setCloudItems] = useState<KlingVideoListRow[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [klingAvailable, setKlingAvailable] = useState(false);
  const [prefsVersion, setPrefsVersion] = useState(0);

  const [mergeMode, setMergeMode] = useState(false);
  const [selectedClipKeys, setSelectedClipKeys] = useState<string[]>([]);
  const [mergeIntroUrl, setMergeIntroUrl] = useState('');
  const [mergeOutroUrl, setMergeOutroUrl] = useState('');
  const [mergeSubtitleMode, setMergeSubtitleMode] = useState<'off' | 'simple' | 'srt'>('off');
  const [batchImportBusy, setBatchImportBusy] = useState(false);
  const [mergeSimpleText, setMergeSimpleText] = useState('');
  const [mergeSrtText, setMergeSrtText] = useState('');
  const [mergeBusy, setMergeBusy] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const formatTime = useCallback(
    (value: string | number | Date) =>
      formatDateTime(value, uiLocale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [uiLocale],
  );

  const handleImportBatchVideo = useCallback(async (job: BatchJobDto) => {
    if (!job.videoUrl) return;
    setBatchImportBusy(true);
    try {
      const protectedVideoUrl = appendFileAccessToken(absoluteApiUrl(job.videoUrl));
      const resp = await fetch(protectedVideoUrl);
      if (!resp.ok) throw new Error(text('history.importDownloadFailed', { status: resp.status }));
      const blob = await resp.blob();
      const filename = `batch_shot${job.shotIndex + 1}_${job.id}.mp4`;
      const file = new File([blob], filename, { type: 'video/mp4' });
      const { asset } = await uploadEditorAsset(file);
      toast.success(
        text('history.importBatchSuccess', {
          filename,
          size: (file.size / 1024 / 1024).toFixed(1),
        }),
      );
      sessionStorage.setItem('editor_pending_import', JSON.stringify({ assetId: asset.id, originalName: filename }));
      navigate('/editor');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.importFailed'));
    } finally {
      setBatchImportBusy(false);
    }
  }, [navigate, t, text]);

  useEffect(() => {
    const defaultTab = (location.state as { defaultTab?: HistoryTab } | null)?.defaultTab;
    if (defaultTab === 'batch' || defaultTab === 'local' || defaultTab === 'cloud') {
      setTab(defaultTab);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const cloudStarred = useMemo(() => loadCloudStarredIds(), [prefsVersion, cloudItems]);
  const cloudHidden = useMemo(() => loadCloudHiddenIds(), [prefsVersion, cloudItems]);

  useEffect(() => {
    let cancelled = false;
    setCloudLoading(true);
    setCloudError(null);
    getKlingRecentList(1, 20)
      .then((response) => {
        if (!cancelled) {
          setCloudItems(response.items || []);
          setKlingAvailable(!!response.klingAvailable);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const msg = error instanceof Error ? error.message : t('errors.loadFailed');
          toast.error(msg);
          setCloudError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setCloudLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const visibleCloudRows = useMemo(() => {
    const filtered = cloudItems.filter((row) => !cloudHidden.has(row.taskId));
    return sortCloudRows(filtered, cloudStarred);
  }, [cloudItems, cloudHidden, cloudStarred]);

  const sortedLocalItems = useMemo(() => sortLocalItems(items), [items]);

  const refreshLocal = useCallback(() => setItems(loadVideoHistory()), []);

  useEffect(() => {
    if (tab === 'local') refreshLocal();
  }, [tab, refreshLocal]);

  const handleRemoveLocal = useCallback((taskId: string) => {
    removeVideoFromHistory(taskId);
    refreshLocal();
  }, [refreshLocal]);

  const handleStarLocal = useCallback((taskId: string) => {
    toggleVideoHistoryStarred(taskId);
    refreshLocal();
  }, [refreshLocal]);

  const handleStarCloud = useCallback((taskId: string) => {
    toggleCloudStarred(taskId);
    setPrefsVersion((value) => value + 1);
  }, []);

  const handleDeleteCloud = useCallback((taskId: string) => {
    hideCloudTask(taskId);
    setPrefsVersion((value) => value + 1);
  }, []);

  const openCloudResult = useCallback((row: KlingVideoListRow) => {
    const remote = resolveKlingPlaybackUrl(row);
    if (!remote) return;
    const tid = row.taskId.startsWith('kling-') ? row.taskId : `kling-${row.taskId}`;
    saveVideoToHistory({
      taskId: tid,
      videoPath: '',
      videoUrl: klingVideoProxyUrl(remote),
      prompt: row.prompt || `${t('history.tabCloud')} ${row.taskId}`,
    });
    refreshLocal();
    navigate(`/result?taskId=${encodeURIComponent(tid)}`);
  }, [navigate, refreshLocal, t]);

  const buildClipUrlForKey = useCallback((key: string): string | null => {
    if (key.startsWith('local:')) {
      const tid = key.slice(6);
      const item = items.find((row) => row.taskId === tid);
      if (!item) return null;
      const src = getLocalPlaybackSrc(item);
      return src ? absoluteApiUrl(src) : null;
    }
    if (key.startsWith('cloud:')) {
      const tid = key.slice(6);
      const row = cloudItems.find((entry) => entry.taskId === tid);
      if (!row) return null;
      const remote = resolveKlingPlaybackUrl(row);
      return remote ? absoluteApiUrl(klingVideoProxyUrl(remote)) : null;
    }
    return null;
  }, [cloudItems, items]);

  const toggleClipKey = useCallback((key: string) => {
    setSelectedClipKeys((prev) => (prev.includes(key) ? prev.filter((value) => value !== key) : [...prev, key]));
  }, []);

  const moveClipKey = useCallback((index: number, dir: -1 | 1) => {
    setSelectedClipKeys((prev) => {
      const next = [...prev];
      const targetIndex = index + dir;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const current = next[index]!;
      next[index] = next[targetIndex]!;
      next[targetIndex] = current;
      return next;
    });
  }, []);

  const runMerge = useCallback(async () => {
    if (selectedClipKeys.length === 0) {
      setMergeError(t('history.mergeClipEmpty'));
      return;
    }

    setMergeError(null);
    const clipUrls: string[] = [];
    for (const key of selectedClipKeys) {
      const url = buildClipUrlForKey(key);
      if (!url) {
        setMergeError(text('history.mergeResolveFailed', { key }));
        return;
      }
      clipUrls.push(url);
    }

    let subtitles: string | undefined;
    if (mergeSubtitleMode === 'simple' && mergeSimpleText.trim()) {
      subtitles = buildSimpleSrt(mergeSimpleText.trim());
    } else if (mergeSubtitleMode === 'srt' && mergeSrtText.trim()) {
      subtitles = mergeSrtText.trim();
    }

    const introRaw = mergeIntroUrl.trim();
    const outroRaw = mergeOutroUrl.trim();
    const introUrl = introRaw ? (/^https?:\/\//i.test(introRaw) ? introRaw : absoluteApiUrl(introRaw)) : undefined;
    const outroUrl = outroRaw ? (/^https?:\/\//i.test(outroRaw) ? outroRaw : absoluteApiUrl(outroRaw)) : undefined;

    setMergeBusy(true);
    try {
      const { taskId } = await submitRemixMerge({ clipUrls, introUrl, outroUrl, subtitles });
      const outPath = await pollRemixUntilDone(taskId);
      const vp = outPath.startsWith('output/') ? outPath : `output/${outPath}`;
      const newId = `merge-${Date.now()}`;
      saveVideoToHistory({
        taskId: newId,
        videoPath: vp,
        prompt: text('history.mergePromptPrefix', { count: clipUrls.length }),
      });
      refreshLocal();
      setMergeMode(false);
      setSelectedClipKeys([]);
      navigate(`/result?taskId=${encodeURIComponent(newId)}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : t('errors.unknownError');
      toast.error(text('history.mergeFailed', { reason }));
    } finally {
      setMergeBusy(false);
    }
  }, [
    buildClipUrlForKey,
    mergeIntroUrl,
    mergeOutroUrl,
    mergeSimpleText,
    mergeSrtText,
    mergeSubtitleMode,
    navigate,
    refreshLocal,
    selectedClipKeys,
    t,
    text,
  ]);

  return (
    <div className="flex min-h-0 w-full max-w-6xl flex-col">
      <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 pb-3 backdrop-blur-md sm:mx-0 sm:px-0">
        <h1 className="page-title">{t('history.pageTitle')}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {([
            ['cloud', t('history.tabCloud')],
            ['local', t('history.tabLocal')],
            ['batch', t('history.tabBatch')],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              {value === 'batch' ? `🌙 ${label}` : label}
            </button>
          ))}
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-[var(--color-text-subtle)]">{t('history.intro')}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMergeMode((current) => {
                if (current) setSelectedClipKeys([]);
                return !current;
              });
            }}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              mergeMode
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            {mergeMode ? t('history.exitMergeMode') : t('history.enterMergeMode')}
          </button>
          {mergeMode && <span className="text-xs text-[var(--color-text-muted)]">{t('history.mergeModeHint')}</span>}
        </div>
      </div>

      {tab === 'cloud' && (
        <section className="space-y-4">
          {cloudLoading && <p className="text-sm text-[var(--color-text-muted)]">{t('history.loadingCloudList')}</p>}
          {cloudError && <p className="text-sm text-[var(--color-error)]">{cloudError}</p>}
          {!cloudLoading && !klingAvailable && !cloudError && (
            <p className="text-sm text-[var(--color-text-muted)]">{t('history.klingNotConfigured')}</p>
          )}
          {!cloudLoading && klingAvailable && visibleCloudRows.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {cloudItems.length ? t('history.cloudHiddenEmpty') : t('history.cloudEmpty')}
            </p>
          )}

          {visibleCloudRows.length > 0 && (
            <div className="space-y-4">
              {visibleCloudRows.map((row) => {
                const remote = resolveKlingPlaybackUrl(row);
                const play = remote ? klingVideoProxyUrl(remote) : '';
                const starred = cloudStarred.has(row.taskId);
                return (
                  <div
                    key={row.taskId}
                    className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] sm:flex-row"
                  >
                    {mergeMode && (
                      <div className="flex shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 px-3 py-2 sm:w-11 sm:items-center sm:border-r sm:border-b-0 sm:py-0">
                        <input
                          type="checkbox"
                          checked={selectedClipKeys.includes(`cloud:${row.taskId}`)}
                          onChange={() => toggleClipKey(`cloud:${row.taskId}`)}
                          disabled={!remote}
                          className="h-4 w-4 rounded accent-[var(--color-primary)]"
                          title={remote ? t('history.checkboxMergeOrder') : t('history.checkboxNoPreview')}
                          aria-label={t('history.checkboxAddToMerge')}
                        />
                      </div>
                    )}
                    <div className="aspect-video flex-shrink-0 bg-black sm:w-48">
                      {play ? (
                        <video src={play} controls className="h-full w-full object-contain" preload="metadata" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-[var(--color-text-muted)]">
                          {t('history.cloudNoOutput')}
                          <br />
                          <span className="mt-1 text-[10px] opacity-80">status: {String(row.taskStatus ?? '-')}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-mono text-[var(--color-text-muted)]">{row.taskId}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {row.taskId.startsWith('dreamina-') && (
                              <span className="rounded-full border border-amber-500/35 bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">
                                {t('history.cloudTagDreamina')}
                              </span>
                            )}
                            {row.taskId.startsWith('kling-') && (
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                                {t('history.cloudTagKling')}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text)]">{row.prompt || t('history.noDescription')}</p>
                          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                            {row.createdAt || ''}
                            {row.modelName ? ` · ${row.modelName}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStarCloud(row.taskId)}
                            className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                            title={starred ? t('gallery.unstar') : t('gallery.star')}
                            aria-label={starred ? t('gallery.unstar') : t('gallery.star')}
                          >
                            <StarIcon filled={starred} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCloud(row.taskId)}
                            className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-error)]"
                            title={t('history.removeFromList')}
                            aria-label={t('common.delete')}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                      {remote && (
                        <button
                          type="button"
                          onClick={() => openCloudResult(row)}
                          className="mt-3 inline-flex self-start rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white hover:bg-[var(--color-primary-hover)]"
                        >
                          {t('history.openPreviewAndSave')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'local' && (
        <section className="space-y-4">
          {sortedLocalItems.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-8 text-center">
              <p className="mb-2 text-[var(--color-text-muted)]">{t('history.localEmptyTitle')}</p>
              <p className="mb-4 text-sm text-[var(--color-text-subtle)]">{t('history.localEmptyHint')}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  to="/studio"
                  className="inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                >
                  {t('history.openInStudio')}
                </Link>
                <a
                  href="/studio"
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
                >
                  {t('history.goGenerate')}
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedLocalItems.map((item) => {
                const src = getLocalPlaybackSrc(item);
                const starred = !!item.starred;
                return (
                  <div
                    key={item.taskId}
                    className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] sm:flex-row"
                  >
                    {mergeMode && (
                      <div className="flex shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 px-3 py-2 sm:w-11 sm:items-center sm:border-r sm:border-b-0 sm:py-0">
                        <input
                          type="checkbox"
                          checked={selectedClipKeys.includes(`local:${item.taskId}`)}
                          onChange={() => toggleClipKey(`local:${item.taskId}`)}
                          disabled={!src}
                          className="h-4 w-4 rounded accent-[var(--color-primary)]"
                          title={src ? t('history.checkboxMergeOrder') : t('history.checkboxNoPlayback')}
                          aria-label={t('history.checkboxAddToMerge')}
                        />
                      </div>
                    )}
                    <div className="aspect-video flex-shrink-0 bg-black sm:w-48">
                      {src ? (
                        <video src={src} controls className="h-full w-full object-contain" preload="metadata" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-text-muted)]">
                          {t('gallery.noPreview')}
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            {item.taskId.startsWith('dreamina-') && (
                              <span className="rounded-full border border-amber-500/35 bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">
                                {t('history.cloudTagDreamina')}
                              </span>
                            )}
                            {item.taskId.startsWith('kling-') && !item.taskId.startsWith('dreamina-') && (
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                                {t('history.cloudTagKling')}
                              </span>
                            )}
                          </div>
                          <p className="mb-1 line-clamp-2 text-sm text-[var(--color-text)]">{item.prompt || t('gallery.noPrompt')}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{formatTime(item.createdAt)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStarLocal(item.taskId)}
                            className="rounded-lg p-2 hover:bg-[var(--color-surface-hover)]"
                            title={starred ? t('gallery.unstar') : t('gallery.star')}
                            aria-label={starred ? t('gallery.unstar') : t('gallery.star')}
                          >
                            <StarIcon filled={starred} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveLocal(item.taskId)}
                            className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-error)]"
                            title={t('history.deleteLocalRecord')}
                            aria-label={t('common.delete')}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          to={`/result?taskId=${encodeURIComponent(item.taskId)}`}
                          className="inline-flex rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
                        >
                          {t('gallery.viewDistribute')}
                        </Link>
                        {src && (
                          <a
                            href={src}
                            download={item.videoPath?.split('/').pop() || 'video.mp4'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                          >
                            {t('common.download')}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'batch' && (
        <section className="space-y-4">
          {batchImportBusy && (
            <div className="py-2 text-center text-sm text-[var(--color-text-muted)]">{t('history.importPendingLabel')}</div>
          )}
          <BatchJobsBoard onImportVideo={handleImportBatchVideo} />
        </section>
      )}

      {mergeMode && (
        <section className="mt-6 space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <h2 className="text-sm font-medium text-[var(--color-text)]">{t('history.mergeSettings')}</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            {text('history.mergeSelectedCount', { count: selectedClipKeys.length })}
          </p>

          {selectedClipKeys.length > 0 ? (
            <ol className="list-inside list-decimal space-y-1 text-sm text-[var(--color-text)]">
              {selectedClipKeys.map((key, index) => (
                <li key={key} className="flex flex-wrap items-center gap-2">
                  <span className="max-w-[min(100%,280px)] truncate font-mono text-xs text-[var(--color-text-muted)]">
                    {key}
                  </span>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveClipKey(index, -1)}
                    className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs disabled:opacity-30"
                  >
                    {t('history.moveUp')}
                  </button>
                  <button
                    type="button"
                    disabled={index === selectedClipKeys.length - 1}
                    onClick={() => moveClipKey(index, 1)}
                    className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs disabled:opacity-30"
                  >
                    {t('history.moveDown')}
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">{t('history.mergeClipEmpty')}</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-[var(--color-text-muted)]">
              {t('history.introClipUrl')}
              <input
                type="text"
                value={mergeIntroUrl}
                onChange={(e) => setMergeIntroUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                placeholder={t('history.introClipPlaceholder')}
              />
            </label>
            <label className="block text-xs text-[var(--color-text-muted)]">
              {t('history.outroClipUrl')}
              <input
                type="text"
                value={mergeOutroUrl}
                onChange={(e) => setMergeOutroUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                placeholder={t('history.outroClipPlaceholder')}
              />
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-[var(--color-text-muted)]">{t('history.subtitleLabel')}</span>
            <div className="flex flex-wrap gap-2">
              {([
                ['off', t('history.subtitleOff')],
                ['simple', t('history.subtitleSimple')],
                ['srt', t('history.subtitleSrt')],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMergeSubtitleMode(value)}
                  className={`rounded-lg px-3 py-1 text-xs ${
                    mergeSubtitleMode === value
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'border border-[var(--color-border)] text-[var(--color-text)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {mergeSubtitleMode === 'simple' && (
              <textarea
                value={mergeSimpleText}
                onChange={(e) => setMergeSimpleText(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                placeholder={t('history.simpleSubtitlePlaceholder')}
              />
            )}
            {mergeSubtitleMode === 'srt' && (
              <textarea
                value={mergeSrtText}
                onChange={(e) => setMergeSrtText(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs text-[var(--color-text)]"
                placeholder={t('history.srtPlaceholder')}
              />
            )}
          </div>

          {mergeError && <p className="text-sm text-[var(--color-error)]">{mergeError}</p>}

          <button
            type="button"
            disabled={mergeBusy || selectedClipKeys.length === 0}
            onClick={() => void runMerge()}
            className="inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:pointer-events-none disabled:opacity-50"
          >
            {mergeBusy ? t('history.merging') : t('history.startMergeSaveToLocal')}
          </button>
          <RunningStatus active={mergeBusy} label={t('history.mergeProcessingLabel')} stallAfterSec={30} scene="fine-cut" />
        </section>
      )}
    </div>
  );
}
