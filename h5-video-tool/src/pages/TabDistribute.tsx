import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCreateFlow } from '../context/CreateFlowContext';
import { RunningStatus } from '../components/RunningStatus';
import {
  fetchAccounts,
  publishVideo,
  fetchTaskDetail,
  type GeelarkAccount,
} from '../api/geelark';
import { generateCaptionForPost, translateCaptionForPost, type CaptionByPlatformResult } from '../api/promptPolish';
import { getRecentPromptForVideo } from '../utils/videoHistory';
import { toast } from '../components/Toast';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { formatDateTime } from '../i18n/locale.ts';
import {
  buildLatestPublishBatch,
  getPendingTaskIds,
  isBatchComplete,
  mergeTaskDetailError,
  mergeTaskDetailIntoBatch,
  type LatestPublishBatch,
  type LatestPublishBatchItem,
} from '../utils/geelarkPublishBatch';

type CaptionLanguage = 'DEFAULT' | 'EN' | 'CN' | 'TH' | 'ID';

const CAPTION_LANGS: CaptionLanguage[] = ['DEFAULT', 'EN', 'CN', 'TH', 'ID'];
const BATCH_POLL_MS = 8000;

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
  const [latestBatch, setLatestBatch] = useState<LatestPublishBatch | null>(null);
  const [batchRefreshing, setBatchRefreshing] = useState(false);

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

  const refreshBatch = useCallback(async (batch: LatestPublishBatch | null) => {
    if (!batch) return;
    const pendingTaskIds = getPendingTaskIds(batch);
    if (pendingTaskIds.length === 0) return;

    setBatchRefreshing(true);
    try {
      await Promise.all(
        pendingTaskIds.map(async (currentTaskId) => {
          try {
            const detail = await fetchTaskDetail(currentTaskId);
            setLatestBatch((prev) => (prev ? mergeTaskDetailIntoBatch(prev, currentTaskId, detail) : prev));
          } catch (e) {
            const message = e instanceof Error ? e.message : t('distribute.reportLoadFailed');
            setLatestBatch((prev) => (prev ? mergeTaskDetailError(prev, currentTaskId, message) : prev));
          }
        }),
      );
    } finally {
      setBatchRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    if (!latestBatch || isBatchComplete(latestBatch)) return;
    const timer = window.setTimeout(() => {
      void refreshBatch(latestBatch);
    }, BATCH_POLL_MS);
    return () => window.clearTimeout(timer);
  }, [latestBatch, refreshBatch]);

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
      const result = await publishVideo({
        videoPath: videoPath || undefined,
        videoUrl: videoPath ? undefined : videoUrl ?? undefined,
        accountIds: Array.from(selectedIds),
        caption: caption.trim() || undefined,
        hashtags: hashtags.trim() || undefined,
      });
      const nextBatch = buildLatestPublishBatch(result);
      setLatestBatch(nextBatch);
      if (nextBatch) {
        void refreshBatch(nextBatch);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('distribute.pushFailed');
      toast.error(`${t('distribute.pushFailed')}: ${msg}`);
    } finally {
      setPushing(false);
    }
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
            <p className="text-2xl">馃摣</p>
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
              {t('distribute.learnGeelark')} 鈫?
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
                      <p className="break-words text-xs text-[var(--color-text)]">{nextCaption || '鈥?'}</p>
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
        <section className="mb-6 space-y-3">
          <button
            type="button"
            onClick={() => void handlePush()}
            disabled={pushing || selectedIds.size === 0}
            className="rounded-lg bg-[var(--color-primary)] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pushing ? t('distribute.publishing') : t('distribute.publish')}
          </button>
          {pushError && <p className="text-sm text-[var(--color-error)]">{pushError}</p>}
        </section>
      )}

      {latestBatch && (
        <BatchStatusPanel
          batch={latestBatch}
          refreshing={batchRefreshing}
          onRefresh={() => void refreshBatch(latestBatch)}
          onClear={() => setLatestBatch(null)}
          formatTime={(ts) => formatDateTime(ts, uiLocale)}
        />
      )}
    </div>
  );
}

function getDisplayStatus(item: LatestPublishBatchItem, t: (key: string) => string): string {
  if (item.statusText === 'submit_failed') return t('distribute.batchStatusSubmitFailed');
  if (item.statusText === 'submitted') return t('distribute.batchStatusSubmitted');
  if (item.detail?.statusText) return item.detail.statusText;
  return item.statusText || t('common.unknown');
}

function getStatusTone(item: LatestPublishBatchItem): string {
  if (item.submitError) return 'border-red-500/30 bg-red-500/10 text-red-200';
  const status = Number(item.detail?.status ?? 0);
  if (status === 3) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (status === 4 || status === 7) return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (status === 2) return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
}

interface BatchStatusPanelProps {
  batch: LatestPublishBatch;
  refreshing: boolean;
  onRefresh: () => void;
  onClear: () => void;
  formatTime: (timestamp: number) => string;
}

function BatchStatusPanel({ batch, refreshing, onRefresh, onClear, formatTime }: BatchStatusPanelProps) {
  const { t } = useLocale();
  const successCount = batch.items.filter((item) => Number(item.detail?.status ?? 0) === 3).length;
  const failedCount = batch.items.filter((item) => item.submitError || [4, 7].includes(Number(item.detail?.status ?? 0))).length;
  const pendingCount = getPendingTaskIds(batch).length;
  const summaryText = `${t('distribute.batchSummaryTotal')} ${batch.items.length} · ${t('distribute.batchSummarySuccess')} ${successCount} · ${t('distribute.batchSummaryFailed')} ${failedCount} · ${t('distribute.batchSummaryPending')} ${pendingCount}`;

  return (
    <section className="mb-6 space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="section-title">{t('distribute.latestBatchTitle')}</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            {t('distribute.latestBatchMeta')} {formatTime(batch.createdAt)}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">{summaryText}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          >
            {refreshing ? t('distribute.batchRefreshing') : t('common.refresh')}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
          >
            {t('common.close')}
          </button>
        </div>
      </div>

      <p className="text-xs text-[var(--color-text-subtle)]">
        {pendingCount > 0 ? t('distribute.latestBatchHintRunning') : t('distribute.latestBatchHintDone')}
      </p>

      <div className="space-y-3">
        {batch.items.map((item) => (
          <article
            key={`${item.accountId}:${item.taskId ?? 'missing-task'}`}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-text)]">{item.username}</span>
                  {item.platform && (
                    <span className="rounded bg-[var(--color-surface-elevated)] px-2 py-0.5 text-[10px] uppercase text-[var(--color-text-muted)]">
                      {item.platform}
                    </span>
                  )}
                  {item.region && (
                    <span className="text-[10px] text-[var(--color-text-muted)]">{item.region}</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                  <span>{t('distribute.reportPlanName')}: {batch.planName ?? '-'}</span>
                  <span>{t('distribute.batchTaskId')}: {item.taskId ?? '-'}</span>
                </div>
              </div>

              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusTone(item)}`}>
                {getDisplayStatus(item, t)}
              </span>
            </div>

            {(item.detailError || item.submitError || item.detail?.failDesc) && (
              <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-200">
                {item.detail?.failDesc || item.detailError || item.submitError}
              </div>
            )}

            {item.detail?.shareLink && (
              <div className="mt-3">
                <a
                  href={item.detail.shareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  {t('distribute.batchShareLink')}
                </a>
              </div>
            )}

            {item.detail?.resultImages && item.detail.resultImages.length > 0 && (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {item.detail.resultImages.map((img, index) => (
                  <img
                    key={`${item.accountId}:${index}`}
                    src={img}
                    alt={`${item.username}-result-${index + 1}`}
                    className="max-h-64 w-full rounded-lg border border-[var(--color-border)] bg-black object-contain"
                  />
                ))}
              </div>
            )}

            {item.detail?.logs && item.detail.logs.length > 0 && (
              <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--color-text-subtle)]">
                  {t('distribute.batchLogs')}
                </p>
                <div className="space-y-1 text-xs text-[var(--color-text-muted)]">
                  {item.detail.logs.slice(-3).map((line, index) => (
                    <p key={`${item.accountId}:log:${index}`} className="break-words">{line}</p>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
