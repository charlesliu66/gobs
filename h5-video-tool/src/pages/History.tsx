import { useState, useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from '../components/Toast';
import {
  loadVideoHistory,
  removeVideoFromHistory,
  getLocalPlaybackSrc,
  saveVideoToHistory,
  toggleVideoHistoryStarred,
  type VideoHistoryItem,
} from '../utils/videoHistory';
import {
  loadCloudHiddenIds,
  loadCloudStarredIds,
  toggleCloudStarred,
  hideCloudTask,
} from '../utils/historyPrefs';
import {
  getKlingRecentList,
  klingVideoProxyUrl,
  resolveKlingPlaybackUrl,
  type KlingVideoListRow,
} from '../api/video';
import { pollRemixUntilDone, submitRemixMerge } from '../api/remix';
import { absoluteApiUrl } from '../utils/absoluteApiUrl';
import { BatchJobsBoard } from '../components/BatchJobsBoard';

type HistoryTab = 'cloud' | 'local' | 'batch';

/** 单行通栏字幕（整段约 1 小时），精细时间轴请用 SRT 模式 */
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
  const [mergeSimpleText, setMergeSimpleText] = useState('');
  const [mergeSrtText, setMergeSrtText] = useState('');
  const [mergeBusy, setMergeBusy] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const cloudStarred = useMemo(() => loadCloudStarredIds(), [prefsVersion, cloudItems]);
  const cloudHidden = useMemo(() => loadCloudHiddenIds(), [prefsVersion, cloudItems]);

  useEffect(() => {
    let cancelled = false;
    setCloudLoading(true);
    setCloudError(null);
    getKlingRecentList(1, 20)
      .then((r) => {
        if (!cancelled) {
          setCloudItems(r.items || []);
          setKlingAvailable(!!r.klingAvailable);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : '无法加载可灵云端列表';
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
  }, []);

  const visibleCloudRows = useMemo(() => {
    const filtered = cloudItems.filter((r) => !cloudHidden.has(r.taskId));
    return sortCloudRows(filtered, cloudStarred);
  }, [cloudItems, cloudHidden, cloudStarred]);

  const sortedLocalItems = useMemo(() => sortLocalItems(items), [items]);

  const refreshLocal = useCallback(() => setItems(loadVideoHistory()), []);

  useEffect(() => {
    if (tab === 'local') refreshLocal();
  }, [tab, refreshLocal]);

  const handleRemoveLocal = useCallback(
    (taskId: string) => {
      removeVideoFromHistory(taskId);
      refreshLocal();
    },
    [refreshLocal],
  );

  const handleStarLocal = useCallback(
    (taskId: string) => {
      toggleVideoHistoryStarred(taskId);
      refreshLocal();
    },
    [refreshLocal],
  );

  const handleStarCloud = useCallback((taskId: string) => {
    toggleCloudStarred(taskId);
    setPrefsVersion((v) => v + 1);
  }, []);

  const handleDeleteCloud = useCallback((taskId: string) => {
    hideCloudTask(taskId);
    setPrefsVersion((v) => v + 1);
  }, []);

  const formatTime = (ts: number) => new Date(ts).toLocaleString('zh-CN');

  const openCloudResult = useCallback(
    (row: KlingVideoListRow) => {
      const remote = resolveKlingPlaybackUrl(row);
      if (!remote) return;
      const tid = row.taskId.startsWith('kling-') ? row.taskId : `kling-${row.taskId}`;
      saveVideoToHistory({
        taskId: tid,
        videoPath: '',
        videoUrl: klingVideoProxyUrl(remote),
        prompt: row.prompt || `可灵任务 ${row.taskId}`,
      });
      refreshLocal();
      navigate(`/result?taskId=${encodeURIComponent(tid)}`);
    },
    [navigate, refreshLocal],
  );

  const buildClipUrlForKey = useCallback(
    (key: string): string | null => {
      if (key.startsWith('local:')) {
        const tid = key.slice(6);
        const item = items.find((x) => x.taskId === tid);
        if (!item) return null;
        const src = getLocalPlaybackSrc(item);
        return src ? absoluteApiUrl(src) : null;
      }
      if (key.startsWith('cloud:')) {
        const tid = key.slice(6);
        const row = cloudItems.find((r) => r.taskId === tid);
        if (!row) return null;
        const remote = resolveKlingPlaybackUrl(row);
        return remote ? absoluteApiUrl(klingVideoProxyUrl(remote)) : null;
      }
      return null;
    },
    [items, cloudItems],
  );

  const toggleClipKey = useCallback((key: string) => {
    setSelectedClipKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }, []);

  const moveClipKey = useCallback((index: number, dir: -1 | 1) => {
    setSelectedClipKeys((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      const t = next[index]!;
      next[index] = next[j]!;
      next[j] = t;
      return next;
    });
  }, []);

  const runMerge = useCallback(async () => {
    if (selectedClipKeys.length === 0) {
      setMergeError('请至少勾选一段成片');
      return;
    }
    setMergeError(null);
    const clipUrls: string[] = [];
    for (const key of selectedClipKeys) {
      const u = buildClipUrlForKey(key);
      if (!u) {
        setMergeError(`无法解析成片地址，请取消勾选后重试：${key}`);
        return;
      }
      clipUrls.push(u);
    }
    let subtitles: string | undefined;
    if (mergeSubtitleMode === 'simple' && mergeSimpleText.trim()) {
      subtitles = buildSimpleSrt(mergeSimpleText.trim());
    } else if (mergeSubtitleMode === 'srt' && mergeSrtText.trim()) {
      subtitles = mergeSrtText.trim();
    }
    const introRaw = mergeIntroUrl.trim();
    const outroRaw = mergeOutroUrl.trim();
    const introUrl = introRaw
      ? /^https?:\/\//i.test(introRaw)
        ? introRaw
        : absoluteApiUrl(introRaw)
      : undefined;
    const outroUrl = outroRaw
      ? /^https?:\/\//i.test(outroRaw)
        ? outroRaw
        : absoluteApiUrl(outroRaw)
      : undefined;

    setMergeBusy(true);
    try {
      const { taskId } = await submitRemixMerge({ clipUrls, introUrl, outroUrl, subtitles });
      const outPath = await pollRemixUntilDone(taskId);
      const vp = outPath.startsWith('output/') ? outPath : `output/${outPath}`;
      const newId = `merge-${Date.now()}`;
      saveVideoToHistory({
        taskId: newId,
        videoPath: vp,
        prompt: `合并成片（${clipUrls.length} 段）`,
      });
      refreshLocal();
      setMergeMode(false);
      setSelectedClipKeys([]);
      navigate(`/result?taskId=${encodeURIComponent(newId)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '合并失败';
      toast.error('合并失败：' + msg);
    } finally {
      setMergeBusy(false);
    }
  }, [
    selectedClipKeys,
    buildClipUrlForKey,
    mergeSubtitleMode,
    mergeSimpleText,
    mergeSrtText,
    mergeIntroUrl,
    mergeOutroUrl,
    refreshLocal,
    navigate,
  ]);

  return (
    <div className="max-w-6xl w-full flex flex-col min-h-0">
      {/* 冻结：标题 + Tab + 简短说明 */}
      <div className="sticky top-0 z-30 -mx-4 px-4 sm:mx-0 sm:px-0 pb-3 mb-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md">
        <h1 className="page-title">历史</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('cloud')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'cloud'
                ? 'bg-[var(--color-primary)] text-white'
                : 'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            可灵云端（ingarena）
          </button>
          <button
            type="button"
            onClick={() => setTab('local')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'local'
                ? 'bg-[var(--color-primary)] text-white'
                : 'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            本机历史
          </button>
          <button
            type="button"
            onClick={() => setTab('batch')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'batch'
                ? 'bg-[var(--color-primary)] text-white'
                : 'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            🌙 批量任务看板
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-subtle)] mt-3 max-w-3xl leading-relaxed">
          云端与官网共用 API Key；可<strong>星标</strong>置顶、<strong>删除</strong>仅从当前列表隐藏（不调用远端删任务）。
          「本机历史」含 Studio 生成的 Veo、<strong>即梦</strong>、可灵代理 URL 等；即梦成片优先存本机文件路径以便预览。本机记录保存在浏览器，删除后不可恢复。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMergeMode((m) => {
                if (m) setSelectedClipKeys([]);
                return !m;
              });
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              mergeMode
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            {mergeMode ? '退出合并模式' : '多选合并成片'}
          </button>
          {mergeMode && (
            <span className="text-xs text-[var(--color-text-muted)]">
              在下列条目中勾选多段，顺序以下方列表为准；需本机已安装 ffmpeg 的后端服务。
            </span>
          )}
        </div>
      </div>

      {/* 可灵云端 */}
      {tab === 'cloud' && (
        <section className="space-y-4">
          {cloudLoading && <p className="text-sm text-[var(--color-text-muted)]">加载可灵列表…</p>}
          {cloudError && <p className="text-sm text-[var(--color-error)]">{cloudError}</p>}
          {!cloudLoading && !klingAvailable && !cloudError && (
            <p className="text-sm text-[var(--color-text-muted)]">
              未配置 ingarena 可灵（后端 <code className="text-xs">KLING_API_BASE_URL</code> +{' '}
              <code className="text-xs">KLING_API_KEY</code>
              ），无法同步官网列表。
            </p>
          )}
          {!cloudLoading && klingAvailable && visibleCloudRows.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {cloudItems.length ? '当前列表已清空或已全部隐藏，可刷新页面重新拉取列表' : '云端暂无任务记录'}
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
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] overflow-hidden flex flex-col sm:flex-row"
                  >
                    {mergeMode && (
                      <div className="flex sm:items-center px-3 py-2 sm:py-0 sm:w-11 shrink-0 border-b sm:border-b-0 sm:border-r border-[var(--color-border)] bg-[var(--color-surface)]/50">
                        <input
                          type="checkbox"
                          checked={selectedClipKeys.includes(`cloud:${row.taskId}`)}
                          onChange={() => toggleClipKey(`cloud:${row.taskId}`)}
                          disabled={!remote}
                          className="h-4 w-4 rounded accent-[var(--color-primary)]"
                          title={remote ? '按勾选顺序拼接' : '无成片不可选'}
                          aria-label="勾选加入合并"
                        />
                      </div>
                    )}
                    <div className="sm:w-48 flex-shrink-0 aspect-video bg-black">
                      {play ? (
                        <video src={play} controls className="w-full h-full object-contain" preload="metadata" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-text-muted)] p-2 text-center">
                          无成片或排队中
                          <br />
                          <span className="text-[10px] mt-1 opacity-80">status: {String(row.taskStatus ?? '-')}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-4 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-mono text-[var(--color-text-muted)] truncate">{row.taskId}</p>
                          <p className="text-sm text-[var(--color-text)] line-clamp-2 mt-1">{row.prompt || '（无描述）'}</p>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            {row.createdAt || ''}
                            {row.modelName ? ` · ${row.modelName}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStarCloud(row.taskId)}
                            className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
                            title={starred ? '取消星标' : '星标'}
                            aria-label={starred ? '取消星标' : '星标'}
                          >
                            <StarIcon filled={starred} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCloud(row.taskId)}
                            className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                            title="从列表中移除"
                            aria-label="删除"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                      {remote && (
                        <button
                          type="button"
                          onClick={() => openCloudResult(row)}
                          className="mt-3 self-start inline-flex px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-hover)]"
                        >
                          全屏预览 / 加入本机历史
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

      {/* 本机历史 */}
      {tab === 'local' && (
        <section className="space-y-4">
          {sortedLocalItems.length === 0 ? (
            <div className="p-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-center">
              <p className="text-[var(--color-text-muted)] mb-2">暂无本机生成记录</p>
              <p className="text-sm text-[var(--color-text-subtle)] mb-4">
                在 Studio 内生成成功后会写入此处（含即梦 Dreamina 异步/同步成片）；也可在「可灵云端」打开成片并加入本机历史。
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  to="/studio"
                  className="inline-flex px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-sm font-medium"
                >
                  去 Studio 创作
                </Link>
                <a
                  href="/studio"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-primary)] text-[var(--color-primary)] text-sm hover:bg-[var(--color-primary)]/10 transition-colors"
                >
                  去生成视频 →
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
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] overflow-hidden flex flex-col sm:flex-row"
                  >
                    {mergeMode && (
                      <div className="flex sm:items-center px-3 py-2 sm:py-0 sm:w-11 shrink-0 border-b sm:border-b-0 sm:border-r border-[var(--color-border)] bg-[var(--color-surface)]/50">
                        <input
                          type="checkbox"
                          checked={selectedClipKeys.includes(`local:${item.taskId}`)}
                          onChange={() => toggleClipKey(`local:${item.taskId}`)}
                          disabled={!src}
                          className="h-4 w-4 rounded accent-[var(--color-primary)]"
                          title={src ? '按勾选顺序拼接' : '无预览地址'}
                          aria-label="勾选加入合并"
                        />
                      </div>
                    )}
                    <div className="sm:w-48 flex-shrink-0 aspect-video bg-black">
                      {src ? (
                        <video src={src} controls className="w-full h-full object-contain" preload="metadata" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                          无预览地址
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {item.taskId.startsWith('dreamina-') && (
                              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/35">
                                即梦
                              </span>
                            )}
                            {item.taskId.startsWith('kling-') && !item.taskId.startsWith('dreamina-') && (
                              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                可灵
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--color-text)] line-clamp-2 mb-1">{item.prompt || '无描述'}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{formatTime(item.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStarLocal(item.taskId)}
                            className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)]"
                            title={starred ? '取消星标' : '星标'}
                            aria-label={starred ? '取消星标' : '星标'}
                          >
                            <StarIcon filled={starred} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveLocal(item.taskId)}
                            className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                            title="删除本机记录"
                            aria-label="删除"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Link
                          to={`/result?taskId=${encodeURIComponent(item.taskId)}`}
                          className="inline-flex px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] text-sm font-medium"
                        >
                          查看 / 分发
                        </Link>
                        {src && (
                          <a
                            href={src}
                            download={item.videoPath?.split('/').pop() || 'video.mp4'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex px-3 py-1.5 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] text-sm"
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

      {/* 批量任务看板 */}
      {tab === 'batch' && (
        <section className="space-y-4">
          <BatchJobsBoard />
        </section>
      )}

      {mergeMode && (
        <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 space-y-4">
          <h2 className="text-sm font-medium text-[var(--color-text)]">合并设置</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            已选 {selectedClipKeys.length} 段，顺序如下（可用箭头调整）。可混选「可灵云端」与「本机历史」中的条目。
          </p>
          {selectedClipKeys.length > 0 ? (
            <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--color-text)]">
              {selectedClipKeys.map((key, i) => (
                <li key={key} className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-[var(--color-text-muted)] truncate max-w-[min(100%,280px)]">
                    {key}
                  </span>
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => moveClipKey(i, -1)}
                    className="text-xs px-2 py-0.5 rounded border border-[var(--color-border)] disabled:opacity-30"
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    disabled={i === selectedClipKeys.length - 1}
                    onClick={() => moveClipKey(i, 1)}
                    className="text-xs px-2 py-0.5 rounded border border-[var(--color-border)] disabled:opacity-30"
                  >
                    下移
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">请在上方列表中勾选至少一段成片。</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-[var(--color-text-muted)]">
              片头（可选，URL 或 /api/… 相对路径）
              <input
                type="text"
                value={mergeIntroUrl}
                onChange={(e) => setMergeIntroUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                placeholder="https://… 或 output/intro.mp4"
              />
            </label>
            <label className="block text-xs text-[var(--color-text-muted)]">
              片尾（可选）
              <input
                type="text"
                value={mergeOutroUrl}
                onChange={(e) => setMergeOutroUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                placeholder="https://… 或 output/outro.mp4"
              />
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-[var(--color-text-muted)]">字幕</span>
            <div className="flex flex-wrap gap-2">
              {(['off', 'simple', 'srt'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMergeSubtitleMode(m)}
                  className={`px-3 py-1 rounded-lg text-xs ${
                    mergeSubtitleMode === m
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'border border-[var(--color-border)] text-[var(--color-text)]'
                  }`}
                >
                  {m === 'off' ? '无' : m === 'simple' ? '一行通栏' : 'SRT 全文'}
                </button>
              ))}
            </div>
            {mergeSubtitleMode === 'simple' && (
              <textarea
                value={mergeSimpleText}
                onChange={(e) => setMergeSimpleText(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                placeholder="整段视频显示同一行字幕（烧录）"
              />
            )}
            {mergeSubtitleMode === 'srt' && (
              <textarea
                value={mergeSrtText}
                onChange={(e) => setMergeSrtText(e.target.value)}
                rows={6}
                className="w-full font-mono text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
                placeholder={'1\n00:00:00,000 --> 00:00:05,000\n文案\n'}
              />
            )}
          </div>

          {mergeError && <p className="text-sm text-[var(--color-error)]">{mergeError}</p>}

          <button
            type="button"
            disabled={mergeBusy || selectedClipKeys.length === 0}
            onClick={() => void runMerge()}
            className="inline-flex px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:pointer-events-none"
          >
            {mergeBusy ? '合并处理中…' : '开始合并并写入本机历史'}
          </button>
        </section>
      )}
    </div>
  );
}
