import type { ComponentProps } from 'react';
import type { CampaignMissionBriefResponse } from '../../api/campaignCreative.ts';
import type {
  CampaignKnowledgeCitation,
  CampaignKnowledgeCitationFeedbackState,
} from '../../api/campaignKnowledge.ts';
import { GeneratedBriefReview } from '../../components/campaign/GeneratedBriefReview';
import { MissionComposer } from '../../components/campaign/MissionComposer';
import type {
  CampaignCreativeFormState,
  CampaignCreativeMode,
} from '../../components/campaign/model';
import type { KnowledgeFeedbackByCitationId } from '../../components/campaign/knowledgeTraceability.ts';

type Translate = (key: string) => string;

type CampaignCreativeBriefStepProps = {
  mission: string;
  mode: CampaignCreativeMode;
  modeOptions: ComponentProps<typeof MissionComposer>['modeOptions'];
  brainStatus: ComponentProps<typeof MissionComposer>['brainStatus'];
  loading: boolean;
  error: string | null;
  onMissionChange: (value: string) => void;
  onModeChange: (mode: CampaignCreativeMode) => void;
  onSubmit: () => void;
  missionBriefResult: CampaignMissionBriefResponse | null;
  formState: CampaignCreativeFormState;
  onFormChange: (patch: Partial<CampaignCreativeFormState>) => void;
  onConfirmBrief: () => void;
  visibleKnowledgeCitations: CampaignKnowledgeCitation[];
  knowledgeFeedbackById: KnowledgeFeedbackByCitationId;
  onKnowledgeFeedback: (
    citation: CampaignKnowledgeCitation,
    state: CampaignKnowledgeCitationFeedbackState,
  ) => Promise<void>;
  t: Translate;
};

export function CampaignCreativeBriefStep({
  mission,
  mode,
  modeOptions,
  brainStatus,
  loading,
  error,
  onMissionChange,
  onModeChange,
  onSubmit,
  missionBriefResult,
  formState,
  onFormChange,
  onConfirmBrief,
  visibleKnowledgeCitations,
  knowledgeFeedbackById,
  onKnowledgeFeedback,
  t,
}: CampaignCreativeBriefStepProps) {
  return (
    <div className="grid content-start gap-6">
      <MissionComposer
        mission={mission}
        mode={mode}
        modeOptions={modeOptions}
        brainStatus={brainStatus}
        loading={loading}
        error={error}
        onMissionChange={onMissionChange}
        onModeChange={onModeChange}
        onSubmit={onSubmit}
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
          onChange={onFormChange}
          onConfirm={onConfirmBrief}
          sourceLabel={
            missionBriefResult.generationSource === 'llm'
              ? t('campaignCreative.mission.sourceLlm')
              : t('campaignCreative.mission.sourceFallback')
          }
          warnings={missionBriefResult.warnings}
          routedPackCount={missionBriefResult.routedKnowledgePackIds.length}
          knowledgeCitations={visibleKnowledgeCitations}
          knowledgeFeedbackById={knowledgeFeedbackById}
          onKnowledgeFeedback={onKnowledgeFeedback}
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
  );
}
