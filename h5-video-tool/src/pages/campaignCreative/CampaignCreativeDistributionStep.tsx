import type { ComponentProps } from 'react';
import { DistributionPackagePanel } from '../../components/campaign/DistributionPackagePanel';

type Translate = (key: string) => string;

type CampaignCreativeDistributionStepProps = {
  panelProps: Omit<ComponentProps<typeof DistributionPackagePanel>, 'copy'>;
  t: Translate;
};

export function CampaignCreativeDistributionStep({
  panelProps,
  t,
}: CampaignCreativeDistributionStepProps) {
  return (
    <DistributionPackagePanel
      {...panelProps}
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
  );
}
