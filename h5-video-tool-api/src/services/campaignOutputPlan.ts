import { nanoid } from 'nanoid';
import db from '../db/assetDb.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

const SAFE_IDENTIFIER_RE = /^[\w-]{1,128}$/;

export const CAMPAIGN_OUTPUT_PLAN_STATUSES = [
  'draft',
  'needs_confirmation',
  'confirmed',
  'producing',
  'ready_for_distribution',
  'blocked',
] as const;

const PRODUCTION_ITEM_TYPES = [
  'fb_post',
  'tiktok_video',
  'short_video',
  'banner',
  'caption_set',
  'headline_set',
  'hashtag_set',
] as const;
const PRODUCTION_CAPABILITIES = [
  'supported',
  'supported_with_source_assets',
  'unsupported',
  'manual_recommended',
] as const;
const PRODUCTION_ITEM_STATUSES = [
  'planned',
  'blocked',
  'ready_to_produce',
  'producing',
  'produced',
  'failed',
  'skipped',
] as const;
const SOURCE_REQUIREMENT_STATUSES = [
  'available',
  'missing',
  'needs_selection',
  'needs_upload',
  'can_generate_substitute',
  'blocked',
] as const;
const CAPABILITY_GAP_TYPES = [
  'generator_missing',
  'source_asset_missing',
  'adapter_missing',
  'quality_not_ready',
] as const;
const PRIORITY_HINTS = ['low', 'medium', 'high'] as const;
const HUMAN_ACTION_TYPES = [
  'confirm',
  'provide_source_asset',
  'review_risk',
  'external_production',
] as const;
const PRODUCED_OUTPUT_KINDS = [
  'caption',
  'headline',
  'hashtag',
  'post_copy',
  'banner_prompt',
] as const;
const PRODUCED_OUTPUT_STATUSES = [
  'draft',
  'needs_review',
  'approved',
] as const;
const CREATIVE_QUALITY_STATUSES = [
  'usable',
  'needs_fix',
  'unusable',
] as const;
const CREATIVE_FEEDBACK_TAGS = [
  'selling_point_not_prominent',
  'first_three_seconds_weak',
  'slow_pacing',
  'inaccurate_character',
  'reference_motion_mismatch',
  'copy_not_strong_enough',
  'better_for_tiktok',
  'better_for_facebook',
] as const;
const CREATIVE_ISSUE_TAGS = [
  'weak_opening',
  'slow_pacing',
  'unclear_selling_point',
  'weak_ending',
  'inaccurate_character',
  'reference_motion_mismatch',
  'copy_not_strong_enough',
  'composition_issue',
  'source_asset_issue',
  'platform_fit_issue',
] as const;
const BANNER_OUTPUT_SPEC_IDS = [
  'square_1_1',
  'portrait_4_5',
  'story_9_16',
  'landscape_16_9',
] as const;

export type CampaignOutputPlanStatus = (typeof CAMPAIGN_OUTPUT_PLAN_STATUSES)[number];

type UnknownRecord = Record<string, unknown>;

export interface CampaignOutputPlan {
  id: string;
  campaignId?: string;
  gameId: string;
  ownerId: string;
  createdBy: string;
  updatedBy?: string;
  mission: string;
  briefId: string;
  status: CampaignOutputPlanStatus;
  items: UnknownRecord[];
  sourceAssetRequirements: UnknownRecord[];
  capabilityGaps: UnknownRecord[];
  createdAt: string;
  updatedAt: string;
}

interface StoredCampaignOutputPlanRow {
  id: string;
  owner_id: string;
  game_id: string;
  created_by: string;
  updated_by: string;
  status: CampaignOutputPlanStatus;
  created_at: string;
  updated_at: string;
  payload_json: string;
}

export class CampaignOutputPlanValidationError extends Error {}

let repositoryReady = false;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nowIso(): string {
  return new Date().toISOString();
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function requireObject(value: unknown, field: string): UnknownRecord {
  if (!isRecord(value)) {
    throw new CampaignOutputPlanValidationError(`${field} must be an object`);
  }
  return value;
}

function requireText(value: unknown, field: string): string {
  const text = cleanText(value);
  if (!text) {
    throw new CampaignOutputPlanValidationError(`${field} is required`);
  }
  return text;
}

function isSafeIdentifier(value: string): boolean {
  return SAFE_IDENTIFIER_RE.test(value);
}

function requireSafeIdentifier(value: unknown, field: string): string {
  const text = requireText(value, field);
  if (!isSafeIdentifier(text)) {
    throw new CampaignOutputPlanValidationError(`${field} must be a safe identifier`);
  }
  return text;
}

function normalizeOptionalSafeIdentifier(value: unknown, field: string): string | undefined {
  const text = cleanText(value);
  if (!text) return undefined;
  if (!isSafeIdentifier(text)) {
    throw new CampaignOutputPlanValidationError(`${field} must be a safe identifier`);
  }
  return text;
}

function requireEnum<T extends readonly string[]>(value: unknown, field: string, allowed: T): T[number] {
  const text = requireText(value, field);
  if (!allowed.includes(text)) {
    throw new CampaignOutputPlanValidationError(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return text as T[number];
}

function normalizeOptionalEnum<T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T,
): T[number] | undefined {
  const text = cleanText(value);
  if (!text) return undefined;
  if (!allowed.includes(text)) {
    throw new CampaignOutputPlanValidationError(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return text as T[number];
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function normalizeStringList(value: unknown, field: string): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) {
    return uniqueStrings(value.map((item) => (typeof item === 'string' ? item : String(item))));
  }
  if (typeof value === 'string') {
    return uniqueStrings(value.split(/\r?\n|,|;/));
  }
  throw new CampaignOutputPlanValidationError(`${field} must be a string array`);
}

function normalizeSafeIdentifierList(value: unknown, field: string): string[] {
  const values = normalizeStringList(value, field);
  for (const item of values) {
    if (!isSafeIdentifier(item)) {
      throw new CampaignOutputPlanValidationError(`${field} must contain safe identifiers`);
    }
  }
  return values;
}

function normalizeOptionalEnumList<T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T,
): T[number][] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new CampaignOutputPlanValidationError(`${field} must be a string array`);
  }
  return uniqueStrings(value.map((item) => (typeof item === 'string' ? item : String(item)))).map((item) => {
    if (!allowed.includes(item)) {
      throw new CampaignOutputPlanValidationError(`${field} must contain one of: ${allowed.join(', ')}`);
    }
    return item as T[number];
  });
}

function normalizeNumber(value: unknown, field: string): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new CampaignOutputPlanValidationError(`${field} must be a non-negative number`);
  }
  return numberValue;
}

function normalizeHumanAction(value: unknown, field: string): UnknownRecord | undefined {
  if (value === undefined || value === null) return undefined;
  const raw = requireObject(value, field);
  return {
    type: requireEnum(raw.type, `${field}.type`, HUMAN_ACTION_TYPES),
    label: requireText(raw.label, `${field}.label`),
    detail: requireText(raw.detail, `${field}.detail`),
  };
}

function normalizeProducedOutputs(value: unknown, field: string): UnknownRecord[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new CampaignOutputPlanValidationError(`${field} must be an array`);
  }
  return value.map((item, index) => {
    const raw = requireObject(item, `${field}[${index}]`);
    return {
      id: requireSafeIdentifier(raw.id, `${field}[${index}].id`),
      kind: requireEnum(raw.kind, `${field}[${index}].kind`, PRODUCED_OUTPUT_KINDS),
      title: requireText(raw.title, `${field}[${index}].title`),
      body: requireText(raw.body, `${field}[${index}].body`),
      variants: normalizeStringList(raw.variants, `${field}[${index}].variants`),
      platform: requireText(raw.platform, `${field}[${index}].platform`),
      status: normalizeOptionalEnum(raw.status, `${field}[${index}].status`, PRODUCED_OUTPUT_STATUSES) ?? 'draft',
      qualityStatus: normalizeOptionalEnum(
        raw.qualityStatus,
        `${field}[${index}].qualityStatus`,
        CREATIVE_QUALITY_STATUSES,
      ),
      parentOutputId: normalizeOptionalSafeIdentifier(raw.parentOutputId, `${field}[${index}].parentOutputId`),
      bannerSpecIds: normalizeOptionalEnumList(
        raw.bannerSpecIds,
        `${field}[${index}].bannerSpecIds`,
        BANNER_OUTPUT_SPEC_IDS,
      ),
      sourceAssetIds: normalizeSafeIdentifierList(raw.sourceAssetIds, `${field}[${index}].sourceAssetIds`),
      feedbackTagIds: normalizeOptionalEnumList(
        raw.feedbackTagIds,
        `${field}[${index}].feedbackTagIds`,
        CREATIVE_FEEDBACK_TAGS,
      ),
      feedbackIssueTags: normalizeOptionalEnumList(
        raw.feedbackIssueTags,
        `${field}[${index}].feedbackIssueTags`,
        CREATIVE_ISSUE_TAGS,
      ),
      feedbackNote: cleanText(raw.feedbackNote),
      reviewerId: normalizeOptionalSafeIdentifier(raw.reviewerId, `${field}[${index}].reviewerId`),
      campaignId: normalizeOptionalSafeIdentifier(raw.campaignId, `${field}[${index}].campaignId`),
      briefId: normalizeOptionalSafeIdentifier(raw.briefId, `${field}[${index}].briefId`),
      createdAt: requireText(raw.createdAt, `${field}[${index}].createdAt`),
    };
  });
}

function normalizeProductionItems(value: unknown): UnknownRecord[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new CampaignOutputPlanValidationError('items must be a non-empty array');
  }
  return value.map((item, index) => {
    const raw = requireObject(item, `items[${index}]`);
    return {
      id: requireSafeIdentifier(raw.id, `items[${index}].id`),
      type: requireEnum(raw.type, `items[${index}].type`, PRODUCTION_ITEM_TYPES),
      quantity: normalizeNumber(raw.quantity, `items[${index}].quantity`),
      platform: requireText(raw.platform, `items[${index}].platform`),
      title: requireText(raw.title, `items[${index}].title`),
      contentBrief: requireText(raw.contentBrief, `items[${index}].contentBrief`),
      requiredSourceAssetIds: normalizeSafeIdentifierList(
        raw.requiredSourceAssetIds,
        `items[${index}].requiredSourceAssetIds`,
      ),
      productionCapability: requireEnum(
        raw.productionCapability,
        `items[${index}].productionCapability`,
        PRODUCTION_CAPABILITIES,
      ),
      status: requireEnum(raw.status, `items[${index}].status`, PRODUCTION_ITEM_STATUSES),
      gobsCanProduce: Boolean(raw.gobsCanProduce),
      outputAssetIds: normalizeSafeIdentifierList(raw.outputAssetIds, `items[${index}].outputAssetIds`),
      distributionPackageIds: normalizeSafeIdentifierList(
        raw.distributionPackageIds,
        `items[${index}].distributionPackageIds`,
      ),
      producedOutputs: normalizeProducedOutputs(raw.producedOutputs, `items[${index}].producedOutputs`),
      humanAction: normalizeHumanAction(raw.humanAction, `items[${index}].humanAction`),
    };
  });
}

function normalizeSourceAssetRequirements(value: unknown): UnknownRecord[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new CampaignOutputPlanValidationError('sourceAssetRequirements must be an array');
  }
  return value.map((item, index) => {
    const raw = requireObject(item, `sourceAssetRequirements[${index}]`);
    return {
      id: requireSafeIdentifier(raw.id, `sourceAssetRequirements[${index}].id`),
      assetType: requireSafeIdentifier(raw.assetType, `sourceAssetRequirements[${index}].assetType`),
      label: requireText(raw.label, `sourceAssetRequirements[${index}].label`),
      neededForProductionItemIds: normalizeSafeIdentifierList(
        raw.neededForProductionItemIds,
        `sourceAssetRequirements[${index}].neededForProductionItemIds`,
      ),
      status: requireEnum(
        raw.status,
        `sourceAssetRequirements[${index}].status`,
        SOURCE_REQUIREMENT_STATUSES,
      ),
      matchedAssetIds: normalizeSafeIdentifierList(
        raw.matchedAssetIds,
        `sourceAssetRequirements[${index}].matchedAssetIds`,
      ),
      guidance: requireText(raw.guidance, `sourceAssetRequirements[${index}].guidance`),
      rightsNote: cleanText(raw.rightsNote),
    };
  });
}

function normalizeCapabilityGaps(value: unknown): UnknownRecord[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new CampaignOutputPlanValidationError('capabilityGaps must be an array');
  }
  return value.map((item, index) => {
    const raw = requireObject(item, `capabilityGaps[${index}]`);
    return {
      id: requireSafeIdentifier(raw.id, `capabilityGaps[${index}].id`),
      gapType: requireEnum(raw.gapType, `capabilityGaps[${index}].gapType`, CAPABILITY_GAP_TYPES),
      title: requireText(raw.title, `capabilityGaps[${index}].title`),
      affectedProductionItemIds: normalizeSafeIdentifierList(
        raw.affectedProductionItemIds,
        `capabilityGaps[${index}].affectedProductionItemIds`,
      ),
      currentWorkaround: requireText(raw.currentWorkaround, `capabilityGaps[${index}].currentWorkaround`),
      priorityHint: requireEnum(raw.priorityHint, `capabilityGaps[${index}].priorityHint`, PRIORITY_HINTS),
    };
  });
}

function buildPlanId(): string {
  return `cop_${nanoid(10)}`;
}

function normalizePlanPayload(
  input: unknown,
  actor: string,
  audit?: {
    id?: string;
    createdAt?: string;
    createdBy?: string;
  },
): CampaignOutputPlan {
  const raw = requireObject(input, 'plan');
  const createdAt = audit?.createdAt ?? nowIso();
  const updatedAt = nowIso();

  return {
    id: audit?.id ?? buildPlanId(),
    campaignId: normalizeOptionalSafeIdentifier(raw.campaignId, 'campaignId'),
    gameId: requireSafeIdentifier(raw.gameId, 'gameId'),
    ownerId: actor,
    createdBy: sanitizeUsername(audit?.createdBy ?? actor),
    updatedBy: actor,
    mission: requireText(raw.mission, 'mission'),
    briefId: requireSafeIdentifier(raw.briefId, 'briefId'),
    status: normalizeOptionalEnum(raw.status, 'status', CAMPAIGN_OUTPUT_PLAN_STATUSES) ?? 'draft',
    items: normalizeProductionItems(raw.items),
    sourceAssetRequirements: normalizeSourceAssetRequirements(raw.sourceAssetRequirements),
    capabilityGaps: normalizeCapabilityGaps(raw.capabilityGaps),
    createdAt,
    updatedAt,
  };
}

function ensureRepository(): void {
  if (repositoryReady) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaign_output_plans (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_campaign_output_plans_owner_updated_at
      ON campaign_output_plans(owner_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_campaign_output_plans_owner_status
      ON campaign_output_plans(owner_id, status);
    CREATE INDEX IF NOT EXISTS idx_campaign_output_plans_owner_game
      ON campaign_output_plans(owner_id, game_id);
  `);
  repositoryReady = true;
}

function parseStoredPlan(row: StoredCampaignOutputPlanRow): CampaignOutputPlan {
  const parsed = JSON.parse(row.payload_json) as CampaignOutputPlan;
  return {
    ...parsed,
    id: row.id,
    ownerId: row.owner_id,
    gameId: row.game_id,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function savePlanRecord(plan: CampaignOutputPlan, existing = false): CampaignOutputPlan {
  ensureRepository();
  const params = {
    id: plan.id,
    owner_id: plan.ownerId,
    game_id: plan.gameId,
    created_by: plan.createdBy,
    updated_by: sanitizeUsername(plan.updatedBy ?? plan.ownerId),
    status: plan.status,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
    payload_json: JSON.stringify(plan),
  };
  if (existing) {
    db.prepare(`
      UPDATE campaign_output_plans
      SET
        game_id = @game_id,
        updated_by = @updated_by,
        status = @status,
        updated_at = @updated_at,
        payload_json = @payload_json
      WHERE id = @id AND owner_id = @owner_id
    `).run(params);
    return plan;
  }

  db.prepare(`
    INSERT INTO campaign_output_plans (
      id,
      owner_id,
      game_id,
      created_by,
      updated_by,
      status,
      created_at,
      updated_at,
      payload_json
    ) VALUES (
      @id,
      @owner_id,
      @game_id,
      @created_by,
      @updated_by,
      @status,
      @created_at,
      @updated_at,
      @payload_json
    )
  `).run(params);
  return plan;
}

function getStoredPlanRow(ownerId: string, planId: string): StoredCampaignOutputPlanRow | undefined {
  ensureRepository();
  return db.prepare(`
    SELECT
      id,
      owner_id,
      game_id,
      created_by,
      updated_by,
      status,
      created_at,
      updated_at,
      payload_json
    FROM campaign_output_plans
    WHERE id = @id AND owner_id = @owner_id
  `).get({
    id: planId,
    owner_id: ownerId,
  }) as StoredCampaignOutputPlanRow | undefined;
}

export function isSafeCampaignOutputPlanId(value: string): boolean {
  return isSafeIdentifier(value);
}

export function createCampaignOutputPlan(ownerId: string, input: unknown): CampaignOutputPlan {
  const actor = sanitizeUsername(ownerId);
  const plan = normalizePlanPayload(input, actor);
  return savePlanRecord(plan);
}

export function listCampaignOutputPlans(ownerId: string): CampaignOutputPlan[] {
  ensureRepository();
  const actor = sanitizeUsername(ownerId);
  const rows = db.prepare(`
    SELECT
      id,
      owner_id,
      game_id,
      created_by,
      updated_by,
      status,
      created_at,
      updated_at,
      payload_json
    FROM campaign_output_plans
    WHERE owner_id = @owner_id
    ORDER BY updated_at DESC
  `).all({
    owner_id: actor,
  }) as StoredCampaignOutputPlanRow[];

  return rows.map(parseStoredPlan);
}

export function getCampaignOutputPlan(ownerId: string, planId: string): CampaignOutputPlan | undefined {
  const row = getStoredPlanRow(sanitizeUsername(ownerId), planId);
  return row ? parseStoredPlan(row) : undefined;
}

function buildPatchInput(existing: CampaignOutputPlan, patch: UnknownRecord): UnknownRecord {
  const next: UnknownRecord = {
    campaignId: existing.campaignId,
    gameId: existing.gameId,
    mission: existing.mission,
    briefId: existing.briefId,
    status: existing.status,
    items: existing.items,
    sourceAssetRequirements: existing.sourceAssetRequirements,
    capabilityGaps: existing.capabilityGaps,
  };

  let touched = false;
  const assign = (key: keyof typeof next): void => {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      next[key] = patch[key];
      touched = true;
    }
  };

  assign('campaignId');
  assign('gameId');
  assign('mission');
  assign('briefId');
  assign('status');
  assign('items');
  assign('sourceAssetRequirements');
  assign('capabilityGaps');

  if (!touched) {
    throw new CampaignOutputPlanValidationError('PATCH body must include at least one updatable field');
  }
  return next;
}

export function updateCampaignOutputPlan(
  ownerId: string,
  planId: string,
  patch: unknown,
): CampaignOutputPlan | undefined {
  const actor = sanitizeUsername(ownerId);
  const existing = getCampaignOutputPlan(actor, planId);
  if (!existing) return undefined;

  const rawPatch = requireObject(patch, 'patch');
  const next = normalizePlanPayload(buildPatchInput(existing, rawPatch), actor, {
    id: existing.id,
    createdAt: existing.createdAt,
    createdBy: existing.createdBy,
  });
  return savePlanRecord(next, true);
}
