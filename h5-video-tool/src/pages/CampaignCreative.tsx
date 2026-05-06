import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { CampaignBriefForm } from '../components/campaign/CampaignBriefForm';
import { CampaignModeSwitch } from '../components/campaign/CampaignModeSwitch';
import { CampaignStrategyCard } from '../components/campaign/CampaignStrategyCard';
import { CampaignStrategyTuningPanel } from '../components/campaign/CampaignStrategyTuningPanel';
import type {
  CampaignCreativeBrief,
  CampaignCreativeFormState,
  CampaignCreativeMode,
  CampaignCreativeStrategy,
  CampaignCreativeStrategyTuning,
} from '../components/campaign/model';
import {
  buildBriefFromForm,
  buildDefaultStrategyTuning,
  buildStrategyFromBrief,
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

export function CampaignCreative() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as CampaignCreativeLocationState;

  const [formState, setFormState] = useState<CampaignCreativeFormState>(() => ({
    ...DEFAULT_FORM_STATE,
    mode: routeState?.defaultMode ?? DEFAULT_FORM_STATE.mode,
    objective: routeState?.seedIdea ?? '',
  }));
  const [brief, setBrief] = useState<CampaignCreativeBrief | null>(null);
  const [strategy, setStrategy] = useState<CampaignCreativeStrategy | null>(null);
  const [strategyTuning, setStrategyTuning] = useState<CampaignCreativeStrategyTuning | null>(null);

  useEffect(() => {
    if (!routeState) return;
    setFormState((prev) => ({
      ...prev,
      mode: routeState.defaultMode ?? prev.mode,
      objective: prev.objective || routeState.seedIdea || '',
    }));
  }, [routeState]);

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

  const handleGenerateStrategy = () => {
    const nextBrief = buildBriefFromForm(formState);
    const nextTuning = buildDefaultStrategyTuning(nextBrief);
    const nextStrategy = buildStrategyFromBrief(nextBrief, { tuning: nextTuning });
    setBrief(nextBrief);
    setStrategyTuning(nextTuning);
    setStrategy(nextStrategy);
  };

  const handleStrategyTuningChange = (patch: Partial<CampaignCreativeStrategyTuning>) => {
    if (!brief || !strategyTuning) return;
    const nextTuning = { ...strategyTuning, ...patch };
    setStrategyTuning(nextTuning);
    setStrategy((current) =>
      buildStrategyFromBrief(brief, {
        tuning: nextTuning,
        strategyId: current?.strategyId,
      }),
    );
  };

  const handleStrategyTuningReset = () => {
    if (!brief) return;
    const nextTuning = buildDefaultStrategyTuning(brief);
    setStrategyTuning(nextTuning);
    setStrategy((current) =>
      buildStrategyFromBrief(brief, {
        tuning: nextTuning,
        strategyId: current?.strategyId,
      }),
    );
  };

  const handleLaunchEditor = () => {
    if (!brief || !strategy) return;
    const payload = JSON.stringify({
      brief,
      strategy,
      source: 'campaign-creative',
      createdAt: Date.now(),
    });
    CAMPAIGN_CREATIVE_HANDOFF_STORAGE_KEYS.forEach((key) => {
      sessionStorage.setItem(key, payload);
    });
    navigate('/editor', { state: { fromCampaignCreative: true } });
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

          <CampaignStrategyCard
            brief={brief}
            strategy={strategy}
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
            }}
          />
        </div>
      </section>
    </div>
  );
}
