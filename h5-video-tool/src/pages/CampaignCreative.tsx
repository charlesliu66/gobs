import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  generateCampaignMissionBrief,
  type CampaignMissionBriefResponse,
  type DerivedCampaignKnowledgeContext,
} from '../api/campaignCreative.ts';
import {
  saveKnowledgeCitationFeedback,
  listKnowledgeCitationFeedback,
  type CampaignKnowledgeCitation,
  type CampaignKnowledgeCitationFeedbackState,
} from '../api/campaignKnowledge.ts';
import { listAssets, recordUsage, type LibraryAsset } from '../api/assetLibraryApi.ts';
import { createCampaignDistributionPackage } from '../api/campaignDistribution.ts';
import { createCampaignOutputPlan, updateCampaignOutputPlan } from '../api/campaignOutputPlan.ts';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { AssetPicker } from '../components/AssetPicker';
import { CampaignOutputWorkbench } from '../components/campaign/CampaignOutputWorkbench';
import { buildCampaignStudioHandoff } from '../components/campaign/studioBridge.ts';
import { DistributionPackagePanel } from '../components/campaign/DistributionPackagePanel';
import { GeneratedBriefReview } from '../components/campaign/GeneratedBriefReview';
import { MissionComposer } from '../components/campaign/MissionComposer';
import { CampaignPendingActionsCard } from '../components/campaign/CampaignPendingActionsCard';
import { CampaignPlanCard } from '../components/campaign/CampaignPlanCard';
import { CampaignStrategyCard } from '../components/campaign/CampaignStrategyCard';
import { CampaignStrategyTuningPanel } from '../components/campaign/CampaignStrategyTuningPanel';
import {
  buildCampaignDistributionCreateInput,
  buildCampaignDistributionCreateInputFromProductionItem,
  type CampaignDistributionPackage,
} from '../components/campaign/distributionPackage.ts';
import {
  applySourceAssetSelectionOverrides,
  buildAvailableSourceAssetsFromLibraryAssets,
  buildCampaignOutputPlan,
  markProducedOutputQuality,
  produceSupportedCampaignOutputs,
  sourceAssetFilterType,
  updateSourceAssetRequirementMatches,
  type CampaignOutputPlan,
  type GameSourceAssetRequirement,
  type ProductionItem,
} from '../components/campaign/outputPlan.ts';
import { appendNextVersionDraftToPlan } from '../components/campaign/feedback/creativeFeedbackActions.ts';
import {
  buildFeedbackByCitationId,
  GOLD_AND_GLORY_CAMPAIGN_GAME_ID,
  selectVisibleKnowledgeCitations,
  type KnowledgeFeedbackByCitationId,
} from '../components/campaign/knowledgeTraceability.ts';
import type { CreativeFeedbackInput } from '../components/campaign/feedback/creativeFeedbackTypes.ts';
import type { CreativeQualityStatus } from '../components/campaign/quality/creativeQualityTypes.ts';
import type {
  CampaignCreativeBrief,
  CampaignCreativeFormState,
  CampaignCreativeHandoffPayload,
  CampaignCreativeMode,
  CampaignCreativeStrategy,
  CampaignCreativeStrategyTuning,
  CampaignCreativeVariantPack,
  CampaignPlan,
  CampaignProfile,
  FeedbackRecord,
} from '../components/campaign/model';
import {
  buildBriefFromForm,
  buildCampaignPendingActions,
  buildCampaignPlan,
  buildCampaignProfile,
  buildDefaultStrategyTuning,
  buildStrategyFromBrief,
  buildVariantPackFromStrategy,
  describeCampaignAutomationLevel,
} from '../components/campaign/strategy';

const CAMPAIGN_CREATIVE_HANDOFF_STORAGE_KEYS = [
  'campaign_creative_handoff',
  'campaign_creative_editor_handoff',
] as const;

type CampaignCreativeLocationState = {
  seedIdea?: string;
  defaultMode?: CampaignCreativeMode;
} | null;

const DEFAULT_FORM_STATE: CampaignCreativeFormState = {
  mode: 'tiktok_content',
  objective: '',
  audience: '',
  sellingPointsText: '',
  cta: '',
  referenceStyle: '',
  region: '',
  forbiddenClaimsText: '',
};

function inferMissionMode(mission: string): CampaignCreativeMode {
  return /ua|user acquisition|cpi|install|download|conversion|转化|买量|下载|投放/i.test(mission)
    ? 'tiktok_ua'
    : 'tiktok_content';
}

function sourceAssetSearchQuery(requirement: GameSourceAssetRequirement): string {
  switch (requirement.assetType) {
    case 'gameplay_recording':
      return 'gameplay recording combat';
    case 'hero_skill_clip':
      return 'hero skill gameplay';
    case 'game_logo':
      return 'logo app icon';
    case 'character_art':
      return 'character hero skin';
    case 'key_art':
      return 'key art poster cover';
    case 'reward_icon':
      return 'reward icon chest gem';
    case 'store_badge':
      return 'store badge download';
    case 'event_banner':
      return 'event banner';
    case 'ui_screenshot':
      return 'ui screenshot';
    default:
      return requirement.label;
  }
}

function buildFormStateFromBrief(brief: CampaignCreativeBrief): CampaignCreativeFormState {
  return {
    mode: brief.mode,
    objective: brief.objective ?? '',
    audience: brief.audience ?? '',
    sellingPointsText: brief.sellingPoints.join('\n'),
    cta: brief.cta ?? '',
    referenceStyle: brief.referenceStyle ?? '',
    region: brief.region ?? '',
    forbiddenClaimsText: brief.forbiddenClaims?.join('\n') ?? '',
  };
}

function buildAppliedKnowledgeContext(
  strategy: CampaignCreativeStrategy,
  knowledgeContext: DerivedCampaignKnowledgeContext | null,
): DerivedCampaignKnowledgeContext | undefined {
  const selectedPackIds =
    strategy.knowledgePackIds.length > 0
      ? strategy.knowledgePackIds
      : (knowledgeContext?.selectedPackIds ?? []);
  const hasKnowledge = Boolean(
    selectedPackIds.length > 0 ||
    strategy.marketTruth.length > 0 ||
    strategy.audienceTension.length > 0 ||
    strategy.toneRules.length > 0 ||
    strategy.forbiddenClaims.length > 0 ||
    strategy.approvedAngles.length > 0 ||
    strategy.hookCandidates.length > 0 ||
    strategy.visualCues.length > 0 ||
    (knowledgeContext?.rationaleNotes.length ?? 0) > 0,
  );
  if (!hasKnowledge) {
    return undefined;
  }

  return {
    selectedPackIds,
    marketTruth: strategy.marketTruth,
    audienceTension: strategy.audienceTension,
    toneRules: strategy.toneRules,
    forbiddenClaims: strategy.forbiddenClaims,
    approvedAngles: strategy.approvedAngles,
    hookCandidates: strategy.hookCandidates,
    visualCues: strategy.visualCues,
    rationaleNotes: knowledgeContext?.rationaleNotes ?? [],
  };
}

function buildMissionControlState(input: {
  brief: CampaignCreativeBrief;
  strategy: CampaignCreativeStrategy;
  variantPack: CampaignCreativeVariantPack;
  knowledgeContext: DerivedCampaignKnowledgeContext | null;
  previousProfile?: CampaignProfile | null;
}): {
  campaignProfile: CampaignProfile;
  campaignPlan: CampaignPlan;
} {
  const campaignProfile = buildCampaignProfile(input.brief, {
    campaignId: input.previousProfile?.campaignId,
    automationLevel: input.previousProfile?.automationLevel,
    knowledgeContext: input.knowledgeContext ?? undefined,
  });
  const campaignPlan = buildCampaignPlan(input.brief, input.strategy, {
    campaignId: campaignProfile.campaignId,
    automationLevel: campaignProfile.automationLevel,
    variantPack: input.variantPack,
    knowledgeContext: input.knowledgeContext ?? undefined,
  });

  return { campaignProfile, campaignPlan };
}

export function CampaignCreative() {
  const { t, uiLocale } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as CampaignCreativeLocationState;

  const [mission, setMission] = useState(routeState?.seedIdea ?? '');
  const [modeTouched, setModeTouched] = useState(Boolean(routeState?.defaultMode));
  const [formState, setFormState] = useState<CampaignCreativeFormState>(() => ({
    ...DEFAULT_FORM_STATE,
    mode: routeState?.defaultMode ?? inferMissionMode(routeState?.seedIdea ?? ''),
  }));
  const [missionBriefResult, setMissionBriefResult] = useState<CampaignMissionBriefResponse | null>(null);
  const [missionBriefLoading, setMissionBriefLoading] = useState(false);
  const [missionBriefError, setMissionBriefError] = useState<string | null>(null);
  const [brief, setBrief] = useState<CampaignCreativeBrief | null>(null);
  const [strategy, setStrategy] = useState<CampaignCreativeStrategy | null>(null);
  const [strategyTuning, setStrategyTuning] = useState<CampaignCreativeStrategyTuning | null>(null);
  const [variantPack, setVariantPack] = useState<CampaignCreativeVariantPack | null>(null);
  const [campaignProfile, setCampaignProfile] = useState<CampaignProfile | null>(null);
  const [campaignPlan, setCampaignPlan] = useState<CampaignPlan | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [knowledgeContext, setKnowledgeContext] = useState<DerivedCampaignKnowledgeContext | null>(null);
  const [knowledgeFeedbackById, setKnowledgeFeedbackById] = useState<KnowledgeFeedbackByCitationId>({});
  const [distributionPackageLoading, setDistributionPackageLoading] = useState(false);
  const [distributionPackageError, setDistributionPackageError] = useState<string | null>(null);
  const [createdDistributionPackage, setCreatedDistributionPackage] = useState<CampaignDistributionPackage | null>(null);
  const [outputPlanLoading, setOutputPlanLoading] = useState(false);
  const [outputPlanError, setOutputPlanError] = useState<string | null>(null);
  const [createdOutputPlan, setCreatedOutputPlan] = useState<CampaignOutputPlan | null>(null);
  const [assetLibraryAssets, setAssetLibraryAssets] = useState<LibraryAsset[]>([]);
  const [sourceAssetSelections, setSourceAssetSelections] = useState<Record<string, string[]>>({});
  const [assetPickerRequirement, setAssetPickerRequirement] = useState<GameSourceAssetRequirement | null>(null);
  const feedbackRecords: FeedbackRecord[] = [];

  const strategyNotice = missionBriefResult?.warnings[0] ?? null;
  const automationSummary = campaignProfile
    ? describeCampaignAutomationLevel(campaignProfile.automationLevel)
    : '';
  const pendingActions =
    brief && strategy
      ? buildCampaignPendingActions(brief, strategy, {
          automationLevel: campaignProfile?.automationLevel,
          variantCount: variantPack?.variants.length,
        })
      : [];

  useEffect(() => {
    if (!routeState) return;
    setMission((prev) => prev || routeState.seedIdea || '');
    setFormState((prev) => ({
      ...prev,
      mode: routeState.defaultMode ?? (modeTouched ? prev.mode : inferMissionMode(routeState.seedIdea ?? prev.objective)),
    }));
    if (routeState.defaultMode) {
      setModeTouched(true);
    }
  }, [modeTouched, routeState]);

  useEffect(() => {
    let cancelled = false;
    listAssets({ pageSize: '100' })
      .then((result) => {
        if (!cancelled) setAssetLibraryAssets(result.assets);
      })
      .catch(() => {
        if (!cancelled) setAssetLibraryAssets([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    listKnowledgeCitationFeedback(GOLD_AND_GLORY_CAMPAIGN_GAME_ID)
      .then((result) => {
        if (!cancelled) setKnowledgeFeedbackById(buildFeedbackByCitationId(result.feedback));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const modeOptions = useMemo(
    () => [
      {
        value: 'tiktok_content' as const,
        title: t('campaignCreative.mode.brandContent.title'),
        description: t('campaignCreative.mode.brandContent.description'),
      },
      {
        value: 'tiktok_ua' as const,
        title: t('campaignCreative.mode.tiktokUa.title'),
        description: t('campaignCreative.mode.tiktokUa.description'),
      },
    ],
    [t],
  );

  const distributionPackageDraft = useMemo(() => {
    if (!brief || !strategy) return null;
    return buildCampaignDistributionCreateInput({
      mission,
      brief,
      strategy,
      variantPack,
      selectedVariantId,
      knowledgeContext,
      routedKnowledgePackIds: missionBriefResult?.routedKnowledgePackIds,
      generationSource: missionBriefResult?.generationSource ?? 'fallback',
      warnings: missionBriefResult?.warnings ?? [],
    });
  }, [brief, knowledgeContext, mission, missionBriefResult, selectedVariantId, strategy, variantPack]);

  const producedDistributionPackageDraft = useMemo(() => {
    if (!brief || !strategy || !createdOutputPlan) return null;
    const producedItem = createdOutputPlan.items.find((item) => item.status === 'produced' && item.type === 'banner')
      ?? createdOutputPlan.items.find((item) =>
        item.status === 'produced' && item.outputAssetIds.some((assetId) =>
          item.producedOutputs?.some((output) => output.id === assetId),
        ),
      )
      ?? createdOutputPlan.items.find((item) => item.status === 'produced');
    if (!producedItem) return null;
    return buildCampaignDistributionCreateInputFromProductionItem({
      mission,
      brief,
      strategy,
      variantPack,
      selectedVariantId,
      knowledgeContext,
      routedKnowledgePackIds: missionBriefResult?.routedKnowledgePackIds,
      generationSource: missionBriefResult?.generationSource ?? 'fallback',
      warnings: missionBriefResult?.warnings ?? [],
      productionItem: producedItem,
      outputAssets: [],
      sourceAssetRequirements: createdOutputPlan.sourceAssetRequirements,
    });
  }, [brief, createdOutputPlan, knowledgeContext, mission, missionBriefResult, selectedVariantId, strategy, variantPack]);

  const activeDistributionPackageDraft = producedDistributionPackageDraft ?? distributionPackageDraft;

  const availableSourceAssets = useMemo(
    () => buildAvailableSourceAssetsFromLibraryAssets(assetLibraryAssets),
    [assetLibraryAssets],
  );

  const assetNamesById = useMemo(
    () => Object.fromEntries(assetLibraryAssets.map((asset) => [asset.id, asset.filename])),
    [assetLibraryAssets],
  );

  const campaignOutputPlanDraft = useMemo(() => {
    if (!brief) return null;
    const draft = buildCampaignOutputPlan({
      mission,
      brief,
      strategy,
      variantPack,
      selectedVariantId,
      requestedPlatforms: ['tiktok', 'facebook'],
      availableSourceAssets,
      knowledgeContext,
    });
    return applySourceAssetSelectionOverrides(draft, sourceAssetSelections);
  }, [availableSourceAssets, brief, knowledgeContext, mission, selectedVariantId, sourceAssetSelections, strategy, variantPack]);

  const visibleKnowledgeCitations = useMemo(
    () => selectVisibleKnowledgeCitations(missionBriefResult?.knowledgeContext ?? knowledgeContext, 6),
    [knowledgeContext, missionBriefResult],
  );

  const brainStatus = useMemo(() => {
    if (missionBriefLoading) {
      return {
        state: 'loading' as const,
        label: t('campaignCreative.mission.brainLoading'),
        detail: t('campaignCreative.mission.brainLoadingDetail'),
      };
    }
    if (missionBriefError) {
      return {
        state: 'warning' as const,
        label: t('campaignCreative.mission.brainFallback'),
        detail: t('campaignCreative.mission.brainFallbackDetail'),
      };
    }
    return {
      state: 'ready' as const,
      label: t('campaignCreative.mission.brainReady'),
      detail: t('campaignCreative.mission.brainReadyDetail'),
    };
  }, [missionBriefError, missionBriefLoading, t]);

  const handleKnowledgeFeedback = async (
    citation: CampaignKnowledgeCitation,
    state: CampaignKnowledgeCitationFeedbackState,
  ) => {
    setKnowledgeFeedbackById((current) => ({
      ...current,
      [citation.citationId]: state,
    }));
    try {
      const result = await saveKnowledgeCitationFeedback(GOLD_AND_GLORY_CAMPAIGN_GAME_ID, {
        citationId: citation.citationId,
        state,
        packId: citation.packId,
        section: citation.section,
        value: citation.value,
      });
      setKnowledgeFeedbackById((current) => ({
        ...current,
        [result.feedback.citationId]: result.feedback.state,
      }));
    } catch {
      const refreshed = await listKnowledgeCitationFeedback(GOLD_AND_GLORY_CAMPAIGN_GAME_ID).catch(() => null);
      if (refreshed) {
        setKnowledgeFeedbackById(buildFeedbackByCitationId(refreshed.feedback));
      }
    }
  };

  const handleFormChange = (patch: Partial<CampaignCreativeFormState>) => {
    setFormState((prev) => ({ ...prev, ...patch }));
  };

  const resetDistributionPackageState = () => {
    setDistributionPackageError(null);
    setCreatedDistributionPackage(null);
    setOutputPlanError(null);
    setCreatedOutputPlan(null);
  };

  const handleMissionChange = (value: string) => {
    resetDistributionPackageState();
    setMission(value);
    if (!modeTouched) {
      setFormState((prev) => ({ ...prev, mode: inferMissionMode(value) }));
    }
  };

  const handleModeChange = (mode: CampaignCreativeMode) => {
    resetDistributionPackageState();
    setModeTouched(true);
    setFormState((prev) => ({ ...prev, mode }));
  };

  const handleGenerateMissionBrief = async () => {
    const trimmedMission = mission.trim();
    if (!trimmedMission || missionBriefLoading) return;

    resetDistributionPackageState();
    setMissionBriefLoading(true);
    setMissionBriefError(null);
    try {
      const result = await generateCampaignMissionBrief({
        mission: trimmedMission,
        mode: formState.mode,
        uiLocale: uiLocale === 'en' ? 'en' : 'zh',
      });
      setMissionBriefResult(result);
      setFormState(buildFormStateFromBrief(result.brief));
      setBrief(null);
      setStrategy(null);
      setStrategyTuning(null);
      setVariantPack(null);
      setCampaignProfile(null);
      setCampaignPlan(null);
      setSelectedVariantId(null);
      setKnowledgeContext(result.knowledgeContext);
    } catch (error) {
      setMissionBriefError(error instanceof Error ? error.message : t('campaignCreative.mission.error'));
    } finally {
      setMissionBriefLoading(false);
    }
  };

  const handleConfirmBrief = () => {
    resetDistributionPackageState();
    const reviewedBrief = buildBriefFromForm(formState);
    const nextBrief = {
      ...reviewedBrief,
      briefId: missionBriefResult?.brief.briefId ?? reviewedBrief.briefId,
    };
    const nextTuning = buildDefaultStrategyTuning(nextBrief);
    const nextKnowledgeContext = missionBriefResult?.knowledgeContext ?? knowledgeContext ?? undefined;
    const nextStrategy = buildStrategyFromBrief(nextBrief, {
      tuning: nextTuning,
      knowledgeContext: nextKnowledgeContext,
    });
    const nextVariantPack = buildVariantPackFromStrategy(nextBrief, nextStrategy);
    const nextMissionControl = buildMissionControlState({
      brief: nextBrief,
      strategy: nextStrategy,
      variantPack: nextVariantPack,
      knowledgeContext: nextKnowledgeContext ?? null,
      previousProfile: null,
    });

    setBrief(nextBrief);
    setStrategyTuning(nextTuning);
    setStrategy(nextStrategy);
    setVariantPack(nextVariantPack);
    setCampaignProfile(nextMissionControl.campaignProfile);
    setCampaignPlan(nextMissionControl.campaignPlan);
    setSelectedVariantId(nextVariantPack.selectedVariantId);
    setKnowledgeContext(nextKnowledgeContext ?? null);
  };

  const handleStrategyTuningChange = (patch: Partial<CampaignCreativeStrategyTuning>) => {
    if (!brief || !strategyTuning) return;
    resetDistributionPackageState();
    const nextTuning = { ...strategyTuning, ...patch };
    setStrategyTuning(nextTuning);
    setStrategy((current) => {
      const nextStrategy = buildStrategyFromBrief(brief, {
        tuning: nextTuning,
        strategyId: current?.strategyId,
        knowledgeContext: knowledgeContext ?? undefined,
      });
      const nextVariantPack = buildVariantPackFromStrategy(brief, nextStrategy);
      const nextMissionControl = buildMissionControlState({
        brief,
        strategy: nextStrategy,
        variantPack: nextVariantPack,
        knowledgeContext,
        previousProfile: campaignProfile,
      });
      setVariantPack(nextVariantPack);
      setCampaignProfile(nextMissionControl.campaignProfile);
      setCampaignPlan(nextMissionControl.campaignPlan);
      setSelectedVariantId((currentSelected) =>
        currentSelected && nextVariantPack.variants.some((variant) => variant.variantId === currentSelected)
          ? currentSelected
          : nextVariantPack.selectedVariantId,
      );
      return nextStrategy;
    });
  };

  const handleStrategyTuningReset = () => {
    if (!brief) return;
    resetDistributionPackageState();
    const nextTuning = buildDefaultStrategyTuning(brief);
    setStrategyTuning(nextTuning);
    setStrategy((current) => {
      const nextStrategy = buildStrategyFromBrief(brief, {
        tuning: nextTuning,
        strategyId: current?.strategyId,
        knowledgeContext: knowledgeContext ?? undefined,
      });
      const nextVariantPack = buildVariantPackFromStrategy(brief, nextStrategy);
      const nextMissionControl = buildMissionControlState({
        brief,
        strategy: nextStrategy,
        variantPack: nextVariantPack,
        knowledgeContext,
        previousProfile: campaignProfile,
      });
      setVariantPack(nextVariantPack);
      setCampaignProfile(nextMissionControl.campaignProfile);
      setCampaignPlan(nextMissionControl.campaignPlan);
      setSelectedVariantId((currentSelected) =>
        currentSelected && nextVariantPack.variants.some((variant) => variant.variantId === currentSelected)
          ? currentSelected
          : nextVariantPack.selectedVariantId,
      );
      return nextStrategy;
    });
  };

  const handleLaunchEditor = () => {
    if (!brief || !strategy) return;
    const selectedVariant =
      variantPack?.variants.find((variant) => variant.variantId === selectedVariantId) ??
      variantPack?.variants[0];
    const appliedKnowledgeContext = buildAppliedKnowledgeContext(strategy, knowledgeContext);
    const payload: CampaignCreativeHandoffPayload = {
      brief,
      strategy,
      variantPack: variantPack
        ? {
            ...variantPack,
            selectedVariantId: selectedVariant?.variantId ?? variantPack.selectedVariantId,
          }
        : undefined,
      selectedVariant,
      campaignProfile: campaignProfile ?? undefined,
      campaignPlan: campaignPlan ?? undefined,
      feedbackRecords: feedbackRecords.length > 0 ? feedbackRecords : undefined,
      knowledgePackIds: appliedKnowledgeContext?.selectedPackIds ?? strategy.knowledgePackIds,
      knowledgeContext: appliedKnowledgeContext,
      source: 'campaign-creative',
      createdAt: Date.now(),
    };
    const serializedPayload = JSON.stringify(payload);
    CAMPAIGN_CREATIVE_HANDOFF_STORAGE_KEYS.forEach((key) => {
      sessionStorage.setItem(key, serializedPayload);
    });
    navigate('/editor', { state: { fromCampaignCreative: true } });
  };

  const handleSelectVariant = (variantId: string) => {
    resetDistributionPackageState();
    setSelectedVariantId(variantId);
    setVariantPack((current) => (current ? { ...current, selectedVariantId: variantId } : current));
  };

  const handleCreateDistributionPackage = async () => {
    if (!activeDistributionPackageDraft || distributionPackageLoading) return;
    setDistributionPackageLoading(true);
    setDistributionPackageError(null);
    try {
      const createdPackage = await createCampaignDistributionPackage(activeDistributionPackageDraft);
      setCreatedDistributionPackage(createdPackage);
    } catch (error) {
      setDistributionPackageError(
        error instanceof Error ? error.message : t('campaignCreative.distributionPackage.error'),
      );
    } finally {
      setDistributionPackageLoading(false);
    }
  };

  const handleSelectSourceAssets = async (assets: LibraryAsset[]) => {
    const requirement = assetPickerRequirement;
    if (!requirement) return;
    const matchedAssetIds = assets.map((asset) => asset.id);
    setAssetPickerRequirement(null);
    setSourceAssetSelections((current) => ({
      ...current,
      [requirement.id]: matchedAssetIds,
    }));
    void Promise.all(
      matchedAssetIds.map((assetId) =>
        recordUsage(assetId, `campaign-source-asset:${requirement.assetType}`).catch(() => undefined),
      ),
    );

    if (!createdOutputPlan) return;
    const nextPlan = updateSourceAssetRequirementMatches(createdOutputPlan, requirement.id, matchedAssetIds);
    setCreatedOutputPlan(nextPlan);
    setOutputPlanLoading(true);
    setOutputPlanError(null);
    try {
      const confirmedPlan = await updateCampaignOutputPlan(createdOutputPlan.id, {
        status: nextPlan.status,
        items: nextPlan.items,
        sourceAssetRequirements: nextPlan.sourceAssetRequirements,
        capabilityGaps: nextPlan.capabilityGaps,
      });
      setCreatedOutputPlan(confirmedPlan);
    } catch (error) {
      setOutputPlanError(error instanceof Error ? error.message : t('campaignCreative.outputWorkbench.error'));
    } finally {
      setOutputPlanLoading(false);
    }
  };

  const handleConfirmOutputProduction = async () => {
    const planToProduce = createdOutputPlan ?? campaignOutputPlanDraft;
    if (!planToProduce || !brief || outputPlanLoading) return;
    setOutputPlanLoading(true);
    setOutputPlanError(null);
    try {
      const producedPlan = produceSupportedCampaignOutputs({
        plan: planToProduce,
        mission,
        brief,
        strategy,
        variantPack,
        selectedVariantId,
        knowledgeContext,
      });
      let confirmedPlan: CampaignOutputPlan;
      if (createdOutputPlan) {
        confirmedPlan = await updateCampaignOutputPlan(createdOutputPlan.id, {
          status: producedPlan.status,
          items: producedPlan.items,
          sourceAssetRequirements: producedPlan.sourceAssetRequirements,
          capabilityGaps: producedPlan.capabilityGaps,
        });
      } else {
        confirmedPlan = await createCampaignOutputPlan(producedPlan);
      }
      setCreatedOutputPlan(confirmedPlan);
    } catch (error) {
      setOutputPlanError(error instanceof Error ? error.message : t('campaignCreative.outputWorkbench.error'));
    } finally {
      setOutputPlanLoading(false);
    }
  };

  const handleMarkBannerQuality = async (
    item: ProductionItem,
    output: NonNullable<ProductionItem['producedOutputs']>[number],
    status: CreativeQualityStatus,
  ) => {
    if (!createdOutputPlan || outputPlanLoading) return;
    const nextPlan = markProducedOutputQuality(createdOutputPlan, item.id, output.id, status);
    setCreatedOutputPlan(nextPlan);
    setOutputPlanLoading(true);
    setOutputPlanError(null);
    try {
      const confirmedPlan = await updateCampaignOutputPlan(createdOutputPlan.id, {
        status: nextPlan.status,
        items: nextPlan.items,
        sourceAssetRequirements: nextPlan.sourceAssetRequirements,
        capabilityGaps: nextPlan.capabilityGaps,
      });
      setCreatedOutputPlan(confirmedPlan);
    } catch (error) {
      setOutputPlanError(error instanceof Error ? error.message : t('campaignCreative.outputWorkbench.error'));
    } finally {
      setOutputPlanLoading(false);
    }
  };

  const handleCreateNextVersion = async (
    item: ProductionItem,
    output: NonNullable<ProductionItem['producedOutputs']>[number],
    feedback: CreativeFeedbackInput,
  ) => {
    if (!createdOutputPlan || outputPlanLoading) return;
    const feedbackInput = {
      ...feedback,
      reviewerId: 'campaign_operator',
      createdAt: new Date().toISOString(),
    };
    const nextPlan = appendNextVersionDraftToPlan(createdOutputPlan, item.id, output.id, feedbackInput);
    setCreatedOutputPlan(nextPlan);
    setOutputPlanLoading(true);
    setOutputPlanError(null);
    try {
      const confirmedPlan = await updateCampaignOutputPlan(createdOutputPlan.id, {
        status: nextPlan.status,
        items: nextPlan.items,
        sourceAssetRequirements: nextPlan.sourceAssetRequirements,
        capabilityGaps: nextPlan.capabilityGaps,
      });
      setCreatedOutputPlan(confirmedPlan);
    } catch (error) {
      setOutputPlanError(error instanceof Error ? error.message : t('campaignCreative.outputWorkbench.error'));
    } finally {
      setOutputPlanLoading(false);
    }
  };

  const handleOpenDistribution = () => {
    if (!createdDistributionPackage) return;
    navigate(`/distribute?package=${encodeURIComponent(createdDistributionPackage.id)}`);
  };

  const handleOpenProductionItemInStudio = (item: ProductionItem) => {
    const planToOpen = createdOutputPlan ?? campaignOutputPlanDraft;
    if (!planToOpen) return;
    const handoff = buildCampaignStudioHandoff({
      item,
      plan: planToOpen,
      distributionPackageId: createdDistributionPackage?.id,
    });
    if (!handoff) return;
    navigate(`/studio?templateId=${encodeURIComponent(handoff.templateId)}`, {
      state: { campaignStudioHandoff: handoff },
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 pb-12 pt-3">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#d5b56a]/20 bg-[linear-gradient(135deg,#10182c_0%,#1f2441_52%,#111827_100%)] px-6 py-8 shadow-[0_30px_100px_rgba(0,0,0,0.28)] sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#e6c66e]/18 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-full w-1/2 bg-[radial-gradient(circle_at_bottom_right,rgba(95,124,255,0.18),transparent_65%)]" />
        <div className="relative max-w-4xl">
          <span className="chip">{t('campaignCreative.hero.badge')}</span>
          <h1
            className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl"
            style={{ fontFamily: '"Space Grotesk", "Plus Jakarta Sans", sans-serif' }}
          >
            {t('campaignCreative.hero.title')}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c3ccef] sm:text-base">
            {t('campaignCreative.hero.subtitle')}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(420px,0.96fr)]">
        <div className="grid content-start gap-6">
          <MissionComposer
            mission={mission}
            mode={formState.mode}
            modeOptions={modeOptions}
            brainStatus={brainStatus}
            loading={missionBriefLoading}
            error={missionBriefError}
            onMissionChange={handleMissionChange}
            onModeChange={handleModeChange}
            onSubmit={handleGenerateMissionBrief}
            copy={{
              eyebrow: t('campaignCreative.mission.eyebrow'),
              title: t('campaignCreative.mission.title'),
              subtitle: t('campaignCreative.mission.subtitle'),
              placeholder: t('campaignCreative.mission.placeholder'),
              generate: t('campaignCreative.mission.generate'),
              generating: t('campaignCreative.mission.generating'),
              chipsTitle: t('campaignCreative.mission.chipsTitle'),
              brainTitle: t('campaignCreative.mission.brainTitle'),
            }}
          />

          {missionBriefResult ? (
            <GeneratedBriefReview
              value={formState}
              onChange={handleFormChange}
              onConfirm={handleConfirmBrief}
              sourceLabel={
                missionBriefResult.generationSource === 'llm'
                  ? t('campaignCreative.mission.sourceLlm')
                  : t('campaignCreative.mission.sourceFallback')
              }
              warnings={missionBriefResult.warnings}
              routedPackCount={missionBriefResult.routedKnowledgePackIds.length}
              knowledgeCitations={visibleKnowledgeCitations}
              knowledgeFeedbackById={knowledgeFeedbackById}
              onKnowledgeFeedback={handleKnowledgeFeedback}
              copy={{
                title: t('campaignCreative.review.title'),
                subtitle: t('campaignCreative.review.subtitle'),
                source: t('campaignCreative.review.source'),
                routedBrain: t('campaignCreative.review.routedBrain'),
                knowledgeCitationsTitle: t('campaignCreative.review.knowledgeCitationsTitle'),
                knowledgeCitationsSubtitle: t('campaignCreative.review.knowledgeCitationsSubtitle'),
                knowledgeNoCitations: t('campaignCreative.review.knowledgeNoCitations'),
                feedbackUseful: t('campaignCreative.review.feedbackUseful'),
                feedbackInaccurate: t('campaignCreative.review.feedbackInaccurate'),
                feedbackDoNotUseAgain: t('campaignCreative.review.feedbackDoNotUseAgain'),
                objective: t('campaignCreative.form.objective'),
                objectivePlaceholder: t('campaignCreative.form.objectivePlaceholder'),
                sellingPoints: t('campaignCreative.form.sellingPoints'),
                sellingPointsPlaceholder: t('campaignCreative.form.sellingPointsPlaceholder'),
                cta: t('campaignCreative.form.cta'),
                ctaPlaceholder: t('campaignCreative.form.ctaPlaceholder'),
                confirm: t('campaignCreative.review.confirm'),
                advanced: t('campaignCreative.review.advanced'),
                audience: t('campaignCreative.form.audience'),
                audiencePlaceholder: t('campaignCreative.form.audiencePlaceholder'),
                referenceStyle: t('campaignCreative.form.referenceStyle'),
                referenceStylePlaceholder: t('campaignCreative.form.referenceStylePlaceholder'),
                region: t('campaignCreative.form.region'),
                regionPlaceholder: t('campaignCreative.form.regionPlaceholder'),
                forbiddenClaims: t('campaignCreative.form.forbiddenClaims'),
                forbiddenClaimsPlaceholder: t('campaignCreative.form.forbiddenClaimsPlaceholder'),
              }}
            />
          ) : null}
        </div>

        <div className="grid content-start gap-6">
          <CampaignOutputWorkbench
            plan={campaignOutputPlanDraft}
            createdPlan={createdOutputPlan}
            isCreating={outputPlanLoading}
            errorMessage={outputPlanError}
            onConfirmProduction={handleConfirmOutputProduction}
            onOpenAssetLibrary={() => navigate('/asset-library')}
            onOpenQuickFilm={() => navigate('/quickfilm')}
            onOpenInStudio={handleOpenProductionItemInStudio}
            onCreateDistributionPackage={handleCreateDistributionPackage}
            onChooseSourceAsset={setAssetPickerRequirement}
            onUploadSourceAsset={(requirement) =>
              navigate('/asset-library', {
                state: {
                  fromCampaignCreative: true,
                  sourceAssetRequirementId: requirement.id,
                  sourceAssetType: requirement.assetType,
                },
              })
            }
            onMarkBannerQuality={handleMarkBannerQuality}
            onCreateNextVersion={handleCreateNextVersion}
            assetNamesById={assetNamesById}
            copy={{
              emptyTitle: t('campaignCreative.outputWorkbench.emptyTitle'),
              emptyBody: t('campaignCreative.outputWorkbench.emptyBody'),
              title: t('campaignCreative.outputWorkbench.title'),
              subtitle: t('campaignCreative.outputWorkbench.subtitle'),
              badge: t('campaignCreative.outputWorkbench.badge'),
              outputSummary: t('campaignCreative.outputWorkbench.outputSummary'),
              productionList: t('campaignCreative.outputWorkbench.productionList'),
              sourceAssetReadiness: t('campaignCreative.outputWorkbench.sourceAssetReadiness'),
              capabilityGaps: t('campaignCreative.outputWorkbench.capabilityGaps'),
              confirmProduction: t('campaignCreative.outputWorkbench.confirmProduction'),
              confirming: t('campaignCreative.outputWorkbench.confirming'),
              createPlan: t('campaignCreative.outputWorkbench.createPlan'),
              createdPlan: t('campaignCreative.outputWorkbench.createdPlan'),
              totalItems: t('campaignCreative.outputWorkbench.totalItems'),
              gobsReady: t('campaignCreative.outputWorkbench.gobsReady'),
              blocked: t('campaignCreative.outputWorkbench.blocked'),
              requiredAssets: t('campaignCreative.outputWorkbench.requiredAssets'),
              nextAction: t('campaignCreative.outputWorkbench.nextAction'),
              knowledgeReferences: t('campaignCreative.outputWorkbench.knowledgeReferences'),
              openAssetLibrary: t('campaignCreative.outputWorkbench.openAssetLibrary'),
              openQuickFilm: t('campaignCreative.outputWorkbench.openQuickFilm'),
              openInStudio: uiLocale === 'en' ? 'Open in Advanced Studio' : '送入 Advanced Studio',
              createDistributionPackage: t('campaignCreative.outputWorkbench.createDistributionPackage'),
              producedOutputs: t('campaignCreative.outputWorkbench.producedOutputs'),
              error: t('campaignCreative.outputWorkbench.error'),
              gapWorkaround: t('campaignCreative.outputWorkbench.gapWorkaround'),
              matchedAssets: t('campaignCreative.outputWorkbench.matchedAssets'),
              chooseAsset: t('campaignCreative.outputWorkbench.chooseAsset'),
              uploadAsset: t('campaignCreative.outputWorkbench.uploadAsset'),
              needsSelection: t('campaignCreative.outputWorkbench.needsSelection'),
              missingAsset: t('campaignCreative.outputWorkbench.missingAsset'),
              bannerSpecs: t('campaignCreative.outputWorkbench.bannerSpecs'),
              bannerMainVisual: t('campaignCreative.outputWorkbench.bannerMainVisual'),
              bannerShortCopy: t('campaignCreative.outputWorkbench.bannerShortCopy'),
              bannerCta: t('campaignCreative.outputWorkbench.bannerCta'),
              bannerPromptPlaceholder: t('campaignCreative.outputWorkbench.bannerPromptPlaceholder'),
              bannerQuality: t('campaignCreative.outputWorkbench.bannerQuality'),
              qualityUsable: t('campaignCreative.outputWorkbench.qualityUsable'),
              qualityNeedsFix: t('campaignCreative.outputWorkbench.qualityNeedsFix'),
              qualityUnusable: t('campaignCreative.outputWorkbench.qualityUnusable'),
              qualityPanelTitle: t('campaignCreative.outputWorkbench.qualityPanelTitle'),
              qualityPanelSubtitle: t('campaignCreative.outputWorkbench.qualityPanelSubtitle'),
              currentQuality: t('campaignCreative.outputWorkbench.currentQuality'),
              feedbackSignals: t('campaignCreative.outputWorkbench.feedbackSignals'),
              issueTags: t('campaignCreative.outputWorkbench.issueTags'),
              recommendation: t('campaignCreative.outputWorkbench.recommendation'),
              feedbackTags: t('campaignCreative.outputWorkbench.feedbackTags'),
              nextVersionNote: t('campaignCreative.outputWorkbench.nextVersionNote'),
              nextVersionNotePlaceholder: t('campaignCreative.outputWorkbench.nextVersionNotePlaceholder'),
              createNextVersion: t('campaignCreative.outputWorkbench.createNextVersion'),
              nextVersionUnsupported: t('campaignCreative.outputWorkbench.nextVersionUnsupported'),
              statusNotReviewed: t('campaignCreative.outputWorkbench.statusNotReviewed'),
              feedbackSellingPoint: t('campaignCreative.outputWorkbench.feedbackSellingPoint'),
              feedbackFirstThreeSeconds: t('campaignCreative.outputWorkbench.feedbackFirstThreeSeconds'),
              feedbackSlowPacing: t('campaignCreative.outputWorkbench.feedbackSlowPacing'),
              feedbackInaccurateCharacter: t('campaignCreative.outputWorkbench.feedbackInaccurateCharacter'),
              feedbackReferenceMotion: t('campaignCreative.outputWorkbench.feedbackReferenceMotion'),
              feedbackCopyStrength: t('campaignCreative.outputWorkbench.feedbackCopyStrength'),
              feedbackBetterTikTok: t('campaignCreative.outputWorkbench.feedbackBetterTikTok'),
              feedbackBetterFacebook: t('campaignCreative.outputWorkbench.feedbackBetterFacebook'),
            }}
          />

          <CampaignPlanCard
            plan={campaignPlan}
            profile={campaignProfile}
            automationSummary={automationSummary}
            copy={{
              emptyTitle: t('campaignCreative.plan.emptyTitle'),
              emptyBody: t('campaignCreative.plan.emptyBody'),
              title: t('campaignCreative.plan.title'),
              summary: t('campaignCreative.plan.summary'),
              automation: t('campaignCreative.plan.automation'),
              knowledge: t('campaignCreative.plan.knowledge'),
              production: t('campaignCreative.plan.production'),
              distribution: t('campaignCreative.plan.distribution'),
            }}
          />

          <CampaignPendingActionsCard
            items={pendingActions}
            notice={strategyNotice}
            copy={{
              title: t('campaignCreative.pending.title'),
              subtitle: t('campaignCreative.pending.subtitle'),
              empty: t('campaignCreative.pending.empty'),
            }}
          />

          <CampaignStrategyCard
            brief={brief}
            strategy={strategy}
            variantPack={variantPack}
            selectedVariantId={selectedVariantId}
            onSelectVariant={handleSelectVariant}
            onLaunchEditor={handleLaunchEditor}
            copy={{
              emptyTitle: t('campaignCreative.strategy.emptyTitle'),
              emptyBody: t('campaignCreative.strategy.emptyBody'),
              title: t('campaignCreative.strategy.title'),
              badge: t('campaignCreative.strategy.badge'),
              angle: t('campaignCreative.strategy.angle'),
              objective: t('campaignCreative.strategy.objective'),
              audience: t('campaignCreative.strategy.audience'),
              tone: t('campaignCreative.strategy.tone'),
              hookApproach: t('campaignCreative.strategy.hookApproach'),
              recommendedHook: t('campaignCreative.strategy.recommendedHook'),
              hookOptions: t('campaignCreative.strategy.hookOptions'),
              sellingPointFocus: t('campaignCreative.strategy.sellingPointFocus'),
              cta: t('campaignCreative.strategy.cta'),
              ctaType: t('campaignCreative.strategy.ctaType'),
              rationale: t('campaignCreative.strategy.rationale'),
              assetNeeds: t('campaignCreative.strategy.assetNeeds'),
              riskNotes: t('campaignCreative.strategy.riskNotes'),
              knowledgeSectionTitle: t('campaignCreative.strategy.knowledgeSectionTitle'),
              marketTruth: t('campaignCreative.strategy.marketTruth'),
              audienceTension: t('campaignCreative.strategy.audienceTension'),
              toneRules: t('campaignCreative.strategy.toneRules'),
              forbiddenClaims: t('campaignCreative.strategy.forbiddenClaims'),
              visualCues: t('campaignCreative.strategy.visualCues'),
              approvedAngles: t('campaignCreative.strategy.approvedAngles'),
              hookCandidates: t('campaignCreative.strategy.hookCandidates'),
              variantPackTitle: 'Variant Pack',
              variantPackSubtitle: uiLocale === 'en'
                ? 'Compare three creative directions before handing one to Advanced Studio.'
                : '先比较 3 个创意变体，再决定把哪一条送进 Advanced Studio。',
              variantHook: uiLocale === 'en' ? 'Variant hook' : 'Variant Hook',
              variantOpeningBeat: uiLocale === 'en' ? 'Opening beat' : '开场节奏',
              variantEditingDirection: uiLocale === 'en' ? 'Editing direction' : '剪辑方向',
              variantAssetSuggestion: uiLocale === 'en' ? 'Asset suggestion' : '素材建议',
              variantDifferenceSummary: uiLocale === 'en' ? 'Difference summary' : '差异说明',
              variantSelect: uiLocale === 'en' ? 'Choose this variant' : '选择这个变体',
              selectedVariant: uiLocale === 'en' ? 'Selected variant' : '当前变体',
              nextStepTitle: t('campaignCreative.strategy.nextStepTitle'),
              nextStepBody: t('campaignCreative.strategy.nextStepBody'),
              launchEditor: t('campaignCreative.strategy.launchEditor'),
              ctaTypeLabels: {
                directResponse: t('campaignCreative.tuning.optionLabels.directResponse'),
                softConversion: t('campaignCreative.tuning.optionLabels.softConversion'),
                brandFollow: t('campaignCreative.tuning.optionLabels.brandFollow'),
              },
              hookApproachLabels: {
                benefitFirst: t('campaignCreative.tuning.optionLabels.benefitFirst'),
                conflictFirst: t('campaignCreative.tuning.optionLabels.conflictFirst'),
                storyFirst: t('campaignCreative.tuning.optionLabels.storyFirst'),
              },
              variantEmphasisLabels: uiLocale === 'en'
                ? {
                    hookFocus: 'Hook difference',
                    sellingPointFocus: 'Selling-point difference',
                    ctaFocus: 'CTA difference',
                  }
                : {
                    hookFocus: 'Hook 差异',
                    sellingPointFocus: '卖点差异',
                    ctaFocus: 'CTA 差异',
              },
            }}
          />

          <DistributionPackagePanel
            draft={activeDistributionPackageDraft}
            createdPackage={createdDistributionPackage}
            isCreating={distributionPackageLoading}
            errorMessage={distributionPackageError}
            onCreate={handleCreateDistributionPackage}
            onContinue={handleOpenDistribution}
            onOpenAssetLibrary={() => navigate('/asset-library')}
            onOpenQuickFilm={() => navigate('/quickfilm')}
            onOpenEditor={handleLaunchEditor}
            copy={{
              emptyTitle: t('campaignCreative.distributionPackage.emptyTitle'),
              emptyBody: t('campaignCreative.distributionPackage.emptyBody'),
              title: t('campaignCreative.distributionPackage.title'),
              subtitle: t('campaignCreative.distributionPackage.subtitle'),
              badge: t('campaignCreative.distributionPackage.badge'),
              selectedVariant: t('campaignCreative.distributionPackage.selectedVariant'),
              objective: t('campaignCreative.distributionPackage.objective'),
              caption: t('campaignCreative.distributionPackage.caption'),
              platforms: t('campaignCreative.distributionPackage.platforms'),
              markets: t('campaignCreative.distributionPackage.markets'),
              assetState: t('campaignCreative.distributionPackage.assetState'),
              reviewStatus: t('campaignCreative.distributionPackage.reviewStatus'),
              warnings: t('campaignCreative.distributionPackage.warnings'),
              packageId: t('campaignCreative.distributionPackage.packageId'),
              create: t('campaignCreative.distributionPackage.create'),
              creating: t('campaignCreative.distributionPackage.creating'),
              continue: t('campaignCreative.distributionPackage.continue'),
              error: t('campaignCreative.distributionPackage.error'),
              createdTitle: t('campaignCreative.distributionPackage.createdTitle'),
              createdReadyBody: t('campaignCreative.distributionPackage.createdReadyBody'),
              createdNeedsAssetBody: t('campaignCreative.distributionPackage.createdNeedsAssetBody'),
              nextActionsTitle: t('campaignCreative.distributionPackage.nextActionsTitle'),
              openAssetLibrary: t('campaignCreative.distributionPackage.openAssetLibrary'),
              openQuickFilm: t('campaignCreative.distributionPackage.openQuickFilm'),
              fineTuneEditor: t('campaignCreative.distributionPackage.fineTuneEditor'),
              knowledge: {
                title: t('campaignCreative.distributionPackage.knowledge.title'),
                marketTruth: t('campaignCreative.distributionPackage.knowledge.marketTruth'),
                toneRules: t('campaignCreative.distributionPackage.knowledge.toneRules'),
                forbiddenClaims: t('campaignCreative.distributionPackage.knowledge.forbiddenClaims'),
              },
              assetStateLabels: {
                publishable: t('campaignCreative.distributionPackage.assetStateLabels.publishable'),
                needsAsset: t('campaignCreative.distributionPackage.assetStateLabels.needsAsset'),
                generating: t('campaignCreative.distributionPackage.assetStateLabels.generating'),
                failed: t('campaignCreative.distributionPackage.assetStateLabels.failed'),
              },
              reviewStatusLabels: {
                draft: t('campaignCreative.distributionPackage.reviewStatusLabels.draft'),
                needsReview: t('campaignCreative.distributionPackage.reviewStatusLabels.needsReview'),
                approved: t('campaignCreative.distributionPackage.reviewStatusLabels.approved'),
                readyToDistribute: t('campaignCreative.distributionPackage.reviewStatusLabels.readyToDistribute'),
                rejected: t('campaignCreative.distributionPackage.reviewStatusLabels.rejected'),
              },
            }}
          />

          <details
            data-section="advancedStrategyDetails"
            className="rounded-3xl border border-[var(--color-border)]/55 bg-[var(--color-surface-elevated)]"
          >
            <summary className="cursor-pointer list-none px-6 py-5">
              <div className="text-lg font-semibold text-[var(--color-text)]">
                {t('campaignCreative.tuning.title')}
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                {t('campaignCreative.tuning.subtitle')}
              </p>
            </summary>
            <div className="px-6 pb-6">
              <CampaignStrategyTuningPanel
                brief={brief}
                tuning={strategyTuning}
                onChange={handleStrategyTuningChange}
                onReset={handleStrategyTuningReset}
                copy={{
                  title: t('campaignCreative.tuning.title'),
                  subtitle: t('campaignCreative.tuning.subtitle'),
                  hookApproach: t('campaignCreative.tuning.hookApproach'),
                  sellingPointFocus: t('campaignCreative.tuning.sellingPointFocus'),
                  ctaType: t('campaignCreative.tuning.ctaType'),
                  reset: t('campaignCreative.tuning.reset'),
                  emptySellingPoints: t('campaignCreative.tuning.emptySellingPoints'),
                  optionLabels: {
                    benefitFirst: t('campaignCreative.tuning.optionLabels.benefitFirst'),
                    conflictFirst: t('campaignCreative.tuning.optionLabels.conflictFirst'),
                    storyFirst: t('campaignCreative.tuning.optionLabels.storyFirst'),
                    directResponse: t('campaignCreative.tuning.optionLabels.directResponse'),
                    softConversion: t('campaignCreative.tuning.optionLabels.softConversion'),
                    brandFollow: t('campaignCreative.tuning.optionLabels.brandFollow'),
                  },
                }}
              />
            </div>
          </details>
        </div>
      </section>

      {assetPickerRequirement ? (
        <AssetPicker
          key={assetPickerRequirement.id}
          multi
          filterType={sourceAssetFilterType(assetPickerRequirement.assetType)}
          initialQuery={sourceAssetSearchQuery(assetPickerRequirement)}
          initialSelectedIds={assetPickerRequirement.matchedAssetIds}
          title={t('campaignCreative.outputWorkbench.chooseAsset')}
          subtitle={assetPickerRequirement.label}
          searchPlaceholder={t('campaignCreative.outputWorkbench.assetSearchPlaceholder')}
          confirmLabel={t('campaignCreative.outputWorkbench.confirmAssetSelection')}
          onSelect={handleSelectSourceAssets}
          onClose={() => setAssetPickerRequirement(null)}
        />
      ) : null}
    </div>
  );
}
