import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCreateFlow } from '../context/CreateFlowContext';
import {
  fetchAccounts,
  publishVideo,
  fetchTaskDetail,
  type GeelarkAccount,
  type TaskDetail,
} from '../api/geelark';
import { generateCaptionForPost, translateCaptionForPost, type CaptionByPlatformResult } from '../api/promptPolish';
import { getRecentPromptForVideo } from '../utils/videoHistory';

export function TabDistribute() {
  const { videoUrl, videoPath, prompt, taskId } = useCreateFlow();
  const [accounts, setAccounts] = useState<GeelarkAccount[]>([]);
  const [filterRegion, setFilterRegion] = useState<string>('');
  const [filterPlatform, setFilterPlatform] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [captionLang, setCaptionLang] = useState<'DEFAULT' | 'EN' | 'CN' | 'TH' | 'ID'>('DEFAULT');
  const [captionByPlatform, setCaptionByPlatform] = useState<CaptionByPlatformResult['byPlatform'] | null>(null);
  const [captionGenLoading, setCaptionGenLoading] = useState(false);
  const [captionGenError, setCaptionGenError] = useState<string | null>(null);
  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [reportTaskId, setReportTaskId] = useState<string | null>(null);
  const [report, setReport] = useState<TaskDetail | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAccounts()
      .then((list) => {
        if (!cancelled) {
          setAccounts(list);
          if (list.length) setSelectedIds(new Set([list[0].id]));
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const loadReport = useCallback(async (taskId: string) => {
    setReportLoading(true);
    setReport(null);
    try {
      const detail = await fetchTaskDetail(taskId);
      setReport(detail);
      return detail;
    } catch (e) {
      setReport({ id: taskId, statusText: '加载失败', failDesc: e instanceof Error ? e.message : '未知错误' });
      return null;
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!reportTaskId) return;
    loadReport(reportTaskId);
  }, [reportTaskId, loadReport]);

  const handleGenerateCaption = async () => {
    const raw = (prompt || '').trim() || getRecentPromptForVideo(taskId);
    const hasExisting = (caption || '').trim().length > 0 || (hashtags || '').trim().length > 0;
    if (!raw && !hasExisting) {
      setCaptionGenError('请先在 Studio 输入 prompt、或完成一次视频生成，或在文案/标签中填写待优化内容');
      return;
    }
    const selectedAccounts = accounts.filter((a) => selectedIds.has(a.id));
    const platforms = [...new Set(selectedAccounts.map((a) => a.platform).filter(Boolean))] as string[];
    setCaptionGenLoading(true);
    setCaptionGenError(null);
    setCaptionByPlatform(null);
    try {
      const result = await generateCaptionForPost(raw, platforms.length > 0 ? platforms : undefined, {
        existingCaption: caption?.trim() || undefined,
        existingHashtags: hashtags?.trim() || undefined,
        language: captionLang === 'DEFAULT' ? 'EN' : captionLang,
      });
      if ('byPlatform' in result && result.byPlatform) {
        setCaptionByPlatform(result.byPlatform);
        const first = Object.values(result.byPlatform)[0];
        if (first) {
          setCaption(first.caption);
          setHashtags(first.hashtags);
        }
      } else if ('caption' in result) {
        setCaption(result.caption);
        setHashtags(result.hashtags);
      }
    } catch (e) {
      setCaptionGenError(e instanceof Error ? e.message : '生成失败');
    } finally {
      setCaptionGenLoading(false);
    }
  };

  const handleUsePlatformCaption = (c: string, h: string) => {
    setCaption(c);
    setHashtags(h);
  };

  const handleLanguageChange = async (lang: 'DEFAULT' | 'EN' | 'CN' | 'TH' | 'ID') => {
    if (lang === captionLang) return;
    setCaptionLang(lang);
    if (lang === 'DEFAULT') return; // 默认不翻译
    const hasContent = (caption || '').trim().length > 0 || (hashtags || '').trim().length > 0;
    if (hasContent) {
      setCaptionGenLoading(true);
      setCaptionGenError(null);
      try {
        const result = await translateCaptionForPost(caption, hashtags, lang);
        setCaption(result.caption);
        setHashtags(result.hashtags);
      } catch (e) {
        setCaptionGenError(e instanceof Error ? e.message : '翻译失败');
      } finally {
        setCaptionGenLoading(false);
      }
    }
  };

  const handleToggleAccount = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePush = async () => {
    if (!videoUrl && !videoPath) {
      setPushError('请先在 Studio 生成视频');
      return;
    }
    if (selectedIds.size === 0) {
      setPushError('请选择至少一个目标账号');
      return;
    }
    setPushing(true);
    setPushError(null);
    try {
      const { taskIds } = await publishVideo({
        videoPath: videoPath || undefined,
        videoUrl: videoPath ? undefined : videoUrl ?? undefined,
        accountIds: Array.from(selectedIds),
        caption: caption.trim() || undefined,
        hashtags: hashtags.trim() || undefined,
      });
      if (taskIds?.length) {
        setReportTaskId(taskIds[0]);
      }
    } catch (e) {
      setPushError(e instanceof Error ? e.message : '推送失败');
    } finally {
      setPushing(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (seconds == null) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '-';
    return new Date(ts * 1000).toLocaleString('zh-CN');
  };

  const regions = [...new Set(accounts.map((a) => a.region).filter(Boolean))] as string[];
  const platforms = [...new Set(accounts.map((a) => a.platform).filter(Boolean))] as string[];
  const filteredAccounts = accounts.filter((a) => {
    if (filterRegion && a.region !== filterRegion) return false;
    if (filterPlatform && a.platform !== filterPlatform) return false;
    return true;
  });

  return (
    <div className="max-w-6xl w-full space-y-6">
      <h1 className="page-title">视频分发</h1>

      {/* TT 账号列表 */}
      <section className="mb-6">
        <h2 className="section-title">选择目标账号</h2>
        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">加载中…</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">暂无账号，请配置 config/geelark-accounts.json（参考 geelark-accounts.json.example）</p>
        ) : (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
            {(regions.length > 0 || platforms.length > 0) && (
              <div className="flex flex-wrap gap-3 mb-4">
                {regions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)]">地区</span>
                    <select
                      value={filterRegion}
                      onChange={(e) => setFilterRegion(e.target.value)}
                      className="px-2 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm focus:border-[var(--color-border-focus)] focus:outline-none"
                    >
                      <option value="">全部</option>
                      {regions.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}
                {platforms.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)]">平台</span>
                    <select
                      value={filterPlatform}
                      onChange={(e) => setFilterPlatform(e.target.value)}
                      className="px-2 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm focus:border-[var(--color-border-focus)] focus:outline-none"
                    >
                      <option value="">全部</option>
                      {platforms.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              {filteredAccounts.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">无匹配账号，请调整筛选条件</p>
              ) : (
                filteredAccounts.map((a) => (
                  <label key={a.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(a.id)}
                      onChange={() => handleToggleAccount(a.id)}
                      className="rounded border-[var(--color-border)]"
                    />
                    <span className="text-sm text-[var(--color-text)] font-medium">{a.username}</span>
                    {a.remark && (
                      <span className="text-xs text-[var(--color-text-muted)]">({a.remark})</span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      {/* 视频与文案 */}
      <section className="mb-6">
        <h2 className="section-title">视频与文案</h2>
        {videoUrl ? (
          <>
          <div className="space-y-4">
            <div className="rounded-lg overflow-hidden border border-[var(--color-border)] bg-black aspect-video max-h-48">
              <video src={videoUrl} controls className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center justify-between gap-3 mb-1">
              <label className="text-xs text-[var(--color-text-muted)]">文案</label>
              <div className="flex items-center gap-2">
                {(['DEFAULT', 'EN', 'CN', 'TH', 'ID'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleLanguageChange(lang)}
                    disabled={captionGenLoading}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                      captionLang === lang
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    {lang === 'DEFAULT' ? '默认' : lang}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleGenerateCaption}
                  disabled={
                    captionGenLoading ||
                    (!(prompt?.trim()) && !getRecentPromptForVideo(taskId) && !(caption?.trim()) && !(hashtags?.trim()))
                  }
                  className="text-xs text-[var(--color-primary)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {captionGenLoading ? '生成中…' : (caption?.trim() || hashtags?.trim()) ? '一键优化' : '一键生成'}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-[var(--color-text-subtle)] leading-snug mb-1">
              基于 Studio 创意 / 历史 prompt，按 TikTok 易火公式改写（钩子、口语、标签组合），不会直接粘贴分镜长 prompt。需后端配置 GEMINI_API_KEY。
            </p>
            <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Ronin edit - Gold and Glory"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none resize-none"
              />
              {captionGenError && (
                <p className="text-xs text-[var(--color-error)] mt-1">{captionGenError}</p>
              )}
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">标签</label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#fyp #viral #ronin"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none"
              />
            </div>
          </div>
            {captionByPlatform && Object.keys(captionByPlatform).length > 0 && (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-3">
                <h4 className="text-xs font-medium text-[var(--color-text-muted)]">各平台优化文案（可选用）</h4>
                <div className="space-y-2">
                  {Object.entries(captionByPlatform).map(([platform, { caption: c, hashtags: h }]) => (
                    <div
                      key={platform}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2 text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[var(--color-primary)] uppercase">{platform}</span>
                        <button
                          type="button"
                          onClick={() => handleUsePlatformCaption(c, h)}
                          className="text-xs text-[var(--color-primary)] hover:underline"
                        >
                          使用此文案
                        </button>
                      </div>
                      <p className="text-[var(--color-text)] text-xs break-words">{c || '—'}</p>
                      {h && <p className="text-[var(--color-text-muted)] text-xs mt-0.5">{h}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-center">
            <p className="text-[var(--color-text-muted)] mb-4">暂无成片，请先在 Studio 生成视频</p>
            <Link
              to="/studio"
              className="inline-flex px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-sm font-medium"
            >
              去 Studio 创作
            </Link>
          </div>
        )}
      </section>

      {/* 推送按钮 */}
      {videoUrl && (
        <section className="mb-6">
          <button
            type="button"
            onClick={handlePush}
            disabled={pushing || selectedIds.size === 0}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {pushing ? '发布中…' : '一键发布'}
          </button>
          {pushError && (
            <p className="mt-2 text-sm text-[var(--color-error)]">{pushError}</p>
          )}
        </section>
      )}

      {/* 运行报告弹窗 */}
      {reportTaskId && (
        <ReportModal
          taskId={reportTaskId}
          report={report}
          loading={reportLoading}
          onRefresh={() => loadReport(reportTaskId)}
          onClose={() => setReportTaskId(null)}
          formatDuration={formatDuration}
          formatTime={formatTime}
        />
      )}
    </div>
  );
}

interface ReportModalProps {
  taskId: string;
  report: TaskDetail | null;
  loading: boolean;
  onRefresh: () => void;
  onClose: () => void;
  formatDuration: (s?: number) => string;
  formatTime: (ts?: number) => string;
}

function ReportModal({ taskId: _taskId, report, loading, onRefresh, onClose, formatDuration, formatTime }: ReportModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-[var(--color-surface-elevated)] rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          <h2 className="page-title text-lg">运行报告</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">加载中…</p>
          ) : report ? (
            <>
              {/* 运行信息 */}
              <section>
                <h3 className="section-title">运行信息</h3>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">运行 ID</span>
                    <span className="text-[var(--color-text)] font-mono">{report.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">运行状态</span>
                    <span className="text-[var(--color-text)]">{report.statusText ?? report.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">计划名称</span>
                    <span className="text-[var(--color-text)]">{report.planName ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">运行耗时</span>
                    <span className="text-[var(--color-text)]">{formatDuration(report.cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">运行时间</span>
                    <span className="text-[var(--color-text)]">{formatTime(report.scheduleAt)}</span>
                  </div>
                  {report.failDesc && (
                    <div className="pt-2 border-t border-[var(--color-border)]">
                      <span className="text-[var(--color-error)]">{report.failDesc}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* 任务结束截图 */}
              {report.resultImages && report.resultImages.length > 0 && (
                <section>
                  <h3 className="section-title">任务结束截图</h3>
                  <div className="space-y-2">
                    {report.resultImages.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`截图 ${i + 1}`}
                        className="w-full rounded-lg border border-[var(--color-border)] max-h-80 object-contain bg-black"
                      />
                    ))}
                  </div>
                </section>
              )}

              {report.status === 2 && (
                <p className="text-sm text-[var(--color-text-muted)]">
                  任务执行中，请稍后点击刷新查看最新状态和截图
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">无法加载报告</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] disabled:opacity-50 text-sm"
            >
              刷新
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] text-sm"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
