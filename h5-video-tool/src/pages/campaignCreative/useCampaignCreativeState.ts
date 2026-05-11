import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  generateCampaignMissionBrief,
  type CampaignMissionBriefResponse,
  type DerivedCampaignKnowledgeContext,
} from '../../api/campaignCreative.ts';
import {
  saveKnowledgeCitationFeedback,
  listKnowledgeCitationFeedback,
  type CampaignKnowledgeCitation,
  type CampaignKnowledgeCitationFeedbackState,
} from '../../api/campaignKnowledge.ts';
import { listAssets, recordUsage, type LibraryAsset } from '../../api/assetLibraryApi.ts';
import { createCampaignDistributionPackage } from '../../api/campaignDistribution.ts';
import { createCampaignOutputPlan, updateCampaignOutputPlan } from '../../api/campaignOutputPlan.ts';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { buildCampaignStudioHandoff } from '../../components/campaign/studioBridge.ts';
import {
  buildCampaignDistributionCreateInput,
  buildCampaignDistributionCreateInputFromProductionItem,
  type CampaignDistributionPackage,
} from '../../components/campaign/distributionPackage.ts';
import {
  applySourceAssetSelectionOverrides,
  buildAvailableSourceAssetsFromLibraryAssets,
  buildCampaignOutputPlan,
  markProducedOutputQuality,
  produceSupportedCampaignOutputs,
  updateSourceAssetRequirementMatches,
  type CampaignOutputPlan,
  type GameSourceAssetRequirement,
  type ProductionItem,
} from '../../components/campaign/outputPlan.ts';
import { appendNextVersionDraftToPlan } from '../../components/campaign/feedback/creativeFeedbackActions.ts';
import {
  buildFeedbackByCitationId,
  GOLD_AND_GLORY_CAMPAIGN_GAME_ID,
  selectVisibleKnowledgeCitations,
  type KnowledgeFeedbackByCitationId,
} from '../../components/campaign/knowledgeTraceability.ts';
import type { CreativeFeedbackInput } from '../../components/campaign/feedback/creativeFeedbackTypes.ts';
import type { CreativeQualityStatus } from '../../components/campaign/quality/creativeQualityTypes.ts';
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
} from '../../components/campaign/model';
import {
  buildBriefFromForm,
  buildCampaignPendingActions,
  buildCampaignPlan,
  buildCampaignProfile,
  buildDefaultStrategyTuning,
  buildStrategyFromBrief,
  buildVariantPackFromStrategy,
  describeCampaignAutomationLevel,
} from '../../components/campaign/strategy';

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

export function sourceAssetSearchQuery(requirement: GameSourceAssetRequirement): string {
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

export function useCampaignCreativeState() {
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
      campaignId: campaignProfile?.campaignId,
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
  }, [brief, campaignProfile?.campaignId, knowledgeContext, mission, missionBriefResult, selectedVariantId, strategy, variantPack]);

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
      campaignId: createdOutputPlan.campaignId ?? campaignProfile?.campaignId,
      outputPlanId: createdOutputPlan.id,
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
  }, [brief, campaignProfile?.campaignId, createdOutputPlan, knowledgeContext, mission, missionBriefResult, selectedVariantId, strategy, variantPack]);

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
      campaignId: campaignProfile?.campaignId,
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
  }, [availableSourceAssets, brief, campaignProfile?.campaignId, knowledgeContext, mission, selectedVariantId, sourceAssetSelections, strategy, variantPack]);

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
    const params = new URLSearchParams({
      templateId: handoff.templateId,
      outputPlan: handoff.outputPlanId,
      productionItem: handoff.productionItemId,
    });
    if (handoff.distributionPackageId) {
      params.set('package', handoff.distributionPackageId);
    }
    navigate(`/studio?${params.toString()}`, {
      state: { campaignStudioHandoff: handoff },
    });
  };

  return {
    mission,
    formState,
    missionBriefResult,
    missionBriefLoading,
    missionBriefError,
    brief,
    strategy,
    strategyTuning,
    variantPack,
    campaignProfile,
    campaignPlan,
    selectedVariantId,
    knowledgeFeedbackById,
    distributionPackageLoading,
    distributionPackageError,
    createdDistributionPackage,
    outputPlanLoading,
    outputPlanError,
    createdOutputPlan,
    assetPickerRequirement,
    strategyNotice,
    automationSummary,
    pendingActions,
    modeOptions,
    activeDistributionPackageDraft,
    assetNamesById,
    campaignOutputPlanDraft,
    visibleKnowledgeCitations,
    brainStatus,
    handleKnowledgeFeedback,
    handleFormChange,
    handleMissionChange,
    handleModeChange,
    handleGenerateMissionBrief,
    handleConfirmBrief,
    handleStrategyTuningChange,
    handleStrategyTuningReset,
    handleLaunchEditor,
    handleSelectVariant,
    handleCreateDistributionPackage,
    handleSelectSourceAssets,
    handleConfirmOutputProduction,
    handleMarkBannerQuality,
    handleCreateNextVersion,
    handleOpenDistribution,
    handleOpenProductionItemInStudio,
    setAssetPickerRequirement,
  };
}
