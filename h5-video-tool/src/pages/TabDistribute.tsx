import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { RunningStatus } from '../components/RunningStatus';
import { toast } from '../components/Toast';
import { useCreateFlow } from '../context/CreateFlowContext';
import {
  getCampaignDistributionPackage,
  listCampaignDistributionPackages,
} from '../api/campaignDistribution.ts';
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
  type CaptionCampaignContext,
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
  type TaskDetailLike,
} from '../utils/geelarkPublishBatch';
import { normalizeTaskHistoryItems, type DistributionTaskHistoryItem } from '../components/distribute/distributeSupport.ts';
import { DistributeStepAsset } from '../components/distribute/DistributeStepAsset.tsx';
import { DistributeStepAccounts } from '../components/distribute/DistributeStepAccounts.tsx';
import { DistributeStepCopy } from '../components/distribute/DistributeStepCopy.tsx';
import { DistributeStepPublish } from '../components/distribute/DistributeStepPublish.tsx';
import { DistributePublishHistory } from '../components/distribute/DistributePublishHistory.tsx';
import { PendingDistributionPackages } from '../components/distribution/PendingDistributionPackages';
import {
  buildDistributeDraftFromPackage,
  type PendingDistributionDraft,
} from '../components/distribution/packageToDistributeDraft.ts';
import type { CampaignDistributionPackage } from '../components/campaign/distributionPackage.ts';

type CaptionLanguage = 'DEFAULT' | 'EN' | 'CN' | 'TH' | 'ID';
type CaptionDraft = { caption: string; hashtags: string };
type DistributeAssetSource = 'package' | 'current' | 'local' | 'output';

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
  const navigate = useNavigate();
  const location = useLocation();

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

  const [captionHint, setCaptionHint] = useState('');

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
  const [pendingPackages, setPendingPackages] = useState<CampaignDistributionPackage[]>([]);
  const [pendingPackagesLoading, setPendingPackagesLoading] = useState(false);
  const [pendingPackagesError, setPendingPackagesError] = useState<string | null>(null);
  const [activePackageId, setActivePackageId] = useState<string | null>(null);
  const [pendingPackageDraft, setPendingPackageDraft] = useState<PendingDistributionDraft | null>(null);
  const [packageAsset, setPackageAsset] = useState<DistributeAssetOption | null>(null);

  const packageQueryId = useMemo(
    () => new URLSearchParams(location.search).get('package')?.trim() ?? '',
    [location.search],
  );

  const currentAsset = useMemo(
    () => buildCurrentAssetOption({ videoUrl, videoPath, taskId, prompt }),
    [videoUrl, videoPath, taskId, prompt],
  );

  const assetOptions = useMemo(
    () => mergeAssetOptions(packageAsset, currentAsset, localAssets, outputAssets),
    [packageAsset, currentAsset, localAssets, outputAssets],
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
      if (pendingPackageDraft) {
        if (packageAsset && ids.has(packageAsset.id)) return packageAsset.id;
        return null;
      }
      if (currentAsset && ids.has(currentAsset.id)) return currentAsset.id;
      return assetOptions[0]?.id ?? null;
    });
  }, [assetOptions, currentAsset, packageAsset, pendingPackageDraft]);

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
      const rawHistory = Array.isArray(response.history) ? response.history : response.items;
      setHistoryItems(normalizeTaskHistoryItems(rawHistory));
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

  const loadPendingPackages = useCallback(async () => {
    setPendingPackagesLoading(true);
    setPendingPackagesError(null);
    try {
      const response = await listCampaignDistributionPackages();
      setPendingPackages(response.items);
    } catch (cause) {
      setPendingPackagesError(cause instanceof Error ? cause.message : t('distribute.pendingPackagesLoadFailed'));
      setPendingPackages([]);
    } finally {
      setPendingPackagesLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadPendingPackages();
  }, [loadPendingPackages]);

  const updateDraft = useCallback((draftKey: string, next: Partial<CaptionDraft>) => {
    setPlatformDrafts((previous) => ({
      ...previous,
      [draftKey]: {
        caption: next.caption ?? previous[draftKey]?.caption ?? '',
        hashtags: next.hashtags ?? previous[draftKey]?.hashtags ?? '',
      },
    }));
  }, []);

  const applyPendingPackage = useCallback((pkg: CampaignDistributionPackage) => {
    const nextDraft = buildDistributeDraftFromPackage(pkg);
    const nextDraftKeys = Object.keys(nextDraft.platformDrafts);
    const nextPackageAsset = buildPackageAssetOption(nextDraft);

    setActivePackageId(pkg.id);
    setPendingPackageDraft(nextDraft);
    setPackageAsset(nextPackageAsset);
    setSelectedAssetId(nextPackageAsset?.id ?? null);
    setCaptionLang('DEFAULT');
    setPlatformDrafts(nextDraftKeys.length > 0 ? nextDraft.platformDrafts : { [DEFAULT_DRAFT_KEY]: EMPTY_DRAFT });
    setActiveDraftKey(nextDraftKeys[0] ?? DEFAULT_DRAFT_KEY);
    setCaptionHint('');
    setCaptionGenError(null);
    setPushError(null);
  }, []);

  useEffect(() => {
    if (!packageQueryId || activePackageId === packageQueryId) return;

    const matchedPackage = pendingPackages.find((pkg) => pkg.id === packageQueryId);
    if (matchedPackage) {
      applyPendingPackage(matchedPackage);
      return;
    }

    let cancelled = false;
    getCampaignDistributionPackage(packageQueryId)
      .then((pkg) => {
        if (cancelled) return;
        setPendingPackages((previous) => (
          previous.some((current) => current.id === pkg.id) ? previous : [pkg, ...previous]
        ));
        applyPendingPackage(pkg);
      })
      .catch((cause) => {
        if (!cancelled) {
          setPendingPackagesError(cause instanceof Error ? cause.message : t('distribute.pendingPackagesLoadFailed'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activePackageId, applyPendingPackage, packageQueryId, pendingPackages, t]);

  const handleGenerateCaption = async () => {
    const promptSeed = resolvePromptSeed(selectedAsset, prompt, taskId);
    const hint = captionHint.trim();
    const generationSeed = buildCaptionGenerationSeed(promptSeed, hint);
    const hasExisting = activeDraft.caption.trim().length > 0 || activeDraft.hashtags.trim().length > 0;
    if (!generationSeed && !hasExisting) {
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
            values: [generationSeed, activeDraft.caption, activeDraft.hashtags],
            fallbackContentLocale: contentLocale,
          }),
        )
        : captionLang;

      const result = await generateCaptionForPost(
        generationSeed,
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
          campaignContext: buildCaptionCampaignContext(pendingPackageDraft),
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

  const handleApplyAccountGroup = useCallback((accountIds: string[], shouldSelect: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      accountIds.forEach((id) => {
        if (shouldSelect) next.add(id);
        else next.delete(id);
      });
      return next;
    });
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
  const copyCardKeys = useMemo(
    () => buildCopyCardKeys(selectedPlatformKeys, draftKeys, DEFAULT_DRAFT_KEY),
    [draftKeys, selectedPlatformKeys],
  );
  const copyCardAccountCounts = useMemo(
    () => buildPlatformAccountCounts(selectedAccounts, copyCardKeys, DEFAULT_DRAFT_KEY),
    [copyCardKeys, selectedAccounts],
  );
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

      <PendingDistributionPackages
        packages={pendingPackages}
        loading={pendingPackagesLoading}
        errorMessage={pendingPackagesError}
        activePackageId={activePackageId}
        activeDraft={pendingPackageDraft}
        onUsePackage={applyPendingPackage}
        onOpenAssetLibrary={() => navigate('/asset-library')}
        onOpenQuickFilm={() => navigate('/quickfilm')}
        copy={{
          title: t('distribute.pendingPackagesTitle'),
          subtitle: t('distribute.pendingPackagesSubtitle'),
          empty: t('distribute.pendingPackagesEmpty'),
          loading: t('distribute.pendingPackagesLoading'),
          error: t('distribute.pendingPackagesLoadFailed'),
          usePackage: t('distribute.pendingPackagesUse'),
          active: t('distribute.pendingPackagesActive'),
          accountHint: t('distribute.pendingPackagesAccountHint'),
          nextActionsTitle: t('distribute.pendingPackagesNextActionsTitle'),
          openAssetLibrary: t('distribute.pendingPackagesOpenAssetLibrary'),
          openQuickFilm: t('distribute.pendingPackagesOpenQuickFilm'),
          assetState: t('distribute.pendingPackagesAssetState'),
          reviewStatus: t('distribute.pendingPackagesReviewStatus'),
          packageAngle: t('distribute.pendingPackagesAngle'),
          packageHook: t('distribute.pendingPackagesHook'),
          packageTargets: t('distribute.pendingPackagesTargets'),
          publishableBadge: t('distribute.pendingPackagesPublishableBadge'),
          needsAssetBadge: t('distribute.pendingPackagesNeedsAssetBadge'),
          assetStateLabels: {
            publishable: t('distribute.pendingPackagesAssetStateLabels.publishable'),
            needsAsset: t('distribute.pendingPackagesAssetStateLabels.needsAsset'),
            generating: t('distribute.pendingPackagesAssetStateLabels.generating'),
            failed: t('distribute.pendingPackagesAssetStateLabels.failed'),
          },
          reviewStatusLabels: {
            draft: t('distribute.pendingPackagesReviewStatusLabels.draft'),
            needsReview: t('distribute.pendingPackagesReviewStatusLabels.needsReview'),
            approved: t('distribute.pendingPackagesReviewStatusLabels.approved'),
            readyToDistribute: t('distribute.pendingPackagesReviewStatusLabels.readyToDistribute'),
            rejected: t('distribute.pendingPackagesReviewStatusLabels.rejected'),
          },
        }}
      />

      <DistributeStepAsset
        assets={assetOptions}
        selectedAsset={selectedAsset}
        selectedAssetId={selectedAssetId}
        loading={assetLoading}
        error={assetError}
        emptyAction={(
          <Link
            to="/studio"
            className="inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            {t('distribute.goToStudio')}
          </Link>
        )}
        labels={{
          step: '01',
          title: t('distribute.assetTitle'),
          subtitle: t('distribute.assetSubtitle'),
          loading: t('distribute.assetLoading'),
          noVideo: t('distribute.noVideo'),
          selected: t('common.selected'),
          previewTitle: t('distribute.assetPreviewTitle'),
          previewUnavailable: t('distribute.assetPreviewUnavailable'),
          promptSeed: t('distribute.assetPromptSeed'),
        }}
        getAssetSourceLabel={(source) => assetSourceLabel(source, t)}
        onSelectAsset={setSelectedAssetId}
      />

      <DistributeStepCopy<CaptionLanguage>
        hasSelectedAsset={Boolean(selectedAsset)}
        captionHintValue={captionHint}
        captionLanguages={CAPTION_LANGS}
        activeCaptionLanguage={captionLang}
        captionGenLoading={captionGenLoading}
        captionGenError={captionGenError}
        hasAnyCopy={hasAnyCopy}
        canGenerateCaption={Boolean(buildCaptionGenerationSeed(resolvePromptSeed(selectedAsset, prompt, taskId), captionHint.trim()) || hasAnyCopy)}
        pendingPackageDraft={pendingPackageDraft}
        draftKeys={copyCardKeys}
        defaultDraftKey={DEFAULT_DRAFT_KEY}
        drafts={platformDrafts}
        activeDraftKey={activeDraftKey}
        accountCounts={copyCardAccountCounts}
        noVideoAction={(
          <Link
            to="/studio"
            className="inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            {t('distribute.goToStudio')}
          </Link>
        )}
        statusIndicator={(
          <RunningStatus
            active={captionGenLoading}
            label={t('distribute.generatingCaptionStatus')}
            stallAfterSec={15}
            scene="on-tour"
          />
        )}
        labels={{
          step: '02',
          title: t('distribute.videoAndCaption'),
          noVideo: t('distribute.noVideo'),
          captionHintInput: t('distribute.captionHintInput'),
          captionHintPlaceholder: t('distribute.captionHintPlaceholder'),
          captionByPlatform: t('distribute.captionByPlatform'),
          captionHint: t('distribute.captionHint'),
          generatingCaption: t('distribute.generatingCaption'),
          polishCaption: t('distribute.polishCaption'),
          generateCaption: t('distribute.generateCaption'),
          captionLanguageLabel,
          campaignContext: {
            title: t('distribute.packageContextTitle'),
            subtitle: t('distribute.packageContextSubtitle'),
            objective: t('distribute.campaignObjective'),
            audience: t('distribute.targetAudience'),
            cta: t('distribute.callToAction'),
            market: t('distribute.market'),
            tone: t('distribute.brandTone'),
            sellingPoints: t('distribute.sellingPoints'),
            avoidTerms: t('distribute.avoidTerms'),
            empty: t('common.none'),
          },
          platformCopy: {
            defaultDraft: t('distribute.defaultDraftLabel'),
            activeDraft: t('distribute.activeDraft'),
            accountCount: t('distribute.copyCardAccountCount'),
            noAccounts: t('distribute.copyCardNoAccounts'),
            caption: t('distribute.caption'),
            captionPlaceholder: t('distribute.captionPlaceholder'),
            hashtags: t('distribute.hashtags'),
            hashtagsPlaceholder: t('distribute.hashtagsPlaceholder'),
            inheritedFallback: t('distribute.copyCardInheritedFallback'),
          },
        }}
        onCaptionHintChange={setCaptionHint}
        onLanguageChange={(lang) => void handleLanguageChange(lang)}
        onGenerateCaption={() => void handleGenerateCaption()}
        onSetActiveDraft={setActiveDraftKey}
        onUpdateDraft={updateDraft}
      />

      <DistributeStepAccounts
        accounts={accounts}
        accountsForPermission={accountsForPermission}
        filteredAccounts={filteredAccounts}
        selectedIds={selectedIds}
        loading={loading}
        error={error}
        regions={regions}
        platforms={platforms}
        filterRegion={filterRegion}
        filterPlatform={filterPlatform}
        labels={{
          step: '03',
          title: t('distribute.targetAccounts'),
          loadingAccounts: t('distribute.loadingAccounts'),
          noAccountsTitle: t('distribute.noAccountsTitle'),
          noAccountsHintLine1: t('distribute.noAccountsHintLine1'),
          noAccountsHintLine2: t('distribute.noAccountsHintLine2'),
          learnGeelark: t('distribute.learnGeelark'),
          noPermissionTitle: t('distribute.noPermissionTitle'),
          noPermissionHint: t('distribute.noPermissionHint'),
          selectedCountLabel: t('distribute.selectedCountLabel'),
          selectVisible: t('distribute.selectVisible'),
          clearSelection: t('distribute.clearSelection'),
          region: t('distribute.region'),
          platform: t('distribute.platform'),
          all: t('common.all'),
          noMatchedAccounts: t('distribute.noMatchedAccounts'),
          profileLink: t('distribute.profileLink'),
          accountGroups: {
            title: t('distribute.accountGroupsTitle'),
            empty: t('distribute.accountGroupsEmpty'),
            config: t('distribute.accountGroupsConfig'),
            custom: t('distribute.accountGroupsCustom'),
            selected: t('distribute.accountGroupsSelected'),
            save: t('distribute.accountGroupsSave'),
            savePlaceholder: t('distribute.accountGroupsSavePlaceholder'),
            cancel: t('common.cancel'),
            delete: t('common.delete'),
            selectedCount: t('distribute.accountGroupsSelectedCount'),
          },
        }}
        onSelectVisible={handleSelectVisible}
        onClearSelection={handleClearSelection}
        onFilterRegionChange={setFilterRegion}
        onFilterPlatformChange={setFilterPlatform}
        onApplyAccountGroup={handleApplyAccountGroup}
        onToggleAccount={handleToggleAccount}
      />

      <DistributeStepPublish
        preflightItems={preflightItems}
        needShareLink={needShareLink}
        markAI={markAI}
        pushing={pushing}
        publishDisabled={pushing || selectedIds.size === 0 || !selectedAsset}
        pushError={pushError}
        showGroupedHint={selectedPlatformKeys.length > 1}
        latestBatch={latestBatch}
        batchRefreshing={batchRefreshing}
        formatTime={(timestamp) => formatDateTime(timestamp, uiLocale)}
        labels={{
          step: '04',
          title: t('distribute.preflightTitle'),
          subtitle: t('distribute.preflightSubtitle'),
          ready: t('distribute.preflightReady'),
          missing: t('distribute.preflightMissing'),
          publishOptions: t('distribute.publishOptions'),
          needShareLink: t('distribute.needShareLink'),
          markAI: t('distribute.markAI'),
          publish: t('distribute.publish'),
          publishing: t('distribute.publishing'),
          groupedByPlatform: t('distribute.publishGroupedByPlatform'),
          latestBatch: {
            title: t('distribute.latestBatchTitle'),
            meta: t('distribute.latestBatchMeta'),
            summaryTotal: t('distribute.batchSummaryTotal'),
            summarySuccess: t('distribute.batchSummarySuccess'),
            summaryFailed: t('distribute.batchSummaryFailed'),
            summaryPending: t('distribute.batchSummaryPending'),
            statusSubmitting: t('distribute.batchStatusSubmitting'),
            statusSubmitFailed: t('distribute.batchStatusSubmitFailed'),
            statusSubmitted: t('distribute.batchStatusSubmitted'),
            hintSubmitting: t('distribute.latestBatchHintSubmitting'),
            hintRunning: t('distribute.latestBatchHintRunning'),
            hintDone: t('distribute.latestBatchHintDone'),
            refresh: t('common.refresh'),
            refreshing: t('distribute.batchRefreshing'),
            close: t('common.close'),
            unknown: t('common.unknown'),
            profileLink: t('distribute.profileLink'),
            reportPlanName: t('distribute.reportPlanName'),
            taskId: t('distribute.batchTaskId'),
            logs: t('distribute.batchLogs'),
            shareLink: t('distribute.batchShareLink'),
          },
        }}
        onNeedShareLinkChange={setNeedShareLink}
        onMarkAIChange={setMarkAI}
        onPublish={() => void handlePush()}
        onRefreshBatch={(batch) => void refreshBatch(batch)}
        onClearBatch={() => setLatestBatch(null)}
      />

      <div className="mb-6 space-y-4">
        {historyError && <p className="text-sm text-[var(--color-error)]">{historyError}</p>}
        <DistributePublishHistory
          title={t('distribute.historyTitle')}
          items={historyItems}
          activeTaskId={historyDetailId}
          loading={historyLoading}
          onSelectTask={(item) => void handleLoadHistoryDetail(item.taskId)}
          selectLabel={(item) => (
            historyDetailLoading && historyDetailId === item.taskId
              ? t('distribute.reportLoading')
              : t('distribute.historyInspect')
          )}
          formatTime={(timestamp) => formatDateTime(timestamp, uiLocale)}
          headerAction={(
            <button
              type="button"
              onClick={() => void loadTaskHistory()}
              disabled={historyLoading}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
            >
              {historyLoading ? t('distribute.batchRefreshing') : t('common.refresh')}
            </button>
          )}
          labels={{
            emptyTitle: t('distribute.historyEmpty'),
            emptyHint: t('distribute.historyEmptyHint'),
            filteredEmptyTitle: t('distribute.historyFilteredEmpty'),
            filteredEmptyHint: t('distribute.historyFilteredEmptyHint'),
            shareLink: t('distribute.batchShareLink'),
            select: t('distribute.historyInspect'),
            loading: t('distribute.historyLoading'),
            statusAll: t('distribute.historyStatusAll'),
            statusSuccess: t('distribute.historyStatusSuccess'),
            statusFailed: t('distribute.historyStatusFailed'),
            statusPending: t('distribute.historyStatusPending'),
            allPlatforms: t('distribute.historyAllPlatforms'),
            platformFilter: t('distribute.historyPlatformFilter'),
            searchLabel: t('distribute.historySearchLabel'),
            searchPlaceholder: t('distribute.historySearchPlaceholder'),
            filteredSummary: t('distribute.historyFilteredSummary'),
            taskLabel: t('distribute.batchTaskId'),
            accountCount: t('distribute.historyAccountCount'),
            unknownDate: t('distribute.historyUnknownDate'),
          }}
        />

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
      </div>
    </div>
  );
}

function normalizePlatformKey(platform?: string | null): string {
  return platform?.trim().toLowerCase() || DEFAULT_DRAFT_KEY;
}

function buildCaptionGenerationSeed(promptSeed: string, captionHint: string): string {
  const hint = captionHint.trim();
  return [
    promptSeed.trim(),
    hint ? `Operator hint: ${hint}` : '',
  ].filter(Boolean).join('\n\n');
}

function splitContextList(value: string): string[] {
  return value
    .split(/[\n,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildCaptionCampaignContext(draft: PendingDistributionDraft | null): CaptionCampaignContext | undefined {
  if (!draft) return undefined;
  const context = draft.captionContext;
  const complianceNotes = [
    context.toneRules,
    context.sellingPoints,
    draft.campaignContext.marketTruth.join(' | '),
    draft.campaignContext.visualCues.join(' | '),
  ].map((item) => item.trim()).filter(Boolean).join(' | ');

  return {
    campaignObjective: context.campaignObjective.trim() || undefined,
    targetAudience: context.targetAudience.trim() || undefined,
    callToAction: context.callToAction.trim() || undefined,
    targetMarket: context.targetMarket.trim() || undefined,
    complianceNotes: complianceNotes || undefined,
    bannedPhrases: uniqueStrings([
      ...splitContextList(context.avoidTerms),
      ...draft.campaignContext.forbiddenClaims,
    ]),
  };
}

function buildCopyCardKeys(
  selectedPlatformKeys: string[],
  draftKeys: string[],
  defaultDraftKey: string,
): string[] {
  const keys = new Set<string>();
  selectedPlatformKeys.forEach((key) => keys.add(key || defaultDraftKey));
  draftKeys.forEach((key) => keys.add(key || defaultDraftKey));
  if (keys.size === 0) keys.add(defaultDraftKey);
  return [...keys];
}

function buildPlatformAccountCounts(
  accounts: GeelarkAccount[],
  draftKeys: string[],
  defaultDraftKey: string,
): Record<string, number> {
  return Object.fromEntries(
    draftKeys.map((key) => [
      key,
      key === defaultDraftKey
        ? accounts.length
        : accounts.filter((account) => normalizePlatformKey(account.platform) === key).length,
    ]),
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
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
  packageAsset: DistributeAssetOption | null,
  currentAsset: DistributeAssetOption | null,
  localAssets: DistributeAssetOption[],
  outputAssets: DistributeAssetOption[],
): DistributeAssetOption[] {
  const merged = [packageAsset, currentAsset, ...localAssets, ...outputAssets].filter(Boolean) as DistributeAssetOption[];
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
  if (source === 'package') return t('distribute.assetPendingPackage');
  if (source === 'current') return t('distribute.assetCurrent');
  if (source === 'local') return t('distribute.assetLocal');
  return t('distribute.assetOutput');
}

function buildPackageAssetOption(draft: PendingDistributionDraft): DistributeAssetOption | null {
  if (!draft.selectedAsset) return null;
  return {
    id: `package:${draft.packageId}:${draft.selectedAsset.id}`,
    source: 'package',
    title: draft.selectedAsset.title,
    subtitle: draft.title,
    videoPath: draft.selectedAsset.videoPath,
    videoUrl: draft.selectedAsset.videoPath
      ? getVideoFileUrl(draft.selectedAsset.videoPath)
      : draft.selectedAsset.videoUrl,
    createdAt: Date.now(),
  };
}
