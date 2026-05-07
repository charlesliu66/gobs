import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  generateCampaignMissionBrief,
  type CampaignMissionBriefResponse,
  type DerivedCampaignKnowledgeContext,
} from '../api/campaignCreative.ts';
import { createCampaignDistributionPackage } from '../api/campaignDistribution.ts';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { DistributionPackagePanel } from '../components/campaign/DistributionPackagePanel';
import { GeneratedBriefReview } from '../components/campaign/GeneratedBriefReview';
import { MissionComposer } from '../components/campaign/MissionComposer';
import { CampaignPendingActionsCard } from '../components/campaign/CampaignPendingActionsCard';
import { CampaignPlanCard } from '../components/campaign/CampaignPlanCard';
import { CampaignStrategyCard } from '../components/campaign/CampaignStrategyCard';
import { CampaignStrategyTuningPanel } from '../components/campaign/CampaignStrategyTuningPanel';
import {
  buildCampaignDistributionCreateInput,
  type CampaignDistributionPackage,
} from '../components/campaign/distributionPackage.ts';
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
  const [distributionPackageLoading, setDistributionPackageLoading] = useState(false);
  const [distributionPackageError, setDistributionPackageError] = useState<string | null>(null);
  const [createdDistributionPackage, setCreatedDistributionPackage] = useState<CampaignDistributionPackage | null>(null);
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

  const handleFormChange = (patch: Partial<CampaignCreativeFormState>) => {
    setFormState((prev) => ({ ...prev, ...patch }));
  };

  const resetDistributionPackageState = () => {
    setDistributionPackageError(null);
    setCreatedDistributionPackage(null);
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
    if (!distributionPackageDraft || distributionPackageLoading) return;
    setDistributionPackageLoading(true);
    setDistributionPackageError(null);
    try {
      const createdPackage = await createCampaignDistributionPackage(distributionPackageDraft);
      setCreatedDistributionPackage(createdPackage);
    } catch (error) {
      setDistributionPackageError(
        error instanceof Error ? error.message : t('campaignCreative.distributionPackage.error'),
      );
    } finally {
      setDistributionPackageLoading(false);
    }
  };

  const handleOpenDistribution = () => {
    if (!createdDistributionPackage) return;
    navigate(`/distribute?package=${encodeURIComponent(createdDistributionPackage.id)}`);
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
              copy={{
                title: t('campaignCreative.review.title'),
                subtitle: t('campaignCreative.review.subtitle'),
                source: t('campaignCreative.review.source'),
                routedBrain: t('campaignCreative.review.routedBrain'),
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
            draft={distributionPackageDraft}
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

          <details className="rounded-3xl border border-[var(--color-border)]/55 bg-[var(--color-surface-elevated)]">
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
    </div>
  );
}
