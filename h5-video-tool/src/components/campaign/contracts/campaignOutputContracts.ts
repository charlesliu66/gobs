import type {
  CreativeIssueTag,
  CreativeOutputType,
  CreativeQualityStatus,
} from '../quality/creativeQualityTypes.ts';

export type CampaignContractEntityType = 'campaign' | 'asset' | 'output' | 'review' | 'package';

export interface CampaignContract {
  campaignId: string;
  briefId: string;
  title: string;
  objective: string;
  createdAt: string;
  ownerId?: string;
}

export type CampaignAssetCategory =
  | 'character_image'
  | 'scene_image'
  | 'ui_screenshot'
  | 'logo'
  | 'gameplay_screenshot'
  | 'video_clip'
  | 'finished_banner'
  | 'reference_image';

export interface AssetContract {
  assetId: string;
  campaignId?: string;
  category: CampaignAssetCategory;
  label: string;
  mimeType?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  createdAt: string;
}

export interface OutputContract {
  outputId: string;
  campaignId: string;
  outputType: CreativeOutputType;
  title: string;
  assetIds: string[];
  parentOutputId?: string;
  qualityStatus?: CreativeQualityStatus;
  createdAt: string;
}

export interface ReviewContract {
  reviewId: string;
  outputId: string;
  status: CreativeQualityStatus;
  issueTags: CreativeIssueTag[];
  note?: string;
  parentOutputId?: string;
  reviewerId?: string;
  createdAt: string;
}

export interface PackageContract {
  packageId: string;
  campaignId: string;
  outputIds: string[];
  title: string;
  targetPlatforms: string[];
  createdAt: string;
}

export interface CampaignOutputContractGraph {
  campaigns: CampaignContract[];
  assets: AssetContract[];
  outputs: OutputContract[];
  reviews: ReviewContract[];
  packages: PackageContract[];
}

export interface CampaignOutputContractIssue {
  entity: CampaignContractEntityType;
  id: string;
  relation: string;
  message: string;
}

function uniqueIds<T>(items: T[], getId: (item: T) => string): Set<string> {
  return new Set(items.map(getId));
}

function duplicateIds<T>(items: T[], getId: (item: T) => string): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  items.forEach((item) => {
    const id = getId(item);
    if (seen.has(id)) {
      duplicates.add(id);
      return;
    }
    seen.add(id);
  });
  return [...duplicates];
}

function duplicateIssue(
  entity: CampaignContractEntityType,
  id: string,
): CampaignOutputContractIssue {
  return {
    entity,
    id,
    relation: 'unique_id',
    message: `${entity} id must be unique: ${id}`,
  };
}

export function validateCampaignOutputContractGraph(
  graph: CampaignOutputContractGraph,
): CampaignOutputContractIssue[] {
  const issues: CampaignOutputContractIssue[] = [];
  const campaignIds = uniqueIds(graph.campaigns, (campaign) => campaign.campaignId);
  const assetIds = uniqueIds(graph.assets, (asset) => asset.assetId);
  const outputIds = uniqueIds(graph.outputs, (output) => output.outputId);

  duplicateIds(graph.campaigns, (campaign) => campaign.campaignId)
    .forEach((id) => issues.push(duplicateIssue('campaign', id)));
  duplicateIds(graph.assets, (asset) => asset.assetId)
    .forEach((id) => issues.push(duplicateIssue('asset', id)));
  duplicateIds(graph.outputs, (output) => output.outputId)
    .forEach((id) => issues.push(duplicateIssue('output', id)));
  duplicateIds(graph.reviews, (review) => review.reviewId)
    .forEach((id) => issues.push(duplicateIssue('review', id)));
  duplicateIds(graph.packages, (pkg) => pkg.packageId)
    .forEach((id) => issues.push(duplicateIssue('package', id)));

  graph.assets.forEach((asset) => {
    if (asset.campaignId && !campaignIds.has(asset.campaignId)) {
      issues.push({
        entity: 'asset',
        id: asset.assetId,
        relation: 'Asset.campaignId',
        message: `Asset references missing campaignId: ${asset.campaignId}`,
      });
    }
  });

  graph.outputs.forEach((output) => {
    if (!campaignIds.has(output.campaignId)) {
      issues.push({
        entity: 'output',
        id: output.outputId,
        relation: 'Output.campaignId',
        message: `Output references missing campaignId: ${output.campaignId}`,
      });
    }

    output.assetIds.forEach((assetId) => {
      if (!assetIds.has(assetId)) {
        issues.push({
          entity: 'output',
          id: output.outputId,
          relation: 'Output.assetIds',
          message: `Output references missing assetId: ${assetId}`,
        });
      }
    });

    if (output.parentOutputId) {
      if (output.parentOutputId === output.outputId) {
        issues.push({
          entity: 'output',
          id: output.outputId,
          relation: 'Output.parentOutputId',
          message: 'Output cannot reference itself as parentOutputId.',
        });
      } else if (!outputIds.has(output.parentOutputId)) {
        issues.push({
          entity: 'output',
          id: output.outputId,
          relation: 'Output.parentOutputId',
          message: `Output references missing parentOutputId: ${output.parentOutputId}`,
        });
      }
    }
  });

  graph.reviews.forEach((review) => {
    if (!outputIds.has(review.outputId)) {
      issues.push({
        entity: 'review',
        id: review.reviewId,
        relation: 'Review.outputId',
        message: `Review references missing outputId: ${review.outputId}`,
      });
    }

    if (review.parentOutputId && !outputIds.has(review.parentOutputId)) {
      issues.push({
        entity: 'review',
        id: review.reviewId,
        relation: 'Review.parentOutputId',
        message: `Review references missing parentOutputId: ${review.parentOutputId}`,
      });
    }
  });

  graph.packages.forEach((pkg) => {
    if (!campaignIds.has(pkg.campaignId)) {
      issues.push({
        entity: 'package',
        id: pkg.packageId,
        relation: 'Package.campaignId',
        message: `Package references missing campaignId: ${pkg.campaignId}`,
      });
    }

    pkg.outputIds.forEach((outputId) => {
      const output = graph.outputs.find((candidate) => candidate.outputId === outputId);
      if (!output) {
        issues.push({
          entity: 'package',
          id: pkg.packageId,
          relation: 'Package.outputIds',
          message: `Package references missing outputId: ${outputId}`,
        });
        return;
      }

      if (output.campaignId !== pkg.campaignId) {
        issues.push({
          entity: 'package',
          id: pkg.packageId,
          relation: 'Package.outputIds',
          message: `Package output ${outputId} belongs to campaignId ${output.campaignId}, not ${pkg.campaignId}.`,
        });
      }
    });
  });

  return issues;
}

export function isCampaignOutputContractGraphValid(graph: CampaignOutputContractGraph): boolean {
  return validateCampaignOutputContractGraph(graph).length === 0;
}

export const creativeContractFixtures: CampaignOutputContractGraph = {
  campaigns: [
    {
      campaignId: 'campaign_gold_glory_rewards',
      briefId: 'brief_rewards_window',
      title: 'Gold and Glory reward window',
      objective: 'Drive installs with a reward-first UA message.',
      createdAt: '2026-05-10T00:00:00.000Z',
      ownerId: 'team_growth',
    },
  ],
  assets: [
    {
      assetId: 'asset_gold_glory_key_art',
      campaignId: 'campaign_gold_glory_rewards',
      category: 'reference_image',
      label: 'Approved key art with hero and reward chest',
      mimeType: 'image/png',
      width: 1600,
      height: 900,
      createdAt: '2026-05-10T00:01:00.000Z',
    },
    {
      assetId: 'asset_reward_ui_screenshot',
      campaignId: 'campaign_gold_glory_rewards',
      category: 'ui_screenshot',
      label: 'Reward reveal UI screenshot',
      mimeType: 'image/png',
      width: 1080,
      height: 1920,
      createdAt: '2026-05-10T00:02:00.000Z',
    },
  ],
  outputs: [
    {
      outputId: 'output_banner_usable',
      campaignId: 'campaign_gold_glory_rewards',
      outputType: 'banner',
      title: '1:1 reward-first install banner',
      assetIds: ['asset_gold_glory_key_art', 'asset_reward_ui_screenshot'],
      qualityStatus: 'usable',
      createdAt: '2026-05-10T00:10:00.000Z',
    },
    {
      outputId: 'output_story_video_needs_fix',
      campaignId: 'campaign_gold_glory_rewards',
      outputType: 'story_video',
      title: 'Reward reveal story video',
      assetIds: ['asset_reward_ui_screenshot'],
      qualityStatus: 'needs_fix',
      createdAt: '2026-05-10T00:20:00.000Z',
    },
    {
      outputId: 'output_platform_copy_unusable',
      campaignId: 'campaign_gold_glory_rewards',
      outputType: 'platform_copy',
      title: 'Install caption with unsupported claim',
      assetIds: [],
      parentOutputId: 'output_story_video_needs_fix',
      qualityStatus: 'unusable',
      createdAt: '2026-05-10T00:30:00.000Z',
    },
  ],
  reviews: [
    {
      reviewId: 'review_banner_usable',
      outputId: 'output_banner_usable',
      status: 'usable',
      issueTags: [],
      note: 'Brief fit, reward payoff, and CTA are clear.',
      reviewerId: 'operator_a',
      createdAt: '2026-05-10T00:11:00.000Z',
    },
    {
      reviewId: 'review_story_video_needs_fix',
      outputId: 'output_story_video_needs_fix',
      status: 'needs_fix',
      issueTags: ['weak_opening', 'slow_pacing'],
      note: 'Direction works, but first three seconds need a stronger payoff.',
      reviewerId: 'operator_a',
      createdAt: '2026-05-10T00:21:00.000Z',
    },
    {
      reviewId: 'review_platform_copy_unusable',
      outputId: 'output_platform_copy_unusable',
      status: 'unusable',
      issueTags: ['copy_not_strong_enough', 'platform_fit_issue'],
      parentOutputId: 'output_story_video_needs_fix',
      note: 'Caption uses an unsupported guaranteed reward claim.',
      reviewerId: 'operator_a',
      createdAt: '2026-05-10T00:31:00.000Z',
    },
  ],
  packages: [
    {
      packageId: 'package_gold_glory_ready_assets',
      campaignId: 'campaign_gold_glory_rewards',
      outputIds: ['output_banner_usable'],
      title: 'Gold and Glory ready-to-distribute assets',
      targetPlatforms: ['tiktok', 'facebook'],
      createdAt: '2026-05-10T00:40:00.000Z',
    },
  ],
};
