import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  deriveKnowledgeContext,
  type DerivedCampaignKnowledgeContext,
} from '../api/campaignKnowledge.ts';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { CampaignBriefForm } from '../components/campaign/CampaignBriefForm';
import { CampaignKnowledgeSelector } from '../components/campaign/CampaignKnowledgeSelector';
import { CampaignModeSwitch } from '../components/campaign/CampaignModeSwitch';
import { CampaignPendingActionsCard } from '../components/campaign/CampaignPendingActionsCard';
import { CampaignPlanCard } from '../components/campaign/CampaignPlanCard';
import { CampaignStrategyCard } from '../components/campaign/CampaignStrategyCard';
import { CampaignStrategyTuningPanel } from '../components/campaign/CampaignStrategyTuningPanel';
import type {
  CampaignPlan,
  CampaignProfile,
  CampaignCreativeBrief,
  CampaignCreativeFormState,
  CampaignCreativeHandoffPayload,
  CampaignCreativeMode,
  CampaignCreativeStrategy,
  CampaignCreativeStrategyTuning,
  CampaignCreativeVariantPack,
  FeedbackRecord,
} from '../components/campaign/model';
import {
  buildCampaignPendingActions,
  buildCampaignPlan,
  buildCampaignProfile,
  buildBriefFromForm,
  buildDefaultStrategyTuning,
  describeCampaignAutomationLevel,
  buildStrategyFromBrief,
  buildVariantPackFromStrategy,
} from '../components/campaign/strategy';
import { usePlatformMemory } from '../context/PlatformMemoryContext.tsx';

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

function sameStringList(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
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

  return {
    campaignProfile,
    campaignPlan,
  };
}

export function CampaignCreative() {
  const { t, uiLocale } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as CampaignCreativeLocationState;
  const {
    games,
    selectedGameId,
    knowledgePacks,
    knowledgeLoading,
    knowledgeError,
    knowledgeGameSupported,
    refreshKnowledgePacks,
  } = usePlatformMemory();

  const [formState, setFormState] = useState<CampaignCreativeFormState>(() => ({
    ...DEFAULT_FORM_STATE,
    mode: routeState?.defaultMode ?? DEFAULT_FORM_STATE.mode,
    objective: routeState?.seedIdea ?? '',
  }));
  const [brief, setBrief] = useState<CampaignCreativeBrief | null>(null);
  const [strategy, setStrategy] = useState<CampaignCreativeStrategy | null>(null);
  const [strategyTuning, setStrategyTuning] = useState<CampaignCreativeStrategyTuning | null>(null);
  const [variantPack, setVariantPack] = useState<CampaignCreativeVariantPack | null>(null);
  const [campaignProfile, setCampaignProfile] = useState<CampaignProfile | null>(null);
  const [campaignPlan, setCampaignPlan] = useState<CampaignPlan | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [knowledgeContext, setKnowledgeContext] = useState<DerivedCampaignKnowledgeContext | null>(null);
  const [selectedKnowledgeByGame, setSelectedKnowledgeByGame] = useState<Record<string, string[]>>({});
  const [knowledgeNotice, setKnowledgeNotice] = useState<string | null>(null);
  const feedbackRecords: FeedbackRecord[] = [];

  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) ?? games[0] ?? null,
    [games, selectedGameId],
  );
  const currentGameId = selectedGame?.id ?? selectedGameId;
  const selectedKnowledgePackIds = useMemo(() => {
    if (!currentGameId || !knowledgeGameSupported) {
      return [];
    }

    return selectedKnowledgeByGame[currentGameId] ?? [];
  }, [currentGameId, knowledgeGameSupported, selectedKnowledgeByGame]);
  const strategySelectionChanged =
    !!strategy && !sameStringList(strategy.knowledgePackIds, selectedKnowledgePackIds);
  const strategyNotice =
    knowledgeNotice ??
    (strategySelectionChanged ? t('campaignCreative.knowledge.selectionChanged') : null);
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
    setFormState((prev) => ({
      ...prev,
      mode: routeState.defaultMode ?? prev.mode,
      objective: prev.objective || routeState.seedIdea || '',
    }));
  }, [routeState]);

  useEffect(() => {
    if (!currentGameId || !knowledgeGameSupported) {
      return;
    }

    setSelectedKnowledgeByGame((prev) => {
      const hasSelection = Object.prototype.hasOwnProperty.call(prev, currentGameId);
      const availablePackIds = knowledgePacks.map((pack) => pack.packId);

      if (!hasSelection) {
        const readyPackIds = knowledgePacks
          .filter((pack) => pack.status === 'ready')
          .map((pack) => pack.packId);
        const defaultSelection = readyPackIds.length > 0 ? readyPackIds : availablePackIds;
        return { ...prev, [currentGameId]: defaultSelection };
      }

      const currentSelection = prev[currentGameId] ?? [];
      const filteredSelection = currentSelection.filter((packId) => availablePackIds.includes(packId));
      if (sameStringList(currentSelection, filteredSelection)) {
        return prev;
      }

      return { ...prev, [currentGameId]: filteredSelection };
    });
  }, [currentGameId, knowledgeGameSupported, knowledgePacks]);

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

  const handleFormChange = (patch: Partial<CampaignCreativeFormState>) => {
    setFormState((prev) => ({ ...prev, ...patch }));
  };

  const handleModeChange = (mode: CampaignCreativeMode) => {
    setFormState((prev) => ({ ...prev, mode }));
  };

  const handleGenerateStrategy = async () => {
    const nextBrief = buildBriefFromForm(formState);
    const nextTuning = buildDefaultStrategyTuning(nextBrief);
    let nextKnowledgeContext: DerivedCampaignKnowledgeContext | undefined;
    let nextKnowledgeNotice: string | null = null;

    if (currentGameId && knowledgeGameSupported && selectedKnowledgePackIds.length > 0) {
      try {
        const result = await deriveKnowledgeContext(currentGameId, selectedKnowledgePackIds);
        nextKnowledgeContext = result.context;
      } catch (error) {
        console.warn('Failed to derive campaign knowledge context', error);
        nextKnowledgeNotice = t('campaignCreative.knowledge.fallbackWarning');
      }
    }

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
    setKnowledgeNotice(nextKnowledgeNotice);
  };

  const handleStrategyTuningChange = (patch: Partial<CampaignCreativeStrategyTuning>) => {
    if (!brief || !strategyTuning) return;
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
    setSelectedVariantId(variantId);
    setVariantPack((current) => (current ? { ...current, selectedVariantId: variantId } : current));
  };

  const handleToggleKnowledgePack = (packId: string) => {
    if (!currentGameId || !knowledgeGameSupported) {
      return;
    }

    setKnowledgeNotice(null);
    setSelectedKnowledgeByGame((prev) => {
      const currentSelection = prev[currentGameId] ?? [];
      const nextSelection = currentSelection.includes(packId)
        ? currentSelection.filter((currentPackId) => currentPackId !== packId)
        : [...currentSelection, packId];
      return { ...prev, [currentGameId]: nextSelection };
    });
  };

  const handleSelectAllKnowledgePacks = () => {
    if (!currentGameId || !knowledgeGameSupported) {
      return;
    }

    setKnowledgeNotice(null);
    setSelectedKnowledgeByGame((prev) => ({
      ...prev,
      [currentGameId]: knowledgePacks.map((pack) => pack.packId),
    }));
  };

  const handleClearKnowledgeSelection = () => {
    if (!currentGameId || !knowledgeGameSupported) {
      return;
    }

    setKnowledgeNotice(null);
    setSelectedKnowledgeByGame((prev) => ({
      ...prev,
      [currentGameId]: [],
    }));
  };

  const handleRefreshKnowledge = () => {
    setKnowledgeNotice(null);
    void refreshKnowledgePacks();
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-12 pt-3">
      <section className="gobs-card relative overflow-hidden rounded-[28px] px-6 py-8 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(124,141,255,0.18),transparent_65%)]" />
        <div className="relative max-w-3xl">
          <span className="chip">{t('campaignCreative.hero.badge')}</span>
          <h1
            className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-5xl"
            style={{ fontFamily: '"Space Grotesk", "Plus Jakarta Sans", sans-serif' }}
          >
            {t('campaignCreative.hero.title')}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-text-muted)] sm:text-base">
            {t('campaignCreative.hero.subtitle')}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-6">
          <div className="rounded-3xl border border-[var(--color-border)]/55 bg-[var(--color-surface-elevated)] p-6">
            <div className="mb-4">
              <div className="text-lg font-semibold text-[var(--color-text)]">{t('campaignCreative.mode.title')}</div>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                {t('campaignCreative.mode.subtitle')}
              </p>
            </div>
            <CampaignModeSwitch value={formState.mode} options={modeOptions} onChange={handleModeChange} />
          </div>

          <CampaignKnowledgeSelector
            brainName={selectedGame?.name ?? 'Gold and Glory'}
            supported={knowledgeGameSupported}
            loading={knowledgeLoading}
            error={knowledgeError}
            selectedCountLabel={
              uiLocale === 'en'
                ? `${selectedKnowledgePackIds.length} selected`
                : `已选 ${selectedKnowledgePackIds.length} 个`
            }
            packs={knowledgePacks}
            selectedPackIds={selectedKnowledgePackIds}
            onTogglePack={handleToggleKnowledgePack}
            onSelectAll={handleSelectAllKnowledgePacks}
            onClearSelection={handleClearKnowledgeSelection}
            onRefresh={handleRefreshKnowledge}
            copy={{
              title: t('campaignCreative.knowledge.title'),
              subtitle: t('campaignCreative.knowledge.subtitle'),
              unsupportedTitle: t('campaignCreative.knowledge.unsupportedTitle'),
              unsupportedBody: t('campaignCreative.knowledge.unsupportedBody'),
              emptyTitle: t('campaignCreative.knowledge.emptyTitle'),
              emptyBody: t('campaignCreative.knowledge.emptyBody'),
              selectAll: t('campaignCreative.knowledge.selectAll'),
              clearSelection: t('campaignCreative.knowledge.clearSelection'),
              refresh: t('campaignCreative.knowledge.refresh'),
              packFacts: t('campaignCreative.knowledge.packFacts'),
              packHooks: t('campaignCreative.knowledge.packHooks'),
              packVisuals: t('campaignCreative.knowledge.packVisuals'),
              selected: t('campaignCreative.knowledge.selected'),
              optional: t('campaignCreative.knowledge.optional'),
            }}
          />

          <CampaignBriefForm
            value={formState}
            onChange={handleFormChange}
            onSubmit={handleGenerateStrategy}
            copy={{
              title: t('campaignCreative.form.title'),
              subtitle: t('campaignCreative.form.subtitle'),
              objective: t('campaignCreative.form.objective'),
              objectivePlaceholder: t('campaignCreative.form.objectivePlaceholder'),
              audience: t('campaignCreative.form.audience'),
              audiencePlaceholder: t('campaignCreative.form.audiencePlaceholder'),
              sellingPoints: t('campaignCreative.form.sellingPoints'),
              sellingPointsPlaceholder: t('campaignCreative.form.sellingPointsPlaceholder'),
              cta: t('campaignCreative.form.cta'),
              ctaPlaceholder: t('campaignCreative.form.ctaPlaceholder'),
              generateStrategy: t('campaignCreative.form.generateStrategy'),
              advancedTitle: t('campaignCreative.form.advancedTitle'),
              referenceStyle: t('campaignCreative.form.referenceStyle'),
              referenceStylePlaceholder: t('campaignCreative.form.referenceStylePlaceholder'),
              region: t('campaignCreative.form.region'),
              regionPlaceholder: t('campaignCreative.form.regionPlaceholder'),
              forbiddenClaims: t('campaignCreative.form.forbiddenClaims'),
              forbiddenClaimsPlaceholder: t('campaignCreative.form.forbiddenClaimsPlaceholder'),
            }}
          />
        </div>

        <div className="grid gap-6">
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
              variantPackTitle: uiLocale === 'en' ? 'Variant Pack' : 'Variant Pack',
              variantPackSubtitle: uiLocale === 'en'
                ? 'Compare three creative directions before handing one to the Editor.'
                : '先比较 3 个创意变体，再决定把哪一条送进 Editor。',
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
