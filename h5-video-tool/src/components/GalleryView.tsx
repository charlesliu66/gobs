import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getOutputRecentVideos,
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
  const outputAutoSyncStartedRef = useRef(false);

  const refreshLocal = useCallback(() => {
    setLocalItems(loadVideoHistory());
  }, []);

  const loadOutput = useCallback(async () => {
    setOutputLoading(true);
    setOutputError(null);
    try {
      const { items } = await getOutputRecentVideos({ limit: 80, dreaminaOnly: false });
      setOutputItems(items ?? []);
    } catch (error) {
      setOutputError(error instanceof Error ? error.message : '加载失败');
      setOutputItems([]);
    } finally {
      setOutputLoading(false);
    }
  }, []);

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
    toast.success('已保存到「我的成片」');
    refreshLocal();
    setTab('local');
  };

  const sortedLocal = [...localItems].sort((a, b) => {
    if (!!a.starred !== !!b.starred) return a.starred ? -1 : 1;
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });

  const refreshOutputNow = () => {
    void loadOutput();
    void syncOutput();
  };

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
              tip: '展示服务端 output 目录中的视频文件，并可在后台补同步即梦最近成片。',
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
          {outputError && <p className="text-sm text-red-400">{outputError}</p>}
          {outputSyncing && (
            <p className="text-sm text-[var(--color-text-muted)]">正在同步即梦后台最近成片，完成后会自动刷新列表。</p>
          )}
          {outputLoading && !outputItems.length ? (
            <p className="text-sm text-[var(--color-text-muted)]">加载中...</p>
          ) : outputItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 p-12 text-center">
              <p className="mb-1 text-base font-medium text-[var(--color-text-muted)]">服务端暂时没有视频文件</p>
              <p className="mb-5 text-sm text-[var(--color-text-subtle)]">可以先刷新列表，系统会顺手同步即梦后台最近成片。</p>
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
              {outputItems.map((row) => {
                const playUrl = getVideoFileUrl(row.path);
                const isDreamina = row.path.toLowerCase().includes('dreamina');
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
                        {isDreamina && (
                          <span className="rounded-full border border-amber-500/35 bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">
                            即梦
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
                        <button
                          type="button"
                          onClick={() => addOutputToLocal(row)}
                          className="inline-flex rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
                        >
                          保存到我的成片
                        </button>
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
