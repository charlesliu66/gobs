import { useNavigate } from 'react-router-dom';
import { AssetPicker } from '../../components/AssetPicker';
import { sourceAssetFilterType } from '../../components/campaign/outputPlan.ts';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { CampaignCreativeBriefStep } from './CampaignCreativeBriefStep.tsx';
import { CampaignCreativeDistributionStep } from './CampaignCreativeDistributionStep.tsx';
import { CampaignCreativeOutputStep } from './CampaignCreativeOutputStep.tsx';
import { CampaignCreativeStrategyStep } from './CampaignCreativeStrategyStep.tsx';
import { sourceAssetSearchQuery, useCampaignCreativeState } from './useCampaignCreativeState.ts';

export function CampaignCreativePage() {
  const { t, uiLocale } = useLocale();
  const navigate = useNavigate();
  const {
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
  } = useCampaignCreativeState();

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
        <CampaignCreativeBriefStep
          mission={mission}
          mode={formState.mode}
          modeOptions={modeOptions}
          brainStatus={brainStatus}
          loading={missionBriefLoading}
          error={missionBriefError}
          onMissionChange={handleMissionChange}
          onModeChange={handleModeChange}
          onSubmit={handleGenerateMissionBrief}
          missionBriefResult={missionBriefResult}
          formState={formState}
          onFormChange={handleFormChange}
          onConfirmBrief={handleConfirmBrief}
          visibleKnowledgeCitations={visibleKnowledgeCitations}
          knowledgeFeedbackById={knowledgeFeedbackById}
          onKnowledgeFeedback={handleKnowledgeFeedback}
          t={t}
        />

        <div className="grid content-start gap-6">
          <CampaignCreativeOutputStep
            workbenchProps={{
              plan: campaignOutputPlanDraft,
              createdPlan: createdOutputPlan,
              isCreating: outputPlanLoading,
              errorMessage: outputPlanError,
              onConfirmProduction: handleConfirmOutputProduction,
              onOpenAssetLibrary: () => navigate('/asset-library'),
              onOpenQuickFilm: () => navigate('/quickfilm'),
              onOpenInStudio: handleOpenProductionItemInStudio,
              onCreateDistributionPackage: handleCreateDistributionPackage,
              onChooseSourceAsset: setAssetPickerRequirement,
              onUploadSourceAsset: (requirement) =>
                navigate('/asset-library', {
                  state: {
                    fromCampaignCreative: true,
                    sourceAssetRequirementId: requirement.id,
                    sourceAssetType: requirement.assetType,
                  },
                }),
              onMarkBannerQuality: handleMarkBannerQuality,
              onCreateNextVersion: handleCreateNextVersion,
              assetNamesById,
            }}
            planCardProps={{
              plan: campaignPlan,
              profile: campaignProfile,
              automationSummary,
            }}
            pendingActionsProps={{
              items: pendingActions,
              notice: strategyNotice,
            }}
            t={t}
            uiLocale={uiLocale}
          />

          <CampaignCreativeStrategyStep
            strategyCardProps={{
              brief,
              strategy,
              variantPack,
              selectedVariantId,
              onSelectVariant: handleSelectVariant,
              onLaunchEditor: handleLaunchEditor,
            }}
            tuningPanelProps={{
              brief,
              tuning: strategyTuning,
              onChange: handleStrategyTuningChange,
              onReset: handleStrategyTuningReset,
            }}
            t={t}
            uiLocale={uiLocale}
          />

          <CampaignCreativeDistributionStep
            panelProps={{
              draft: activeDistributionPackageDraft,
              createdPackage: createdDistributionPackage,
              isCreating: distributionPackageLoading,
              errorMessage: distributionPackageError,
              onCreate: handleCreateDistributionPackage,
              onContinue: handleOpenDistribution,
              onOpenAssetLibrary: () => navigate('/asset-library'),
              onOpenQuickFilm: () => navigate('/quickfilm'),
              onOpenEditor: handleLaunchEditor,
            }}
            t={t}
          />
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
