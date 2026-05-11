import type { ComponentProps } from 'react';
import { CampaignOutputWorkbench } from '../../components/campaign/CampaignOutputWorkbench';
import { CampaignPendingActionsCard } from '../../components/campaign/CampaignPendingActionsCard';
import { CampaignPlanCard } from '../../components/campaign/CampaignPlanCard';

type Translate = (key: string) => string;

type CampaignCreativeOutputStepProps = {
  workbenchProps: Omit<ComponentProps<typeof CampaignOutputWorkbench>, 'copy'>;
  planCardProps: Omit<ComponentProps<typeof CampaignPlanCard>, 'copy'>;
  pendingActionsProps: Omit<ComponentProps<typeof CampaignPendingActionsCard>, 'copy'>;
  t: Translate;
  uiLocale: string;
};

export function CampaignCreativeOutputStep({
  workbenchProps,
  planCardProps,
  pendingActionsProps,
  t,
  uiLocale,
}: CampaignCreativeOutputStepProps) {
  return (
    <>
      <CampaignOutputWorkbench
        {...workbenchProps}
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
          trueCoverage: t('campaignCreative.outputWorkbench.trueCoverage'),
          assistiveCoverage: t('campaignCreative.outputWorkbench.assistiveCoverage'),
          directCoverage: t('campaignCreative.outputWorkbench.directCoverage'),
          templateCoverage: t('campaignCreative.outputWorkbench.templateCoverage'),
          needsSourceAsset: t('campaignCreative.outputWorkbench.needsSourceAsset'),
          unsupportedCoverage: t('campaignCreative.outputWorkbench.unsupportedCoverage'),
          linkHealth: t('campaignCreative.outputWorkbench.linkHealth'),
          linkHealthy: t('campaignCreative.outputWorkbench.linkHealthy'),
          linkWarning: t('campaignCreative.outputWorkbench.linkWarning'),
          linkBroken: t('campaignCreative.outputWorkbench.linkBroken'),
          requiredAssets: t('campaignCreative.outputWorkbench.requiredAssets'),
          nextAction: t('campaignCreative.outputWorkbench.nextAction'),
          readinessStatus: t('campaignCreative.outputWorkbench.readinessStatus'),
          readinessAutoReady: t('campaignCreative.outputWorkbench.readinessAutoReady'),
          readinessTemplateReady: t('campaignCreative.outputWorkbench.readinessTemplateReady'),
          readinessBriefReady: t('campaignCreative.outputWorkbench.readinessBriefReady'),
          readinessNeedsSourceAsset: t('campaignCreative.outputWorkbench.readinessNeedsSourceAsset'),
          readinessUnsupported: t('campaignCreative.outputWorkbench.readinessUnsupported'),
          missingAssetsToUnblock: t('campaignCreative.outputWorkbench.missingAssetsToUnblock'),
          unsupportedReason: t('campaignCreative.outputWorkbench.unsupportedReason'),
          unsupportedReasonDetail: t('campaignCreative.outputWorkbench.unsupportedReasonDetail'),
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
        {...planCardProps}
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
        {...pendingActionsProps}
        copy={{
          title: t('campaignCreative.pending.title'),
          subtitle: t('campaignCreative.pending.subtitle'),
          empty: t('campaignCreative.pending.empty'),
        }}
      />
    </>
  );
}
