import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCreateFlow } from '../context/CreateFlowContext';
import { RunningStatus } from '../components/RunningStatus';
import {
  fetchAccounts,
  publishVideo,
  fetchTaskDetail,
  type GeelarkAccount,
  type TaskDetail,
} from '../api/geelark';
import { generateCaptionForPost, translateCaptionForPost, type CaptionByPlatformResult } from '../api/promptPolish';
import { getRecentPromptForVideo } from '../utils/videoHistory';
import { toast } from '../components/Toast';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { formatDateTime } from '../i18n/locale.ts';

type CaptionLanguage = 'DEFAULT' | 'EN' | 'CN' | 'TH' | 'ID';

const CAPTION_LANGS: CaptionLanguage[] = ['DEFAULT', 'EN', 'CN', 'TH', 'ID'];

export function TabDistribute() {
  const { videoUrl, videoPath, prompt, taskId } = useCreateFlow();
  const { t, uiLocale } = useLocale();
  const [accounts, setAccounts] = useState<GeelarkAccount[]>([]);
  const [filterRegion, setFilterRegion] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [captionLang, setCaptionLang] = useState<CaptionLanguage>('DEFAULT');
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
        if (cancelled) return;
        setAccounts(list);
        if (list.length > 0) setSelectedIds(new Set([list[0].id]));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('distribute.loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const accountsForPermission = useMemo(() => accounts, [accounts]);

  useEffect(() => {
    const ids = new Set(accountsForPermission.map((account) => account.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)));
      if (next.size === prev.size && [...prev].every((id) => next.has(id))) return prev;
      if (next.size === 0 && accountsForPermission.length > 0) next.add(accountsForPermission[0].id);
      return next;
    });
  }, [accountsForPermission]);

  const loadReport = useCallback(async (nextTaskId: string) => {
    setReportLoading(true);
    setReport(null);
    try {
      const detail = await fetchTaskDetail(nextTaskId);
      setReport(detail);
      return detail;
    } catch (e) {
      setReport({
        id: nextTaskId,
        statusText: t('distribute.reportLoadFailed'),
        failDesc: e instanceof Error ? e.message : t('common.unknown'),
      });
      return null;
    } finally {
      setReportLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!reportTaskId) return;
    void loadReport(reportTaskId);
  }, [loadReport, reportTaskId]);

  const handleGenerateCaption = async () => {
    const raw = (prompt || '').trim() || getRecentPromptForVideo(taskId);
    const hasExisting = caption.trim().length > 0 || hashtags.trim().length > 0;
    if (!raw && !hasExisting) {
      setCaptionGenError(t('distribute.captionRequiresInput'));
      return;
    }

    const selectedAccounts = accountsForPermission.filter((account) => selectedIds.has(account.id));
    const platforms = [...new Set(selectedAccounts.map((account) => account.platform).filter(Boolean))] as string[];
    setCaptionGenLoading(true);
    setCaptionGenError(null);
    setCaptionByPlatform(null);

    try {
      const result = await generateCaptionForPost(raw, platforms.length > 0 ? platforms : undefined, {
        existingCaption: caption.trim() || undefined,
        existingHashtags: hashtags.trim() || undefined,
        language: captionLang === 'DEFAULT' ? 'EN' : captionLang,
        videoPath: videoPath || undefined,
        videoUrl: videoUrl || undefined,
        accountContext: selectedAccounts.map((account) => ({
          id: account.id,
          username: account.username,
          platform: account.platform,
          region: account.region,
          remark: account.remark,
        })),
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
      setCaptionGenError(e instanceof Error ? e.message : t('quickfilm.processingGenericError'));
    } finally {
      setCaptionGenLoading(false);
    }
  };

  const handleUsePlatformCaption = (nextCaption: string, nextHashtags: string) => {
    setCaption(nextCaption);
    setHashtags(nextHashtags);
  };

  const handleLanguageChange = async (lang: CaptionLanguage) => {
    if (lang === captionLang) return;
    setCaptionLang(lang);
    if (lang === 'DEFAULT') return;

    const hasContent = caption.trim().length > 0 || hashtags.trim().length > 0;
    if (!hasContent) return;

    setCaptionGenLoading(true);
    setCaptionGenError(null);
    try {
      const result = await translateCaptionForPost(caption, hashtags, lang);
      setCaption(result.caption);
      setHashtags(result.hashtags);
    } catch (e) {
      setCaptionGenError(e instanceof Error ? e.message : t('distribute.translationFailed'));
    } finally {
      setCaptionGenLoading(false);
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
      setPushError(t('distribute.pushRequiresVideo'));
      return;
    }
    if (selectedIds.size === 0) {
      setPushError(t('distribute.pushRequiresAccount'));
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
      if (taskIds?.length) setReportTaskId(taskIds[0]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('distribute.pushFailed');
      toast.error(`${t('distribute.pushFailed')}: ${msg}`);
    } finally {
      setPushing(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (seconds == null) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '-';
    return formatDateTime(ts * 1000, uiLocale);
  };

  const captionLanguageLabel = (lang: CaptionLanguage) => {
    if (lang === 'DEFAULT') return t('distribute.captionLanguageDefault');
    return lang;
  };

  const regions = [...new Set(accountsForPermission.map((account) => account.region).filter(Boolean))] as string[];
  const platforms = [...new Set(accountsForPermission.map((account) => account.platform).filter(Boolean))] as string[];
  const filteredAccounts = accountsForPermission.filter((account) => {
    if (filterRegion && account.region !== filterRegion) return false;
    if (filterPlatform && account.platform !== filterPlatform) return false;
    return true;
  });

  return (
    <div className="max-w-6xl w-full space-y-6">
      <div>
        <h1 className="page-title">{t('distribute.title')}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t('distribute.subtitle')}</p>
      </div>

      <section className="mb-6">
        <h2 className="section-title">{t('distribute.targetAccounts')}</h2>
        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">{t('distribute.loadingAccounts')}</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        ) : accounts.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 text-center space-y-3">
            <p className="text-2xl">📫</p>
            <p className="text-sm font-medium text-[var(--color-text)]">{t('distribute.noAccountsTitle')}</p>
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
              {t('distribute.noAccountsHintLine1')}<br />
              {t('distribute.noAccountsHintLine2')}
            </p>
            <a
              href="https://geelark.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline"
            >
              {t('distribute.learnGeelark')} →
            </a>
          </div>
        ) : accountsForPermission.length === 0 ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center space-y-2">
            <p className="text-sm font-medium text-[var(--color-text)]">{t('distribute.noPermissionTitle')}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{t('distribute.noPermissionHint')}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
            {(regions.length > 0 || platforms.length > 0) && (
              <div className="mb-4 flex flex-wrap gap-3">
                {regions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)]">{t('distribute.region')}</span>
                    <select
                      value={filterRegion}
                      onChange={(e) => setFilterRegion(e.target.value)}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
                    >
                      <option value="">{t('common.all')}</option>
                      {regions.map((region) => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                )}
                {platforms.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)]">{t('distribute.platform')}</span>
                    <select
                      value={filterPlatform}
                      onChange={(e) => setFilterPlatform(e.target.value)}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
                    >
                      <option value="">{t('common.all')}</option>
                      {platforms.map((platform) => (
                        <option key={platform} value={platform}>{platform}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {filteredAccounts.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">{t('distribute.noMatchedAccounts')}</p>
              ) : (
                filteredAccounts.map((account) => (
                  <label key={account.id} className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(account.id)}
                      onChange={() => handleToggleAccount(account.id)}
                      className="rounded border-[var(--color-border)]"
                    />
                    <span className="text-sm font-medium text-[var(--color-text)]">{account.username}</span>
                    {account.remark && <span className="text-xs text-[var(--color-text-muted)]">({account.remark})</span>}
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="section-title">{t('distribute.videoAndCaption')}</h2>
        {videoUrl ? (
          <>
            <div className="space-y-4">
              <div className="aspect-video max-h-48 overflow-hidden rounded-lg border border-[var(--color-border)] bg-black">
                <video src={videoUrl} controls className="h-full w-full object-contain" />
              </div>

              <div className="mb-1 flex items-center justify-between gap-3">
                <label className="text-xs text-[var(--color-text-muted)]">{t('distribute.caption')}</label>
                <div className="flex items-center gap-2">
                  {CAPTION_LANGS.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => void handleLanguageChange(lang)}
                      disabled={captionGenLoading}
                      className={`rounded px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                        captionLang === lang
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                      }`}
                    >
                      {captionLanguageLabel(lang)}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => void handleGenerateCaption()}
                    disabled={
                      captionGenLoading ||
                      (!(prompt?.trim()) && !getRecentPromptForVideo(taskId) && !caption.trim() && !hashtags.trim())
                    }
                    className="text-xs text-[var(--color-primary)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {captionGenLoading
                      ? t('distribute.generatingCaption')
                      : (caption.trim() || hashtags.trim())
                        ? t('distribute.polishCaption')
                        : t('distribute.generateCaption')}
                  </button>

                  <RunningStatus
                    active={captionGenLoading}
                    label={t('distribute.generatingCaptionStatus')}
                    stallAfterSec={15}
                    scene="on-tour"
                  />
                </div>
              </div>

              <p className="mb-1 text-[10px] leading-snug text-[var(--color-text-subtle)]">
                {t('distribute.captionHint')}
              </p>

              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t('distribute.captionPlaceholder')}
                rows={2}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none"
              />

              {captionGenError && (
                <p className="mt-1 text-xs text-[var(--color-error)]">{captionGenError}</p>
              )}

              <div>
                <label className="mb-1 block text-xs text-[var(--color-text-muted)]">{t('distribute.hashtags')}</label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder={t('distribute.hashtagsPlaceholder')}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none"
                />
              </div>
            </div>

            {captionByPlatform && Object.keys(captionByPlatform).length > 0 && (
              <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <h4 className="text-xs font-medium text-[var(--color-text-muted)]">{t('distribute.captionByPlatform')}</h4>
                <div className="space-y-2">
                  {Object.entries(captionByPlatform).map(([platform, { caption: nextCaption, hashtags: nextHashtags }]) => (
                    <div
                      key={platform}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2 text-sm"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium uppercase text-[var(--color-primary)]">{platform}</span>
                        <button
                          type="button"
                          onClick={() => handleUsePlatformCaption(nextCaption, nextHashtags)}
                          className="text-xs text-[var(--color-primary)] hover:underline"
                        >
                          {t('distribute.useCaption')}
                        </button>
                      </div>
                      <p className="break-words text-xs text-[var(--color-text)]">{nextCaption || '—'}</p>
                      {nextHashtags && (
                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{nextHashtags}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-8 text-center">
            <p className="mb-4 text-[var(--color-text-muted)]">{t('distribute.noVideo')}</p>
            <Link
              to="/studio"
              className="inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              {t('distribute.goToStudio')}
            </Link>
          </div>
        )}
      </section>

      {videoUrl && (
        <section className="mb-6">
          <button
            type="button"
            onClick={() => void handlePush()}
            disabled={pushing || selectedIds.size === 0}
            className="rounded-lg bg-[var(--color-primary)] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pushing ? t('distribute.publishing') : t('distribute.publish')}
          </button>
          {pushError && <p className="mt-2 text-sm text-[var(--color-error)]">{pushError}</p>}
        </section>
      )}

      {reportTaskId && (
        <ReportModal
          report={report}
          loading={reportLoading}
          onRefresh={() => void loadReport(reportTaskId)}
          onClose={() => setReportTaskId(null)}
          formatDuration={formatDuration}
          formatTime={formatTime}
        />
      )}
    </div>
  );
}

interface ReportModalProps {
  report: TaskDetail | null;
  loading: boolean;
  onRefresh: () => void;
  onClose: () => void;
  formatDuration: (seconds?: number) => string;
  formatTime: (ts?: number) => string;
}

function ReportModal({ report, loading, onRefresh, onClose, formatDuration, formatTime }: ReportModalProps) {
  const { t } = useLocale();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-[var(--color-surface-elevated)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <h2 className="page-title text-lg">{t('distribute.reportTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
            aria-label={t('common.close')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 p-4">
          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">{t('distribute.reportLoading')}</p>
          ) : report ? (
            <>
              <section>
                <h3 className="section-title">{t('distribute.reportInfo')}</h3>
                <div className="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">{t('distribute.reportId')}</span>
                    <span className="font-mono text-[var(--color-text)]">{report.id}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">{t('distribute.reportStatus')}</span>
                    <span className="text-[var(--color-text)]">{report.statusText ?? report.status}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">{t('distribute.reportPlanName')}</span>
                    <span className="text-[var(--color-text)]">{report.planName ?? '-'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">{t('distribute.reportDuration')}</span>
                    <span className="text-[var(--color-text)]">{formatDuration(report.cost)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">{t('distribute.reportTime')}</span>
                    <span className="text-[var(--color-text)]">{formatTime(report.scheduleAt)}</span>
                  </div>
                  {report.failDesc && (
                    <div className="border-t border-[var(--color-border)] pt-2">
                      <span className="text-[var(--color-error)]">{report.failDesc}</span>
                    </div>
                  )}
                </div>
              </section>

              {report.resultImages && report.resultImages.length > 0 && (
                <section>
                  <h3 className="section-title">{t('distribute.reportScreenshots')}</h3>
                  <div className="space-y-2">
                    {report.resultImages.map((img, index) => (
                      <img
                        key={index}
                        src={img}
                        alt={`result-${index + 1}`}
                        className="max-h-80 w-full rounded-lg border border-[var(--color-border)] bg-black object-contain"
                      />
                    ))}
                  </div>
                </section>
              )}

              {report.status === 2 && (
                <p className="text-sm text-[var(--color-text-muted)]">{t('distribute.reportRunning')}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">{t('distribute.reportUnavailable')}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
            >
              {t('common.refresh')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white hover:bg-[var(--color-primary-hover)]"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
