import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';

import { RunningStatus } from '../components/RunningStatus';
import { toast } from '../components/Toast';
import { useCreateFlow } from '../context/CreateFlowContext';
import {
  fetchAccounts,
  fetchTaskHistory,
  fetchTaskDetail,
  publishVideo,
  type GeelarkAccount,
} from '../api/geelark';
import {
  getOutputRecentVideos,
  type OutputRecentVideoItem,
} from '../api/video';
import {
  generateCaptionForPost,
  translateCaptionForPost,
  type CaptionByPlatformResult,
} from '../api/promptPolish';
import {
  getLocalPlaybackSrc,
  getRecentPromptForVideo,
  getVideoFileUrl,
  loadVideoHistory,
  type VideoHistoryItem,
} from '../utils/videoHistory';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { formatDateTime } from '../i18n/locale.ts';
import { replyLocaleToCaptionLanguage, resolveReplyLocale } from '../i18n/replyLocale.ts';
import {
  buildLatestPublishBatch,
  buildSubmittingPreviewBatch,
  getPendingTaskIds,
  isBatchComplete,
  mergeTaskDetailError,
  mergeTaskDetailIntoBatch,
  type LatestPublishBatch,
  type LatestPublishBatchItem,
  type TaskDetailLike,
} from '../utils/geelarkPublishBatch';
import { normalizeTaskHistoryItems, type DistributionTaskHistoryItem } from '../components/distribute/distributeSupport.ts';

type CaptionLanguage = 'DEFAULT' | 'EN' | 'CN' | 'TH' | 'ID';
type CaptionDraft = { caption: string; hashtags: string };
type DistributeAssetSource = 'current' | 'local' | 'output';

interface DistributeAssetOption {
  id: string;
  source: DistributeAssetSource;
  title: string;
  subtitle?: string;
  prompt?: string;
  videoPath?: string;
  videoUrl?: string;
  taskId?: string | null;
  createdAt?: number;
}

const CAPTION_LANGS: CaptionLanguage[] = ['DEFAULT', 'EN', 'CN', 'TH', 'ID'];
const BATCH_POLL_MS = 8000;
const DEFAULT_DRAFT_KEY = 'default';
const EMPTY_DRAFT: CaptionDraft = { caption: '', hashtags: '' };

export function TabDistribute() {
  const { videoUrl, videoPath, prompt, taskId } = useCreateFlow();
  const { t, uiLocale, contentLocale } = useLocale();

  const [accounts, setAccounts] = useState<GeelarkAccount[]>([]);
  const [filterRegion, setFilterRegion] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [localAssets, setLocalAssets] = useState<DistributeAssetOption[]>(() => buildLocalAssetOptions(loadVideoHistory()));
  const [outputAssets, setOutputAssets] = useState<DistributeAssetOption[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  const [captionLang, setCaptionLang] = useState<CaptionLanguage>('DEFAULT');
  const [platformDrafts, setPlatformDrafts] = useState<Record<string, CaptionDraft>>({ [DEFAULT_DRAFT_KEY]: EMPTY_DRAFT });
  const [activeDraftKey, setActiveDraftKey] = useState<string>(DEFAULT_DRAFT_KEY);
  const [captionGenLoading, setCaptionGenLoading] = useState(false);
  const [captionGenError, setCaptionGenError] = useState<string | null>(null);

  const [campaignObjective, setCampaignObjective] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [cta, setCta] = useState('');
  const [market, setMarket] = useState('');
  const [brandTone, setBrandTone] = useState('');
  const [sellingPoints, setSellingPoints] = useState('');
  const [avoidTerms, setAvoidTerms] = useState('');

  const [needShareLink, setNeedShareLink] = useState(true);
  const [markAI, setMarkAI] = useState(false);

  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [latestBatch, setLatestBatch] = useState<LatestPublishBatch | null>(null);
  const [batchRefreshing, setBatchRefreshing] = useState(false);

  const [historyItems, setHistoryItems] = useState<DistributionTaskHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyDetail, setHistoryDetail] = useState<TaskDetailLike | null>(null);
  const [historyDetailId, setHistoryDetailId] = useState<string | null>(null);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);

  const currentAsset = useMemo(
    () => buildCurrentAssetOption({ videoUrl, videoPath, taskId, prompt }),
    [videoUrl, videoPath, taskId, prompt],
  );

  const assetOptions = useMemo(
    () => mergeAssetOptions(currentAsset, localAssets, outputAssets),
    [currentAsset, localAssets, outputAssets],
  );

  const selectedAsset = useMemo(
    () => assetOptions.find((item) => item.id === selectedAssetId) ?? null,
    [assetOptions, selectedAssetId],
  );

  const activeDraft = platformDrafts[activeDraftKey] ?? EMPTY_DRAFT;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAccounts()
      .then((list) => {
        if (cancelled) return;
        setAccounts(list);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : t('distribute.loadFailed'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    setLocalAssets(buildLocalAssetOptions(loadVideoHistory()));
  }, [taskId, videoPath, videoUrl, prompt]);

  useEffect(() => {
    let cancelled = false;
    setAssetLoading(true);
    setAssetError(null);
    getOutputRecentVideos({ limit: 12, view: 'visible' })
      .then((response) => {
        if (cancelled) return;
        setOutputAssets(buildOutputAssetOptions(response.items ?? []));
      })
      .catch((cause) => {
        if (!cancelled) {
          setAssetError(cause instanceof Error ? cause.message : t('distribute.assetLoadFailed'));
        }
      })
      .finally(() => {
        if (!cancelled) setAssetLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    const ids = new Set(assetOptions.map((item) => item.id));
    setSelectedAssetId((previous) => {
      if (previous && ids.has(previous)) return previous;
      if (currentAsset && ids.has(currentAsset.id)) return currentAsset.id;
      return assetOptions[0]?.id ?? null;
    });
  }, [assetOptions, currentAsset]);

  const accountsForPermission = useMemo(() => accounts, [accounts]);

  useEffect(() => {
    const validIds = new Set(accountsForPermission.map((account) => account.id));
    setSelectedIds((previous) => {
      const next = new Set([...previous].filter((id) => validIds.has(id)));
      if (next.size === previous.size && [...previous].every((id) => next.has(id))) return previous;
      return next;
    });
  }, [accountsForPermission]);

  useEffect(() => {
    const draftKeys = Object.keys(platformDrafts);
    if (draftKeys.length === 0) {
      setPlatformDrafts({ [DEFAULT_DRAFT_KEY]: EMPTY_DRAFT });
      setActiveDraftKey(DEFAULT_DRAFT_KEY);
      return;
    }
    if (!platformDrafts[activeDraftKey]) {
      setActiveDraftKey(draftKeys[0] ?? DEFAULT_DRAFT_KEY);
    }
  }, [activeDraftKey, platformDrafts]);

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
            setLatestBatch((previous) => (
              previous ? mergeTaskDetailIntoBatch(previous, currentTaskId, detail) : previous
            ));
          } catch (cause) {
            const message = cause instanceof Error ? cause.message : t('distribute.reportLoadFailed');
            setLatestBatch((previous) => (
              previous ? mergeTaskDetailError(previous, currentTaskId, message) : previous
            ));
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

  const loadTaskHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetchTaskHistory({ size: 20 }) as { items: unknown[]; history?: DistributionTaskHistoryItem[] };
      setHistoryItems(Array.isArray(response.history) ? response.history : normalizeTaskHistoryItems(response.items));
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : t('distribute.historyLoadFailed'));
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadTaskHistory();
  }, [loadTaskHistory]);

  const updateDraft = useCallback((draftKey: string, next: Partial<CaptionDraft>) => {
    setPlatformDrafts((previous) => ({
      ...previous,
      [draftKey]: {
        caption: next.caption ?? previous[draftKey]?.caption ?? '',
        hashtags: next.hashtags ?? previous[draftKey]?.hashtags ?? '',
      },
    }));
  }, []);

  const handleGenerateCaption = async () => {
    const promptSeed = resolvePromptSeed(selectedAsset, prompt, taskId);
    const hasExisting = activeDraft.caption.trim().length > 0 || activeDraft.hashtags.trim().length > 0;
    if (!promptSeed && !hasExisting) {
      setCaptionGenError(t('distribute.captionRequiresInput'));
      return;
    }

    const selectedAccounts = accountsForPermission.filter((account) => selectedIds.has(account.id));
    const platformKeys = [
      ...new Set(selectedAccounts.map((account) => normalizePlatformKey(account.platform)).filter(Boolean)),
    ] as string[];

    setCaptionGenLoading(true);
    setCaptionGenError(null);

    try {
      const language = captionLang === 'DEFAULT'
        ? replyLocaleToCaptionLanguage(
          resolveReplyLocale({
            values: [promptSeed, activeDraft.caption, activeDraft.hashtags],
            fallbackContentLocale: contentLocale,
          }),
        )
        : captionLang;

      const result = await generateCaptionForPost(
        promptSeed,
        platformKeys.length > 0 ? platformKeys : undefined,
        {
          existingCaption: activeDraft.caption.trim() || undefined,
          existingHashtags: activeDraft.hashtags.trim() || undefined,
          language,
          videoPath: selectedAsset?.videoPath || undefined,
          videoUrl: selectedAsset?.videoUrl || undefined,
          accountContext: selectedAccounts.map((account) => ({
            id: account.id,
            username: account.username,
            platform: account.platform,
            region: account.region,
            remark: account.remark,
          })),
          campaignContext: {
            campaignObjective: campaignObjective.trim() || undefined,
            targetAudience: targetAudience.trim() || undefined,
            callToAction: cta.trim() || undefined,
            targetMarket: market.trim() || undefined,
            complianceNotes: [brandTone.trim(), sellingPoints.trim()].filter(Boolean).join(' | ') || undefined,
            bannedPhrases: avoidTerms
              .split(/[\n,|]/)
              .map((value) => value.trim())
              .filter(Boolean),
          },
        },
      );

      if ('byPlatform' in result && result.byPlatform) {
        const nextDrafts = buildDraftsFromPlatformResult(result.byPlatform);
        setPlatformDrafts(nextDrafts);
        setActiveDraftKey(Object.keys(nextDrafts)[0] ?? DEFAULT_DRAFT_KEY);
      } else if ('caption' in result) {
        const nextDrafts = {
          [DEFAULT_DRAFT_KEY]: {
            caption: result.caption,
            hashtags: result.hashtags,
          },
        };
        setPlatformDrafts(nextDrafts);
        setActiveDraftKey(DEFAULT_DRAFT_KEY);
      }
    } catch (cause) {
      setCaptionGenError(cause instanceof Error ? cause.message : t('quickfilm.processingGenericError'));
    } finally {
      setCaptionGenLoading(false);
    }
  };

  const handleLanguageChange = async (lang: CaptionLanguage) => {
    if (lang === captionLang) return;
    setCaptionLang(lang);
    if (lang === 'DEFAULT') return;
    const hasContent = activeDraft.caption.trim().length > 0 || activeDraft.hashtags.trim().length > 0;
    if (!hasContent) return;

    setCaptionGenLoading(true);
    setCaptionGenError(null);
    try {
      const result = await translateCaptionForPost(activeDraft.caption, activeDraft.hashtags, lang);
      updateDraft(activeDraftKey, {
        caption: result.caption,
        hashtags: result.hashtags,
      });
    } catch (cause) {
      setCaptionGenError(cause instanceof Error ? cause.message : t('distribute.translationFailed'));
    } finally {
      setCaptionGenLoading(false);
    }
  };

  const handleToggleAccount = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectVisible = useCallback((visibleAccounts: GeelarkAccount[]) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      visibleAccounts.forEach((account) => next.add(account.id));
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleLoadHistoryDetail = useCallback(async (historyTaskId: string) => {
    setHistoryDetailLoading(true);
    setHistoryDetailId(historyTaskId);
    try {
      const detail = await fetchTaskDetail(historyTaskId);
      setHistoryDetail(detail);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t('distribute.reportLoadFailed'));
      setHistoryDetail(null);
    } finally {
      setHistoryDetailLoading(false);
    }
  }, [t]);

  const handlePush = async () => {
    if (!selectedAsset?.videoPath && !selectedAsset?.videoUrl) {
      setPushError(t('distribute.pushRequiresVideo'));
      return;
    }
    if (selectedIds.size === 0) {
      setPushError(t('distribute.pushRequiresAccount'));
      return;
    }

    const selectedAccounts = accountsForPermission.filter((account) => selectedIds.has(account.id));
    const groupedAccounts = groupAccountsByPlatform(selectedAccounts);
    const groupedEntries = [...groupedAccounts.entries()];

    setPushing(true);
    setPushError(null);
    setLatestBatch(buildSubmittingPreviewBatch(selectedAccounts));

    try {
      const createdAt = Date.now();
      const settled = await Promise.allSettled(
        groupedEntries.map(async ([platformKey, group]) => {
          const draft = resolveDraftForPlatform(platformKey, platformDrafts);
          const result = await publishVideo({
            videoPath: selectedAsset.videoPath || undefined,
            videoUrl: selectedAsset.videoPath ? undefined : selectedAsset.videoUrl ?? undefined,
            accountIds: group.map((account) => account.id),
            caption: draft.caption.trim() || undefined,
            hashtags: draft.hashtags.trim() || undefined,
            needShareLink,
            markAI,
          });
          return buildLatestPublishBatch(result, createdAt);
        }),
      );

      const batches: LatestPublishBatch[] = [];
      let firstError: string | null = null;

      settled.forEach((result, index) => {
        const [, group] = groupedEntries[index]!;
        if (result.status === 'fulfilled' && result.value) {
          batches.push(result.value);
          return;
        }
        const message = result.status === 'rejected'
          ? (result.reason instanceof Error ? result.reason.message : t('distribute.pushFailed'))
          : t('distribute.pushFailed');
        firstError ||= message;
        batches.push(buildSubmitErrorBatch(group, message, createdAt));
      });

      const mergedBatch = mergeLatestBatches(batches, createdAt);
      setLatestBatch(mergedBatch);
      if (mergedBatch) {
        void refreshBatch(mergedBatch);
      }
      void loadTaskHistory();
      if (firstError && settled.every((result) => result.status === 'rejected')) {
        setPushError(firstError);
      }
      if (firstError && settled.some((result) => result.status === 'fulfilled')) {
        toast.error(`${t('distribute.pushPartialFailed')}: ${firstError}`);
      }
    } catch (cause) {
      setLatestBatch(null);
      const message = cause instanceof Error ? cause.message : t('distribute.pushFailed');
      setPushError(message);
      toast.error(`${t('distribute.pushFailed')}: ${message}`);
    } finally {
      setPushing(false);
    }
  };

  const captionLanguageLabel = (lang: CaptionLanguage) => {
    if (lang === 'DEFAULT') return t('distribute.captionLanguageDefault');
    return lang;
  };

  const selectedAccounts = useMemo(
    () => accountsForPermission.filter((account) => selectedIds.has(account.id)),
    [accountsForPermission, selectedIds],
  );

  const selectedPlatformKeys = useMemo(
    () => [...new Set(selectedAccounts.map((account) => normalizePlatformKey(account.platform)).filter(Boolean))],
    [selectedAccounts],
  );

  const regions = [...new Set(accountsForPermission.map((account) => account.region).filter(Boolean))] as string[];
  const platforms = [...new Set(accountsForPermission.map((account) => account.platform).filter(Boolean))] as string[];
  const filteredAccounts = accountsForPermission.filter((account) => {
    if (filterRegion && account.region !== filterRegion) return false;
    if (filterPlatform && account.platform !== filterPlatform) return false;
    return true;
  });

  const draftKeys = Object.keys(platformDrafts);
  const hasAnyCopy = draftKeys.some((key) => {
    const draft = platformDrafts[key] ?? EMPTY_DRAFT;
    return draft.caption.trim().length > 0 || draft.hashtags.trim().length > 0;
  });

  const preflightItems = [
    {
      key: 'asset',
      label: t('distribute.preflightAsset'),
      ready: !!selectedAsset,
      value: selectedAsset?.title ?? t('common.none'),
    },
    {
      key: 'accounts',
      label: t('distribute.preflightAccounts'),
      ready: selectedIds.size > 0,
      value: t('distribute.selectedCountValue').replace('{count}', String(selectedIds.size)),
    },
    {
      key: 'copy',
      label: t('distribute.preflightCopy'),
      ready: hasAnyCopy,
      value: hasAnyCopy
        ? t('distribute.preflightReady')
        : t('distribute.preflightOptional'),
    },
  ];

  return (
    <div className="max-w-6xl w-full space-y-6">
      <div>
        <h1 className="page-title">{t('distribute.title')}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t('distribute.subtitle')}</p>
      </div>

      <section className="mb-6 space-y-4">
        <div>
          <h2 className="section-title">{t('distribute.assetTitle')}</h2>
          <p className="text-xs text-[var(--color-text-muted)]">{t('distribute.assetSubtitle')}</p>
        </div>

        {assetLoading && (
          <p className="text-sm text-[var(--color-text-muted)]">{t('distribute.assetLoading')}</p>
        )}
        {assetError && (
          <p className="text-sm text-[var(--color-error)]">{assetError}</p>
        )}

        {assetOptions.length === 0 ? (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-8 text-center">
            <p className="mb-4 text-[var(--color-text-muted)]">{t('distribute.noVideo')}</p>
            <Link
              to="/studio"
              className="inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              {t('distribute.goToStudio')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
              <div className="space-y-2">
                {assetOptions.map((asset) => {
                  const isActive = selectedAssetId === asset.id;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setSelectedAssetId(asset.id)}
                      className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                        isActive
                          ? 'border-[var(--color-primary)] bg-[var(--color-surface)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-[var(--color-surface-elevated)] px-2 py-0.5 text-[10px] uppercase text-[var(--color-text-muted)]">
                              {assetSourceLabel(asset.source, t)}
                            </span>
                            {asset.taskId && (
                              <span className="text-[10px] text-[var(--color-text-subtle)]">#{asset.taskId}</span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-[var(--color-text)]">{asset.title}</p>
                          {asset.subtitle && (
                            <p className="text-xs text-[var(--color-text-muted)]">{asset.subtitle}</p>
                          )}
                        </div>
                        {isActive && (
                          <span className="text-xs font-medium text-[var(--color-primary)]">{t('common.selected')}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
              <h3 className="text-sm font-medium text-[var(--color-text)]">{t('distribute.assetPreviewTitle')}</h3>
              {selectedAsset?.videoUrl ? (
                <div className="aspect-video overflow-hidden rounded-lg border border-[var(--color-border)] bg-black">
                  <video src={selectedAsset.videoUrl} controls className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                  {t('distribute.assetPreviewUnavailable')}
                </div>
              )}
              {selectedAsset?.prompt && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--color-text-subtle)]">
                    {t('distribute.assetPromptSeed')}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">{selectedAsset.prompt}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="section-title">{t('distribute.targetAccounts')}</h2>
        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">{t('distribute.loadingAccounts')}</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        ) : accounts.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 text-center space-y-3">
            <p className="text-2xl">棣冩懀</p>
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
              {t('distribute.learnGeelark')} 閳?
            </a>
          </div>
        ) : accountsForPermission.length === 0 ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center space-y-2">
            <p className="text-sm font-medium text-[var(--color-text)]">{t('distribute.noPermissionTitle')}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{t('distribute.noPermissionHint')}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--color-text-muted)]">
                {t('distribute.selectedCountLabel')} {selectedIds.size}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectVisible(filteredAccounts)}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                >
                  {t('distribute.selectVisible')}
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                >
                  {t('distribute.clearSelection')}
                </button>
              </div>
            </div>

            {(regions.length > 0 || platforms.length > 0) && (
              <div className="mb-4 flex flex-wrap gap-3">
                {regions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)]">{t('distribute.region')}</span>
                    <select
                      value={filterRegion}
                      onChange={(event) => setFilterRegion(event.target.value)}
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
                      onChange={(event) => setFilterPlatform(event.target.value)}
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
                    {account.profileUrl && (
                      <a
                        href={account.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="text-xs text-[var(--color-primary)] hover:underline"
                      >
                        {t('distribute.profileLink')}
                      </a>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      <section className="mb-6 space-y-4">
        <h2 className="section-title">{t('distribute.campaignTitle')}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-[var(--color-text-muted)]">{t('distribute.campaignObjective')}</span>
            <input
              type="text"
              value={campaignObjective}
              onChange={(event) => setCampaignObjective(event.target.value)}
              placeholder={t('distribute.campaignObjectivePlaceholder')}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[var(--color-text-muted)]">{t('distribute.targetAudience')}</span>
            <input
              type="text"
              value={targetAudience}
              onChange={(event) => setTargetAudience(event.target.value)}
              placeholder={t('distribute.targetAudiencePlaceholder')}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[var(--color-text-muted)]">{t('distribute.callToAction')}</span>
            <input
              type="text"
              value={cta}
              onChange={(event) => setCta(event.target.value)}
              placeholder={t('distribute.callToActionPlaceholder')}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[var(--color-text-muted)]">{t('distribute.market')}</span>
            <input
              type="text"
              value={market}
              onChange={(event) => setMarket(event.target.value)}
              placeholder={t('distribute.marketPlaceholder')}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-[var(--color-text-muted)]">{t('distribute.brandTone')}</span>
            <input
              type="text"
              value={brandTone}
              onChange={(event) => setBrandTone(event.target.value)}
              placeholder={t('distribute.brandTonePlaceholder')}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-[var(--color-text-muted)]">{t('distribute.sellingPoints')}</span>
            <textarea
              value={sellingPoints}
              onChange={(event) => setSellingPoints(event.target.value)}
              placeholder={t('distribute.sellingPointsPlaceholder')}
              rows={2}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-[var(--color-text-muted)]">{t('distribute.avoidTerms')}</span>
            <textarea
              value={avoidTerms}
              onChange={(event) => setAvoidTerms(event.target.value)}
              placeholder={t('distribute.avoidTermsPlaceholder')}
              rows={2}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
            />
          </label>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="section-title">{t('distribute.videoAndCaption')}</h2>
        {selectedAsset ? (
          <>
            <div className="space-y-4">
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
                    disabled={captionGenLoading || (!resolvePromptSeed(selectedAsset, prompt, taskId) && !hasAnyCopy)}
                    className="text-xs text-[var(--color-primary)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {captionGenLoading
                      ? t('distribute.generatingCaption')
                      : hasAnyCopy
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

              {draftKeys.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {draftKeys.map((draftKey) => (
                    <button
                      key={draftKey}
                      type="button"
                      onClick={() => setActiveDraftKey(draftKey)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        activeDraftKey === draftKey
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                      }`}
                    >
                      {draftKey === DEFAULT_DRAFT_KEY ? t('distribute.defaultDraftLabel') : draftKey}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={activeDraft.caption}
                onChange={(event) => updateDraft(activeDraftKey, { caption: event.target.value })}
                placeholder={t('distribute.captionPlaceholder')}
                rows={3}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none"
              />

              {captionGenError && (
                <p className="mt-1 text-xs text-[var(--color-error)]">{captionGenError}</p>
              )}

              <div>
                <label className="mb-1 block text-xs text-[var(--color-text-muted)]">{t('distribute.hashtags')}</label>
                <input
                  type="text"
                  value={activeDraft.hashtags}
                  onChange={(event) => updateDraft(activeDraftKey, { hashtags: event.target.value })}
                  placeholder={t('distribute.hashtagsPlaceholder')}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none"
                />
              </div>

              {draftKeys.length > 1 && (
                <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <h4 className="text-xs font-medium text-[var(--color-text-muted)]">{t('distribute.captionByPlatform')}</h4>
                  <div className="space-y-2">
                    {draftKeys.map((draftKey) => {
                      const draft = platformDrafts[draftKey] ?? EMPTY_DRAFT;
                      return (
                        <button
                          key={draftKey}
                          type="button"
                          onClick={() => setActiveDraftKey(draftKey)}
                          className={`w-full rounded border p-3 text-left ${
                            activeDraftKey === draftKey
                              ? 'border-[var(--color-primary)] bg-[var(--color-surface-elevated)]'
                              : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)]'
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-medium uppercase text-[var(--color-primary)]">
                              {draftKey === DEFAULT_DRAFT_KEY ? t('distribute.defaultDraftLabel') : draftKey}
                            </span>
                            {activeDraftKey === draftKey && (
                              <span className="text-[10px] text-[var(--color-text-subtle)]">{t('distribute.activeDraft')}</span>
                            )}
                          </div>
                          <p className="break-words text-xs text-[var(--color-text)]">{draft.caption || t('common.none')}</p>
                          {draft.hashtags && (
                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{draft.hashtags}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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

      <section className="mb-6 space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
        <div>
          <h2 className="section-title">{t('distribute.preflightTitle')}</h2>
          <p className="text-xs text-[var(--color-text-muted)]">{t('distribute.preflightSubtitle')}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {preflightItems.map((item) => (
            <div key={item.key} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--color-text-muted)]">{item.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${item.ready ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-100'}`}>
                  {item.ready ? t('distribute.preflightReady') : t('distribute.preflightMissing')}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text)]">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[var(--color-text-muted)]">{t('distribute.publishOptions')}</p>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={needShareLink}
              onChange={(event) => setNeedShareLink(event.target.checked)}
            />
            {t('distribute.needShareLink')}
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={markAI}
              onChange={(event) => setMarkAI(event.target.checked)}
            />
            {t('distribute.markAI')}
          </label>
        </div>
      </section>

      <section className="mb-6 space-y-3">
        <button
          type="button"
          onClick={() => void handlePush()}
          disabled={pushing || selectedIds.size === 0 || !selectedAsset}
          className="rounded-lg bg-[var(--color-primary)] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pushing ? t('distribute.publishing') : t('distribute.publish')}
        </button>
        {pushError && <p className="text-sm text-[var(--color-error)]">{pushError}</p>}
        {selectedPlatformKeys.length > 1 && (
          <p className="text-xs text-[var(--color-text-muted)]">
            {t('distribute.publishGroupedByPlatform')}
          </p>
        )}
      </section>

      {latestBatch && (
        <BatchStatusPanel
          batch={latestBatch}
          refreshing={batchRefreshing}
          onRefresh={() => void refreshBatch(latestBatch)}
          onClear={() => setLatestBatch(null)}
          formatTime={(timestamp) => formatDateTime(timestamp, uiLocale)}
        />
      )}

      <section className="mb-6 space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">{t('distribute.historyTitle')}</h2>
            <p className="text-xs text-[var(--color-text-muted)]">{t('distribute.historySubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadTaskHistory()}
            disabled={historyLoading}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          >
            {historyLoading ? t('distribute.batchRefreshing') : t('common.refresh')}
          </button>
        </div>

        {historyError && <p className="text-sm text-[var(--color-error)]">{historyError}</p>}
        {!historyError && historyItems.length === 0 && !historyLoading && (
          <p className="text-sm text-[var(--color-text-muted)]">{t('distribute.historyEmpty')}</p>
        )}

        {historyItems.length > 0 && (
          <div className="space-y-2">
            {historyItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[var(--color-text)]">{item.planName || item.id}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                      <span>{t('distribute.batchTaskId')}: {item.id}</span>
                      {item.createdAt ? (
                        <span>{formatDateTime(item.createdAt, uiLocale)}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text)]">
                      {item.statusText || t('common.unknown')}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleLoadHistoryDetail(item.id)}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                    >
                      {historyDetailLoading && historyDetailId === item.id
                        ? t('distribute.reportLoading')
                        : t('distribute.historyInspect')}
                    </button>
                    {item.shareLink && (
                      <a
                        href={item.shareLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--color-primary)] hover:underline"
                      >
                        {t('distribute.batchShareLink')}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {historyDetail && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">{historyDetail.id}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{historyDetail.statusText || t('common.unknown')}</p>
              </div>
              {historyDetail.shareLink && (
                <a
                  href={historyDetail.shareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  {t('distribute.batchShareLink')}
                </a>
              )}
            </div>
            {historyDetail.failDesc && (
              <p className="mb-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-200">
                {historyDetail.failDesc}
              </p>
            )}
            {historyDetail.logs?.length ? (
              <div className="space-y-1 text-xs text-[var(--color-text-muted)]">
                {historyDetail.logs.slice(-5).map((line, index) => (
                  <p key={`${historyDetail.id}:history-log:${index}`} className="break-words">{line}</p>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function getDisplayStatus(item: LatestPublishBatchItem, t: (key: string) => string): string {
  if (item.statusText === 'submitting') return t('distribute.batchStatusSubmitting');
  if (item.statusText === 'submit_failed') return t('distribute.batchStatusSubmitFailed');
  if (item.statusText === 'submitted') return t('distribute.batchStatusSubmitted');
  if (item.detail?.statusText) return item.detail.statusText;
  return item.statusText || t('common.unknown');
}

function getStatusTone(item: LatestPublishBatchItem): string {
  if (item.statusText === 'submitting') return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
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
  const pendingCount = batch.phase === 'submitting' ? batch.items.length : getPendingTaskIds(batch).length;
  const summaryText = `${t('distribute.batchSummaryTotal')} ${batch.items.length} 路 ${t('distribute.batchSummarySuccess')} ${successCount} 路 ${t('distribute.batchSummaryFailed')} ${failedCount} 路 ${t('distribute.batchSummaryPending')} ${pendingCount}`;

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
            disabled={refreshing || batch.phase === 'submitting'}
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
        {batch.phase === 'submitting'
          ? t('distribute.latestBatchHintSubmitting')
          : pendingCount > 0
            ? t('distribute.latestBatchHintRunning')
            : t('distribute.latestBatchHintDone')}
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
                  {item.profileUrl && (
                    <a
                      href={item.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[var(--color-primary)] hover:underline"
                    >
                      {t('distribute.profileLink')}
                    </a>
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

function normalizePlatformKey(platform?: string | null): string {
  return platform?.trim().toLowerCase() || DEFAULT_DRAFT_KEY;
}

function buildCurrentAssetOption(input: {
  videoUrl?: string | null;
  videoPath?: string | null;
  taskId?: string | null;
  prompt?: string | null;
}): DistributeAssetOption | null {
  if (!input.videoPath?.trim() && !input.videoUrl?.trim()) return null;
  return {
    id: `current:${input.taskId || input.videoPath || input.videoUrl}`,
    source: 'current',
    title: input.videoPath?.split('/').pop() || input.taskId || 'Current Studio result',
    subtitle: input.videoPath || input.videoUrl || undefined,
    prompt: input.prompt?.trim() || undefined,
    videoPath: input.videoPath?.trim() || undefined,
    videoUrl: input.videoPath?.trim()
      ? getVideoFileUrl(input.videoPath.trim())
      : input.videoUrl?.trim() || undefined,
    taskId: input.taskId ?? null,
    createdAt: Date.now(),
  };
}

function buildLocalAssetOptions(items: VideoHistoryItem[]): DistributeAssetOption[] {
  return items
    .map((item) => ({
      id: `local:${item.taskId}`,
      source: 'local' as const,
      title: item.videoPath?.split('/').pop() || item.taskId,
      subtitle: item.prompt?.trim() || item.videoPath || undefined,
      prompt: item.prompt?.trim() || undefined,
      videoPath: item.videoPath?.trim() || undefined,
      videoUrl: getLocalPlaybackSrc(item) || undefined,
      taskId: item.taskId,
      createdAt: item.createdAt,
    }))
    .sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0))
    .slice(0, 8);
}

function buildOutputAssetOptions(items: OutputRecentVideoItem[]): DistributeAssetOption[] {
  return items.map((item) => ({
    id: `output:${item.path}`,
    source: 'output',
    title: item.path.split('/').pop() || item.path,
    subtitle: item.promptSummary?.trim() || item.path,
    prompt: item.promptSummary?.trim() || undefined,
    videoPath: item.path,
    videoUrl: getVideoFileUrl(item.path),
    createdAt: item.mtimeMs,
  }));
}

function mergeAssetOptions(
  currentAsset: DistributeAssetOption | null,
  localAssets: DistributeAssetOption[],
  outputAssets: DistributeAssetOption[],
): DistributeAssetOption[] {
  const merged = [currentAsset, ...localAssets, ...outputAssets].filter(Boolean) as DistributeAssetOption[];
  const deduped = new Map<string, DistributeAssetOption>();
  for (const asset of merged) {
    const identity = asset.videoPath?.trim() || asset.taskId || asset.videoUrl || asset.id;
    if (!deduped.has(identity)) {
      deduped.set(identity, asset);
    }
  }
  return [...deduped.values()].sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0));
}

function resolvePromptSeed(
  asset: DistributeAssetOption | null,
  fallbackPrompt?: string | null,
  fallbackTaskId?: string | null,
): string {
  return asset?.prompt?.trim()
    || (fallbackPrompt || '').trim()
    || getRecentPromptForVideo(asset?.taskId ?? fallbackTaskId)
    || '';
}

function buildDraftsFromPlatformResult(byPlatform: CaptionByPlatformResult['byPlatform']): Record<string, CaptionDraft> {
  const entries = Object.entries(byPlatform ?? {})
    .map(([platform, draft]) => [
      normalizePlatformKey(platform),
      {
        caption: draft.caption || '',
        hashtags: draft.hashtags || '',
      },
    ] as const);
  if (entries.length === 0) {
    return { [DEFAULT_DRAFT_KEY]: EMPTY_DRAFT };
  }
  return Object.fromEntries(entries);
}

function resolveDraftForPlatform(platformKey: string, drafts: Record<string, CaptionDraft>): CaptionDraft {
  return drafts[platformKey] ?? drafts[DEFAULT_DRAFT_KEY] ?? EMPTY_DRAFT;
}

function groupAccountsByPlatform(accounts: GeelarkAccount[]): Map<string, GeelarkAccount[]> {
  const grouped = new Map<string, GeelarkAccount[]>();
  accounts.forEach((account) => {
    const key = normalizePlatformKey(account.platform);
    const current = grouped.get(key) ?? [];
    current.push(account);
    grouped.set(key, current);
  });
  return grouped;
}

function buildSubmitErrorBatch(accounts: GeelarkAccount[], message: string, createdAt: number): LatestPublishBatch {
  return {
    createdAt,
    phase: 'tracking',
    items: accounts.map((account) => ({
      accountId: account.id,
      username: account.username,
      platform: account.platform,
      region: account.region,
      remark: account.remark,
      profileUrl: account.profileUrl,
      submitError: message,
      statusText: 'submit_failed',
      detailLoading: false,
      detailError: message,
    })),
  };
}

function mergeLatestBatches(batches: Array<LatestPublishBatch | null>, createdAt: number): LatestPublishBatch | null {
  const valid = batches.filter(Boolean) as LatestPublishBatch[];
  if (valid.length === 0) return null;
  const planNames = [...new Set(valid.map((batch) => batch.planName).filter(Boolean))];
  return {
    createdAt,
    phase: 'tracking',
    planName: planNames.join(', ') || undefined,
    items: valid.flatMap((batch) => batch.items),
  };
}

function assetSourceLabel(source: DistributeAssetSource, t: (key: string) => string): string {
  if (source === 'current') return t('distribute.assetCurrent');
  if (source === 'local') return t('distribute.assetLocal');
  return t('distribute.assetOutput');
}
