import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getOutputRecentVideos,
  hideOutputRecentVideo,
  restoreOutputRecentVideo,
  syncOutputRecentDreaminaVideos,
  type OutputRecentVideoItem,
} from '../api/video';
import {
  loadVideoHistory,
  saveVideoToHistory,
  removeVideoFromHistory,
  toggleVideoHistoryStarred,
  getLocalPlaybackSrc,
  getVideoFileUrl,
  type VideoHistoryItem,
} from '../utils/videoHistory';
import {
  filterOutputItemsBySavedState,
  inferOutputSourceLabel,
  type OutputGalleryDaysFilter,
  type OutputGallerySavedFilter,
  type OutputGallerySource,
  type OutputGalleryView,
} from './outputGalleryUtils';
import { toast } from './Toast';

type GalleryTab = 'local' | 'output';

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleString('zh-CN');
  } catch {
    return '';
  }
}

function formatOutputFilename(videoPath: string): string {
  const base = videoPath.split('/').pop() || videoPath;
  const dreaminaMatch = base.match(/dreamina[_-]([0-9a-f]{8,})[_-](\d{10,13})/i);
  if (dreaminaMatch) {
    const ts = Number(dreaminaMatch[2]);
    const date = new Date(ts > 1e12 ? ts : ts * 1000);
    return `即梦成片 · ${date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }
  return base.replace(/[_-][0-9a-f]{16,}\.(mp4|mov|webm|mkv)$/i, '.$1');
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative ml-1 inline-flex items-center group">
      <span className="flex h-4 w-4 select-none items-center justify-center rounded-full border border-[var(--color-text-subtle)] text-[10px] text-[var(--color-text-subtle)]">
        ?
      </span>
      <span className="pointer-events-none absolute bottom-6 left-1/2 z-50 w-56 -translate-x-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-muted)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

export function GalleryView() {
  const [tab, setTab] = useState<GalleryTab>('local');
  const [localItems, setLocalItems] = useState<VideoHistoryItem[]>(() => loadVideoHistory());
  const [outputItems, setOutputItems] = useState<OutputRecentVideoItem[]>([]);
  const [outputLoading, setOutputLoading] = useState(false);
  const [outputSyncing, setOutputSyncing] = useState(false);
  const [outputError, setOutputError] = useState<string | null>(null);
  const [outputHiddenCount, setOutputHiddenCount] = useState(0);
  const [outputQuery, setOutputQuery] = useState('');
  const [outputSourceFilter, setOutputSourceFilter] = useState<'all' | OutputGallerySource>('all');
  const [outputDaysFilter, setOutputDaysFilter] = useState<OutputGalleryDaysFilter>('all');
  const [outputSavedFilter, setOutputSavedFilter] = useState<OutputGallerySavedFilter>('all');
  const [outputView, setOutputView] = useState<OutputGalleryView>('visible');
  const outputAutoSyncStartedRef = useRef(false);
  const deferredOutputQuery = useDeferredValue(outputQuery.trim());

  const refreshLocal = useCallback(() => {
    setLocalItems(loadVideoHistory());
  }, []);

  const loadOutput = useCallback(async () => {
    setOutputLoading(true);
    setOutputError(null);
    try {
      const { items, hiddenCount } = await getOutputRecentVideos({
        limit: 80,
        dreaminaOnly: false,
        q: deferredOutputQuery,
        source: outputSourceFilter,
        days: outputDaysFilter,
        view: outputView,
      });
      setOutputItems(items ?? []);
      setOutputHiddenCount(hiddenCount ?? 0);
    } catch (error) {
      setOutputError(error instanceof Error ? error.message : '加载失败');
      setOutputItems([]);
      setOutputHiddenCount(0);
    } finally {
      setOutputLoading(false);
    }
  }, [deferredOutputQuery, outputDaysFilter, outputSourceFilter, outputView]);

  const syncOutput = useCallback(
    async (options?: { silent?: boolean }) => {
      if (outputSyncing) return;
      setOutputSyncing(true);
      setOutputError(null);
      try {
        const result = await syncOutputRecentDreaminaVideos();
        await loadOutput();
        if (result.synced > 0) {
          toast.success(`已从即梦后台同步 ${result.synced} 个新成片`);
        } else if (!options?.silent) {
          toast.success(result.joinedExisting ? '即梦后台同步仍在进行中' : '即梦后台同步完成');
        }
      } catch (error) {
        setOutputError(error instanceof Error ? error.message : '同步失败');
      } finally {
        setOutputSyncing(false);
      }
    },
    [loadOutput, outputSyncing],
  );

  useEffect(() => {
    refreshLocal();
  }, [refreshLocal]);

  useEffect(() => {
    if (tab !== 'output') return;
    void loadOutput();
    if (!outputAutoSyncStartedRef.current) {
      outputAutoSyncStartedRef.current = true;
      void syncOutput({ silent: true });
    }
  }, [tab, loadOutput, syncOutput]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshLocal();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refreshLocal]);

  const handleStar = (taskId: string) => {
    toggleVideoHistoryStarred(taskId);
    refreshLocal();
  };

  const handleRemove = (taskId: string) => {
    removeVideoFromHistory(taskId);
    refreshLocal();
  };

  const addOutputToLocal = (row: OutputRecentVideoItem) => {
    const taskId = `output-file-${row.path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80)}`;
    saveVideoToHistory({
      taskId,
      videoPath: row.path,
      prompt: `[服务端成片] ${row.path}`,
    });
    toast.success('已保存到“我的成片”');
    refreshLocal();
    setTab('local');
  };

  const handleHideOutput = async (row: OutputRecentVideoItem) => {
    try {
      await hideOutputRecentVideo(row.path);
      toast.success('已从当前账号的服务端文件列表中隐藏');
      await loadOutput();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '隐藏失败');
    }
  };

  const handleRestoreOutput = async (row: OutputRecentVideoItem) => {
    try {
      await restoreOutputRecentVideo(row.path);
      toast.success('已恢复到当前账号的服务端文件列表');
      await loadOutput();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '恢复失败');
    }
  };

  const sortedLocal = [...localItems].sort((a, b) => {
    if (!!a.starred !== !!b.starred) return a.starred ? -1 : 1;
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });

  const refreshOutputNow = () => {
    void loadOutput();
    void syncOutput();
  };

  const savedOutputPaths = new Set(
    localItems
      .map((item) => item.videoPath?.trim())
      .filter((item): item is string => !!item),
  );
  const visibleOutputItems = filterOutputItemsBySavedState(outputItems, savedOutputPaths, outputSavedFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-2">
        {(
          [
            {
              id: 'local' as const,
              label: `我的成片 (${localItems.length})`,
              tip: '展示本地保存的成片记录，支持收藏、删除和再次查看。',
            },
            {
              id: 'output' as const,
              label: '服务端文件',
              tip: '展示当前账号目录中的服务端视频文件，并可在后台补同步最近即梦成片。',
            },
          ] as const
        ).map(({ id, label, tip }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-0.5 rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {label}
            <InfoTip text={tip} />
          </button>
        ))}
        {tab === 'output' && (
          <button
            type="button"
            onClick={refreshOutputNow}
            disabled={outputLoading || outputSyncing}
            className="ml-auto text-xs text-[var(--color-primary)] hover:underline disabled:opacity-50"
          >
            {outputSyncing ? '同步中...' : outputLoading ? '加载中...' : '刷新列表'}
          </button>
        )}
      </div>

      {tab === 'local' && (
        <section className="space-y-4">
          {sortedLocal.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-16 text-center">
              <p className="mb-1 text-base font-medium text-[var(--color-text-muted)]">还没有成片</p>
              <p className="mb-6 text-sm text-[var(--color-text-subtle)]">生成完成后会自动出现在这里。</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  to="/studio"
                  className="inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
                >
                  去 Studio 创作
                </Link>
                <Link
                  to="/studio/production"
                  className="inline-flex rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                >
                  高级制片
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedLocal.map((item) => {
                const src = getLocalPlaybackSrc(item);
                const starred = !!item.starred;
                return (
                  <div
                    key={item.taskId}
                    className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] sm:flex-row"
                  >
                    <div className="aspect-video w-full shrink-0 bg-black sm:w-52">
                      {src ? (
                        <video src={src} controls className="h-full w-full object-contain" preload="metadata" />
                      ) : (
                        <div className="flex h-full items-center justify-center px-2 text-center text-xs text-[var(--color-text-muted)]">
                          无预览地址
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            {item.taskId.startsWith('dreamina-') && (
                              <span className="rounded-full border border-amber-500/35 bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">
                                即梦
                              </span>
                            )}
                            {item.prompt?.includes('[高级制片·') && (
                              <span className="rounded-full border border-violet-500/35 bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-200">
                                高级制片
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-3 text-sm text-[var(--color-text)]">{item.prompt || '无描述'}</p>
                          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{formatTime(item.createdAt)}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => handleStar(item.taskId)}
                            className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                            title={starred ? '取消星标' : '星标'}
                          >
                            <StarIcon filled={starred} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(item.taskId)}
                            className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-error)]"
                            title="删除记录"
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
                          查看 / 分发
                        </Link>
                        {src && (
                          <a
                            href={src}
                            download={(item.videoPath || 'video').split('/').pop() || 'video.mp4'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                          >
                            下载
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

      {tab === 'output' && (
        <section className="space-y-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 p-4">
            <p className="text-sm font-medium text-[var(--color-text)]">服务端文件范围说明</p>
            <p className="mt-1 text-xs leading-6 text-[var(--color-text-muted)]">
              默认展示当前 GOBS 账号目录中的服务端成片。首次进入时，系统会在后台补同步最近成功的即梦成片到当前账号目录；隐藏只影响当前账号的展示，不删除服务器文件，也不影响即梦后台。
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-subtle)]">
              <span className="rounded-full border border-[var(--color-border)] px-2 py-1">当前视图：{outputView === 'hidden' ? '已隐藏' : '正常列表'}</span>
              <span className="rounded-full border border-[var(--color-border)] px-2 py-1">已隐藏 {outputHiddenCount} 条</span>
              <span className="rounded-full border border-[var(--color-border)] px-2 py-1">当前结果 {visibleOutputItems.length} 条</span>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                value={outputQuery}
                onChange={(event) => setOutputQuery(event.target.value)}
                placeholder="搜索文件名或路径关键字"
                className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
              />
              <div className="flex flex-wrap gap-2">
                {([
                  ['all', '全部来源'],
                  ['dreamina', '仅即梦'],
                  ['other', '其他成片'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOutputSourceFilter(value)}
                    className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                      outputSourceFilter === value
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {([
                ['all', '全部时间'],
                ['1', '今天'],
                ['7', '近7天'],
                ['30', '近30天'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOutputDaysFilter(value)}
                  className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                    outputDaysFilter === value
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {label}
                </button>
              ))}

              {([
                ['all', '全部保存状态'],
                ['saved', '已保存到我的成片'],
                ['unsaved', '未保存'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOutputSavedFilter(value)}
                  className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                    outputSavedFilter === value
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {label}
                </button>
              ))}

              {([
                ['visible', '正常列表'],
                ['hidden', `已隐藏 (${outputHiddenCount})`],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOutputView(value)}
                  className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                    outputView === value
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {outputError && <p className="text-sm text-red-400">{outputError}</p>}
          {outputSyncing && <p className="text-sm text-[var(--color-text-muted)]">正在后台同步即梦最近成片，完成后会自动刷新列表。</p>}

          {outputLoading && !visibleOutputItems.length ? (
            <p className="text-sm text-[var(--color-text-muted)]">加载中...</p>
          ) : visibleOutputItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 p-12 text-center">
              <p className="mb-1 text-base font-medium text-[var(--color-text-muted)]">
                {outputItems.length === 0 ? (outputView === 'hidden' ? '还没有已隐藏的服务端文件' : '服务端暂时没有匹配的视频文件') : '当前筛选条件下没有结果'}
              </p>
              <p className="mb-5 text-sm text-[var(--color-text-subtle)]">
                {outputView === 'hidden'
                  ? '可以切回正常列表继续浏览，或在这里恢复之前隐藏的文件。'
                  : '可以先刷新列表，系统会顺手同步即梦后台最近成片。'}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={refreshOutputNow}
                  disabled={outputLoading || outputSyncing}
                  className="inline-flex rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
                >
                  {outputSyncing ? '同步中...' : '刷新列表'}
                </button>
                <button
                  type="button"
                  onClick={() => setTab('local')}
                  className="inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
                >
                  查看我的成片
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleOutputItems.map((row) => {
                const playUrl = getVideoFileUrl(row.path);
                const isSaved = savedOutputPaths.has(row.path);
                const displayName = formatOutputFilename(row.path);
                return (
                  <div
                    key={row.path}
                    className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:flex-row"
                  >
                    <div className="aspect-video w-full max-w-md shrink-0 overflow-hidden rounded-lg bg-black">
                      <video src={playUrl} controls className="h-full w-full object-contain" preload="metadata" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${
                            row.source === 'dreamina'
                              ? 'border border-amber-500/35 bg-amber-500/20 text-amber-200'
                              : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-subtle)]'
                          }`}
                        >
                          {inferOutputSourceLabel(row.source)}
                        </span>
                        {isSaved && (
                          <span className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200">
                            已保存到我的成片
                          </span>
                        )}
                        <span className="text-sm font-medium text-[var(--color-text)]">{displayName}</span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {formatTime(row.mtimeMs)} · {(row.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={playUrl}
                          download={row.path.split('/').pop() || 'video.mp4'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                        >
                          下载
                        </a>
                        {!isSaved && outputView !== 'hidden' && (
                          <button
                            type="button"
                            onClick={() => addOutputToLocal(row)}
                            className="inline-flex rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
                          >
                            保存到我的成片
                          </button>
                        )}
                        {outputView === 'hidden' ? (
                          <button
                            type="button"
                            onClick={() => void handleRestoreOutput(row)}
                            className="inline-flex rounded-lg border border-emerald-500/35 px-3 py-1.5 text-sm text-emerald-200 hover:bg-emerald-500/10"
                          >
                            恢复显示
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleHideOutput(row)}
                            className="inline-flex rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                          >
                            仅当前账号隐藏
                          </button>
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
    </div>
  );
}
