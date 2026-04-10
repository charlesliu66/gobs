import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOutputRecentVideos, type OutputRecentVideoItem } from '../api/video';
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

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function GalleryView() {
  const [tab, setTab] = useState<GalleryTab>('local');
  const [localItems, setLocalItems] = useState<VideoHistoryItem[]>(() => loadVideoHistory());
  const [outputItems, setOutputItems] = useState<OutputRecentVideoItem[]>([]);
  const [outputLoading, setOutputLoading] = useState(false);
  const [outputError, setOutputError] = useState<string | null>(null);

  const refreshLocal = useCallback(() => {
    setLocalItems(loadVideoHistory());
  }, []);

  const loadOutput = useCallback(async () => {
    setOutputLoading(true);
    setOutputError(null);
    try {
      const { items } = await getOutputRecentVideos({ limit: 80, dreaminaOnly: false });
      setOutputItems(items ?? []);
    } catch (e) {
      setOutputError(e instanceof Error ? e.message : '加载失败');
      setOutputItems([]);
    } finally {
      setOutputLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLocal();
  }, [refreshLocal]);

  useEffect(() => {
    if (tab === 'output') void loadOutput();
  }, [tab, loadOutput]);

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
    toast.success('已加入本机历史，可在「本机历史」中预览与下载');
    refreshLocal();
    setTab('local');
  };

  const sortedLocal = [...localItems].sort((a, b) => {
    if (!!a.starred !== !!b.starred) return a.starred ? -1 : 1;
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-text-muted)]">
        此处只收录<strong className="text-[var(--color-text)]">通过本站（Studio / 高级制片）调用本 API 生成</strong>并写入浏览器或服务端 output
        的成片。
        <span className="block mt-2 text-amber-200/90">
          在<strong>即梦 App、即梦网页、剪映里单独生成</strong>的视频<strong>不会自动同步</strong>到本列表；若需集中管理，请在本站「创作」里生成，或把已导出的 mp4
          手动放到后端 <code className="rounded bg-[var(--color-surface)] px-1">output/</code> 文件夹后刷新「服务端 output」。
        </span>
      </p>

      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-2">
        {(
          [
            { id: 'local' as const, label: `本机历史 (${localItems.length})` },
            { id: 'output' as const, label: '服务端 output 成片' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              tab === id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {label}
          </button>
        ))}
        {tab === 'output' && (
          <button
            type="button"
            onClick={() => void loadOutput()}
            disabled={outputLoading}
            className="ml-auto text-xs text-[var(--color-primary)] hover:underline disabled:opacity-50"
          >
            {outputLoading ? '刷新中…' : '刷新列表'}
          </button>
        )}
      </div>

      {tab === 'local' && (
        <section className="space-y-4">
          {sortedLocal.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-12 text-center">
              <p className="mb-2 text-[var(--color-text-muted)]">暂无本机记录</p>
              <p className="mb-4 text-sm text-[var(--color-text-subtle)]">
                在「创作」里一键生成、或在「高级制片」里生成分镜视频后，会自动出现在此处。
              </p>
              <p className="mb-4 text-xs text-amber-200/80 text-left max-w-md mx-auto">
                若只在即梦/剪映客户端里生成、未经过本站，此处不会有记录——请在本站发起生成，或见下方「服务端 output」说明手动放入文件夹。
              </p>
              <Link
                to="/studio"
                className="inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
              >
                去 Studio 创作
              </Link>
              <div className="mt-3">
                <Link to="/studio/production" className="text-sm text-[var(--color-primary)] hover:underline">
                  高级制片 →
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
                            className="rounded-lg p-2 text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                            title="删除"
                          >
                            删
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
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
            <p className="font-medium text-[var(--color-text)]">和「本机历史」的区别</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                <strong className="text-[var(--color-text)]">即梦官方 App/网页里生成的成片</strong>
                与本项目<strong>没有自动同步</strong>；只有经本站接口触发的即梦流水线会进入历史或 output。
              </li>
              <li>
                <strong className="text-[var(--color-text)]">经本站生成成功后，优先在「本机历史」里看</strong>
                （浏览器记下 taskId / 链接或后端返回路径）。不必先有磁盘文件列表。
              </li>
              <li>
                本标签页只扫<strong className="text-[var(--color-text)]">后端进程所在机器</strong>上的目录：
                <code className="mx-0.5 rounded bg-[var(--color-surface-elevated)] px-1">{'<API_DATA_DIR>/output'}</code>
                （或环境变量 <code className="rounded px-1">VIDEO_OUTPUT_DIR</code>）。仅当接口把成片<strong>成功落盘</strong>到该目录下时才会出现。
              </li>
              <li>
                若落盘失败（控制台可能有「保存到 output/ 失败」），仍可能只有远程 URL，此时列表为空，但「本机历史」里仍可播放。
              </li>
            </ul>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            前端须请求到<strong>同一台</strong>跑 API 的服务器（正确配置 <code className="rounded px-1">VITE_API_BASE_URL</code>
            ），否则列出的目录与你本机即梦输出不一致。
          </p>
          {outputError && <p className="text-sm text-red-400">{outputError}</p>}
          {outputLoading && !outputItems.length ? (
            <p className="text-sm text-[var(--color-text-muted)]">加载中…</p>
          ) : outputItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 p-6 text-sm text-[var(--color-text-muted)]">
              <p className="mb-2">当前后端 <code className="rounded bg-[var(--color-surface)] px-1">output/</code> 下未发现视频文件。</p>
              <p className="mb-2">请在后端仓库旁检查是否存在成片（默认 <code className="rounded px-1">h5-video-tool-api/output</code>，若设置了{' '}
                <code className="rounded px-1">API_DATA_DIR</code> 则为该目录下的 <code className="rounded px-1">output</code>）。
              </p>
              <p className="mb-3">
                若你已在 Studio 里生成过即梦视频，请到左侧「<strong className="text-[var(--color-text)]">本机历史</strong>」查看；若本机历史也为 0，说明当前浏览器尚未成功写入历史（需在同一站点完成一次生成，或未被隐私模式/清理缓存清空）。
              </p>
              <p>
                若成片仅在<strong className="text-[var(--color-text)]">即梦独立客户端</strong>里：请导出 mp4 后复制到运行 API 的机器上的{' '}
                <code className="rounded bg-[var(--color-surface)] px-1">output/</code> 目录，再点「刷新列表」；或改为在本站「创作」里用即梦模型生成一次。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {outputItems.map((row) => {
                const playUrl = getVideoFileUrl(row.path);
                const isDreamina = row.path.toLowerCase().includes('dreamina');
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
                            即梦/output
                          </span>
                        )}
                        <span className="font-mono text-xs text-[var(--color-text-muted)] break-all">{row.path}</span>
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
                          加入本机历史
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
