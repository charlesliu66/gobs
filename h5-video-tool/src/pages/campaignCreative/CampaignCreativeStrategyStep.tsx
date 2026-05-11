import type { ComponentProps } from 'react';
import { CampaignStrategyCard } from '../../components/campaign/CampaignStrategyCard';
import { CampaignStrategyTuningPanel } from '../../components/campaign/CampaignStrategyTuningPanel';

type Translate = (key: string) => string;

type CampaignCreativeStrategyStepProps = {
  strategyCardProps: Omit<ComponentProps<typeof CampaignStrategyCard>, 'copy'>;
  tuningPanelProps: Pick<ComponentProps<typeof CampaignStrategyTuningPanel>, 'brief' | 'tuning' | 'onChange' | 'onReset'>;
  t: Translate;
  uiLocale: string;
};

export function CampaignCreativeStrategyStep({
  strategyCardProps,
  tuningPanelProps,
  t,
  uiLocale,
}: CampaignCreativeStrategyStepProps) {
  return (
    <>
      <CampaignStrategyCard
        {...strategyCardProps}
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
            {...tuningPanelProps}
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
    </>
  );
}
