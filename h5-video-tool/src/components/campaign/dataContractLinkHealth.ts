import type { CampaignDistributionPackage } from './distributionPackage.ts';
import type { CampaignOutputPlan, ProducedOutputDraft, ProductionItem } from './outputPlan.ts';

export type CampaignDataLinkHealthStatus = 'healthy' | 'warning' | 'broken';

export interface CampaignDataLinkHealth {
  status: CampaignDataLinkHealthStatus;
  facts: string[];
  issues: string[];
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim() ?? '').filter(Boolean))];
}

function statusFromIssues(issues: string[]): CampaignDataLinkHealthStatus {
  if (issues.some((issue) => issue.startsWith('BROKEN:'))) return 'broken';
  if (issues.length > 0) return 'warning';
  return 'healthy';
}

function producedOutputsForPlan(plan: CampaignOutputPlan): Array<{
  item: ProductionItem;
  output: ProducedOutputDraft;
}> {
  return plan.items.flatMap((item) =>
    (item.producedOutputs ?? []).map((output) => ({ item, output })),
  );
}

export function summarizeOutputPlanLinkHealth(plan: CampaignOutputPlan): CampaignDataLinkHealth {
  const issues: string[] = [];
  const producedOutputs = producedOutputsForPlan(plan);
  if (!plan.campaignId?.trim()) {
    issues.push('BROKEN: Output Plan is missing campaignId.');
  }
  if (!plan.briefId?.trim()) {
    issues.push('BROKEN: Output Plan is missing briefId.');
  }

  producedOutputs.forEach(({ item, output }) => {
    if (plan.campaignId && output.campaignId && output.campaignId !== plan.campaignId) {
      issues.push(`BROKEN: ${output.id} campaignId does not match the plan.`);
    }
    if (output.briefId && output.briefId !== plan.briefId) {
      issues.push(`BROKEN: ${output.id} briefId does not match the plan.`);
    }
    if (!output.campaignId) {
      issues.push(`WARN: ${output.id} is missing campaignId.`);
    }
    if (!output.briefId) {
      issues.push(`WARN: ${output.id} is missing briefId.`);
    }
    if (!output.parentOutputId) {
      issues.push(`WARN: ${output.id} is missing parentOutputId for ${item.id}.`);
    }
  });

  const outputIds = uniqueStrings([
    ...plan.items.flatMap((item) => item.outputAssetIds),
    ...producedOutputs.map(({ output }) => output.id),
  ]);
  const sourceAssetIds = uniqueStrings([
    ...plan.sourceAssetRequirements.flatMap((requirement) => requirement.matchedAssetIds),
    ...producedOutputs.flatMap(({ output }) => output.sourceAssetIds ?? []),
  ]);

  return {
    status: statusFromIssues(issues),
    facts: uniqueStrings([
      plan.campaignId ? `campaign:${plan.campaignId}` : null,
      plan.briefId ? `brief:${plan.briefId}` : null,
      plan.id ? `plan:${plan.id}` : null,
      outputIds.length > 0 ? `outputs:${outputIds.length}` : null,
      sourceAssetIds.length > 0 ? `assets:${sourceAssetIds.length}` : null,
    ]),
    issues,
  };
}

export function summarizePackageLinkHealth(pkg: CampaignDistributionPackage): CampaignDataLinkHealth {
  const issues: string[] = [];
  const outputIds = uniqueStrings(pkg.source.outputIds ?? []);
  const sourceAssetIds = uniqueStrings(pkg.source.sourceAssetIds ?? []);

  if (!pkg.campaignId?.trim()) {
    issues.push('BROKEN: Package is missing campaignId.');
  }
  if (!pkg.campaign.briefId?.trim()) {
    issues.push('BROKEN: Package is missing briefId.');
  }
  if (pkg.source.productionItemId && !pkg.source.outputPlanId) {
    issues.push('WARN: Package has a production item but no outputPlanId.');
  }
  if (pkg.source.productionItemId && outputIds.length === 0) {
    issues.push('BROKEN: Package production item has no related outputIds.');
  }
  if (pkg.assetReadiness.state === 'publishable' && outputIds.length === 0) {
    issues.push('WARN: Publishable package has no outputIds.');
  }
  if (pkg.assets.some((asset) => asset.assetId) && sourceAssetIds.length === 0) {
    issues.push('WARN: Package assets have no sourceAssetIds.');
  }

  return {
    status: statusFromIssues(issues),
    facts: uniqueStrings([
      pkg.campaignId ? `campaign:${pkg.campaignId}` : null,
      pkg.campaign.briefId ? `brief:${pkg.campaign.briefId}` : null,
      pkg.source.outputPlanId ? `plan:${pkg.source.outputPlanId}` : null,
      pkg.source.productionItemId ? `item:${pkg.source.productionItemId}` : null,
      outputIds.length > 0 ? `outputs:${outputIds.length}` : null,
      sourceAssetIds.length > 0 ? `assets:${sourceAssetIds.length}` : null,
    ]),
    issues,
  };
}

export function linkHealthStatusLabel(
  status: CampaignDataLinkHealthStatus,
  labels: Record<CampaignDataLinkHealthStatus, string>,
): string {
  return labels[status];
}
