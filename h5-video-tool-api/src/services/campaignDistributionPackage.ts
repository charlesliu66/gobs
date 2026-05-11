import { nanoid } from 'nanoid';
import db from '../db/assetDb.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

const SAFE_IDENTIFIER_RE = /^[\w-]{1,128}$/;

export const CAMPAIGN_DISTRIBUTION_REVIEW_STATUSES = [
  'draft',
  'needs_review',
  'approved',
  'ready_to_distribute',
  'rejected',
] as const;

export const CAMPAIGN_DISTRIBUTION_ASSET_READINESS_STATES = [
  'publishable',
  'needs_asset',
  'generating',
  'failed',
] as const;

const CAMPAIGN_DISTRIBUTION_SOURCE_TYPES = [
  'campaign_variant',
  'quick_film',
  'editor',
  'manual',
] as const;

const CAMPAIGN_DISTRIBUTION_MODES = ['tiktok_content', 'tiktok_ua'] as const;
const CAMPAIGN_DISTRIBUTION_GENERATION_SOURCES = ['llm', 'fallback'] as const;
const CAMPAIGN_DISTRIBUTION_ASSET_TYPES = ['video', 'image', 'caption_only'] as const;
const CAMPAIGN_DISTRIBUTION_ASSET_STATUSES = ['ready', 'missing', 'generating', 'failed'] as const;
const CAMPAIGN_DISTRIBUTION_PUBLISHABLE_ASSET_SOURCES = [
  'server_path',
  'verified_url',
  'gallery_asset',
] as const;
const CAMPAIGN_DISTRIBUTION_COPY_LANGUAGES = [
  'zh',
  'en',
  'ms',
  'th',
  'id',
  'vi',
  'unknown',
] as const;

export type CampaignDistributionReviewStatus = (typeof CAMPAIGN_DISTRIBUTION_REVIEW_STATUSES)[number];
export type CampaignDistributionAssetReadinessState =
  (typeof CAMPAIGN_DISTRIBUTION_ASSET_READINESS_STATES)[number];
export type CampaignDistributionSourceType = (typeof CAMPAIGN_DISTRIBUTION_SOURCE_TYPES)[number];
export type CampaignDistributionMode = (typeof CAMPAIGN_DISTRIBUTION_MODES)[number];
export type CampaignDistributionGenerationSource =
  (typeof CAMPAIGN_DISTRIBUTION_GENERATION_SOURCES)[number];
export type CampaignDistributionAssetType = (typeof CAMPAIGN_DISTRIBUTION_ASSET_TYPES)[number];
export type CampaignDistributionAssetStatus = (typeof CAMPAIGN_DISTRIBUTION_ASSET_STATUSES)[number];
export type CampaignDistributionPublishableAssetSource =
  (typeof CAMPAIGN_DISTRIBUTION_PUBLISHABLE_ASSET_SOURCES)[number];
export type CampaignDistributionCopyLanguage = (typeof CAMPAIGN_DISTRIBUTION_COPY_LANGUAGES)[number];

export interface CampaignDistributionPackageSource {
  type: CampaignDistributionSourceType;
  sourceId?: string;
  outputPlanId?: string;
  productionItemId?: string;
  outputIds?: string[];
  sourceAssetIds?: string[];
  createdFromRoute?: string;
}

export interface CampaignDistributionPackageCampaign {
  mission?: string;
  briefId?: string;
  mode?: CampaignDistributionMode;
  objective?: string;
  generationSource?: CampaignDistributionGenerationSource;
  warnings?: string[];
}

export interface CampaignDistributionPackageVariant {
  id?: string;
  angle: string;
  hook: string;
  audience: string;
  proofPoint?: string;
  cta: string;
  riskNotes: string[];
}

export interface CampaignDistributionPackageAsset {
  assetId?: string;
  type: CampaignDistributionAssetType;
  url?: string;
  path?: string;
  status: CampaignDistributionAssetStatus;
}

export interface CampaignDistributionPublishableAsset {
  type: Exclude<CampaignDistributionAssetType, 'caption_only'>;
  source: CampaignDistributionPublishableAssetSource;
  url?: string;
  path?: string;
}

export interface CampaignDistributionPackageAssetReadiness {
  state: CampaignDistributionAssetReadinessState;
  primaryAssetId?: string;
  publishableAsset?: CampaignDistributionPublishableAsset;
  reason?: string;
}

export interface CampaignDistributionPackageCopy {
  headline?: string;
  caption: string;
  hashtags: string[];
  language: CampaignDistributionCopyLanguage;
}

export interface CampaignDistributionPackagePublishIntent {
  platforms: string[];
  markets: string[];
  accountGroupIds?: string[];
  scheduleHint?: string;
}

export interface CampaignDistributionPackageKnowledgeContext {
  packIds: string[];
  marketTruth: string[];
  audienceTension: string[];
  toneRules: string[];
  forbiddenClaims: string[];
  visualCues: string[];
  approvedAngles: string[];
  hookCandidates: string[];
}

export interface CampaignDistributionPackageReview {
  status: CampaignDistributionReviewStatus;
  notes?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface CampaignDistributionPackage {
  id: string;
  campaignId?: string;
  gameId: string;
  ownerId: string;
  createdBy: string;
  updatedBy?: string;
  source: CampaignDistributionPackageSource;
  campaign: CampaignDistributionPackageCampaign;
  title: string;
  variant: CampaignDistributionPackageVariant;
  assets: CampaignDistributionPackageAsset[];
  assetReadiness: CampaignDistributionPackageAssetReadiness;
  copy: CampaignDistributionPackageCopy;
  publishIntent: CampaignDistributionPackagePublishIntent;
  knowledgeContext: CampaignDistributionPackageKnowledgeContext;
  review: CampaignDistributionPackageReview;
  createdAt: string;
  updatedAt: string;
}

type UnknownRecord = Record<string, unknown>;

interface StoredCampaignDistributionPackageRow {
  id: string;
  owner_id: string;
  created_by: string;
  updated_by: string;
  review_status: CampaignDistributionReviewStatus;
  asset_readiness_state: CampaignDistributionAssetReadinessState;
  created_at: string;
  updated_at: string;
  payload_json: string;
}

export class CampaignDistributionPackageValidationError extends Error {}

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
  throw new CampaignDistributionPackageValidationError(`${field} must be a string array`);
}

function requireObject(value: unknown, field: string): UnknownRecord {
  if (!isRecord(value)) {
    throw new CampaignDistributionPackageValidationError(`${field} must be an object`);
  }
  return value;
}

function requireText(value: unknown, field: string): string {
  const text = cleanText(value);
  if (!text) {
    throw new CampaignDistributionPackageValidationError(`${field} is required`);
  }
  return text;
}

function isSafeIdentifier(value: string): boolean {
  return SAFE_IDENTIFIER_RE.test(value);
}

function normalizeOptionalSafeIdentifier(value: unknown, field: string): string | undefined {
  const text = cleanText(value);
  if (!text) return undefined;
  if (!isSafeIdentifier(text)) {
    throw new CampaignDistributionPackageValidationError(`${field} must be a safe identifier`);
  }
  return text;
}

function requireSafeIdentifier(value: unknown, field: string): string {
  const text = requireText(value, field);
  if (!isSafeIdentifier(text)) {
    throw new CampaignDistributionPackageValidationError(`${field} must be a safe identifier`);
  }
  return text;
}

function normalizeOptionalEnum<T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T,
): T[number] | undefined {
  const text = cleanText(value);
  if (!text) return undefined;
  if (!allowed.includes(text)) {
    throw new CampaignDistributionPackageValidationError(
      `${field} must be one of: ${allowed.join(', ')}`,
    );
  }
  return text as T[number];
}

function requireEnum<T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T,
): T[number] {
  const text = requireText(value, field);
  if (!allowed.includes(text)) {
    throw new CampaignDistributionPackageValidationError(
      `${field} must be one of: ${allowed.join(', ')}`,
    );
  }
  return text as T[number];
}

function normalizeSafeIdentifierList(value: unknown, field: string): string[] {
  const values = normalizeStringList(value, field);
  for (const item of values) {
    if (!isSafeIdentifier(item)) {
      throw new CampaignDistributionPackageValidationError(`${field} must contain safe identifiers`);
    }
  }
  return values;
}

function normalizeSource(input: unknown): CampaignDistributionPackageSource {
  const raw = requireObject(input, 'source');
  return {
    type: requireEnum(raw.type, 'source.type', CAMPAIGN_DISTRIBUTION_SOURCE_TYPES),
    sourceId: normalizeOptionalSafeIdentifier(raw.sourceId, 'source.sourceId'),
    outputPlanId: normalizeOptionalSafeIdentifier(raw.outputPlanId, 'source.outputPlanId'),
    productionItemId: normalizeOptionalSafeIdentifier(raw.productionItemId, 'source.productionItemId'),
    outputIds: normalizeSafeIdentifierList(raw.outputIds, 'source.outputIds'),
    sourceAssetIds: normalizeSafeIdentifierList(raw.sourceAssetIds, 'source.sourceAssetIds'),
    createdFromRoute: cleanText(raw.createdFromRoute),
  };
}

function normalizeCampaign(input: unknown): CampaignDistributionPackageCampaign {
  const raw = requireObject(input, 'campaign');
  return {
    mission: cleanText(raw.mission),
    briefId: normalizeOptionalSafeIdentifier(raw.briefId, 'campaign.briefId'),
    mode: normalizeOptionalEnum(raw.mode, 'campaign.mode', CAMPAIGN_DISTRIBUTION_MODES),
    objective: cleanText(raw.objective),
    generationSource: normalizeOptionalEnum(
      raw.generationSource,
      'campaign.generationSource',
      CAMPAIGN_DISTRIBUTION_GENERATION_SOURCES,
    ),
    warnings: normalizeStringList(raw.warnings, 'campaign.warnings'),
  };
}

function normalizeVariant(input: unknown): CampaignDistributionPackageVariant {
  const raw = requireObject(input, 'variant');
  return {
    id: normalizeOptionalSafeIdentifier(raw.id, 'variant.id'),
    angle: requireText(raw.angle, 'variant.angle'),
    hook: requireText(raw.hook, 'variant.hook'),
    audience: requireText(raw.audience, 'variant.audience'),
    proofPoint: cleanText(raw.proofPoint),
    cta: requireText(raw.cta, 'variant.cta'),
    riskNotes: normalizeStringList(raw.riskNotes, 'variant.riskNotes'),
  };
}

function normalizeAssets(input: unknown): CampaignDistributionPackageAsset[] {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) {
    throw new CampaignDistributionPackageValidationError('assets must be an array');
  }
  return input.map((item, index) => {
    const raw = requireObject(item, `assets[${index}]`);
    return {
      assetId: normalizeOptionalSafeIdentifier(raw.assetId, `assets[${index}].assetId`),
      type: requireEnum(raw.type, `assets[${index}].type`, CAMPAIGN_DISTRIBUTION_ASSET_TYPES),
      url: cleanText(raw.url),
      path: cleanText(raw.path),
      status: requireEnum(raw.status, `assets[${index}].status`, CAMPAIGN_DISTRIBUTION_ASSET_STATUSES),
    };
  });
}

function normalizePublishableAsset(input: unknown): CampaignDistributionPublishableAsset | undefined {
  if (input === undefined || input === null) return undefined;
  const raw = requireObject(input, 'assetReadiness.publishableAsset');
  const type = requireEnum(
    raw.type,
    'assetReadiness.publishableAsset.type',
    ['video', 'image'] as const,
  );
  const url = cleanText(raw.url);
  const path = cleanText(raw.path);
  if (!url && !path) {
    throw new CampaignDistributionPackageValidationError(
      'assetReadiness.publishableAsset needs a url or path',
    );
  }
  return {
    type,
    source: requireEnum(
      raw.source,
      'assetReadiness.publishableAsset.source',
      CAMPAIGN_DISTRIBUTION_PUBLISHABLE_ASSET_SOURCES,
    ),
    url,
    path,
  };
}

function normalizeAssetReadiness(input: unknown): CampaignDistributionPackageAssetReadiness {
  const raw = requireObject(input, 'assetReadiness');
  const state = requireEnum(
    raw.state,
    'assetReadiness.state',
    CAMPAIGN_DISTRIBUTION_ASSET_READINESS_STATES,
  );
  const publishableAsset = normalizePublishableAsset(raw.publishableAsset);
  if (state === 'publishable' && !publishableAsset) {
    throw new CampaignDistributionPackageValidationError(
      'assetReadiness.publishableAsset is required when assetReadiness.state is publishable',
    );
  }
  return {
    state,
    primaryAssetId: normalizeOptionalSafeIdentifier(raw.primaryAssetId, 'assetReadiness.primaryAssetId'),
    publishableAsset,
    reason: cleanText(raw.reason),
  };
}

function normalizeCopy(input: unknown): CampaignDistributionPackageCopy {
  const raw = requireObject(input, 'copy');
  return {
    headline: cleanText(raw.headline),
    caption: requireText(raw.caption, 'copy.caption'),
    hashtags: normalizeStringList(raw.hashtags, 'copy.hashtags'),
    language: normalizeOptionalEnum(
      raw.language,
      'copy.language',
      CAMPAIGN_DISTRIBUTION_COPY_LANGUAGES,
    ) ?? 'unknown',
  };
}

function normalizePublishIntent(input: unknown): CampaignDistributionPackagePublishIntent {
  const raw = requireObject(input, 'publishIntent');
  return {
    platforms: normalizeStringList(raw.platforms, 'publishIntent.platforms'),
    markets: normalizeStringList(raw.markets, 'publishIntent.markets'),
    accountGroupIds: normalizeSafeIdentifierList(raw.accountGroupIds, 'publishIntent.accountGroupIds'),
    scheduleHint: cleanText(raw.scheduleHint),
  };
}

function normalizeKnowledgeContext(input: unknown): CampaignDistributionPackageKnowledgeContext {
  const raw = requireObject(input, 'knowledgeContext');
  return {
    packIds: normalizeSafeIdentifierList(
      raw.packIds ?? raw.selectedPackIds,
      'knowledgeContext.packIds',
    ),
    marketTruth: normalizeStringList(raw.marketTruth, 'knowledgeContext.marketTruth'),
    audienceTension: normalizeStringList(raw.audienceTension, 'knowledgeContext.audienceTension'),
    toneRules: normalizeStringList(raw.toneRules, 'knowledgeContext.toneRules'),
    forbiddenClaims: normalizeStringList(raw.forbiddenClaims, 'knowledgeContext.forbiddenClaims'),
    visualCues: normalizeStringList(raw.visualCues, 'knowledgeContext.visualCues'),
    approvedAngles: normalizeStringList(raw.approvedAngles, 'knowledgeContext.approvedAngles'),
    hookCandidates: normalizeStringList(raw.hookCandidates, 'knowledgeContext.hookCandidates'),
  };
}

function normalizeReview(input: unknown, updatedAt: string, updatedBy: string): CampaignDistributionPackageReview {
  const raw = input === undefined ? {} : requireObject(input, 'review');
  return {
    status: normalizeOptionalEnum(
      raw.status,
      'review.status',
      CAMPAIGN_DISTRIBUTION_REVIEW_STATUSES,
    ) ?? 'draft',
    notes: cleanText(raw.notes),
    updatedAt,
    updatedBy,
  };
}

function buildPackageId(): string {
  return `cdp_${nanoid(10)}`;
}

function normalizePackagePayload(
  input: unknown,
  actor: string,
  audit?: {
    id?: string;
    createdAt?: string;
    createdBy?: string;
  },
): CampaignDistributionPackage {
  const raw = requireObject(input, 'package');
  const createdAt = audit?.createdAt ?? nowIso();
  const updatedAt = nowIso();

  return {
    id: audit?.id ?? buildPackageId(),
    campaignId: normalizeOptionalSafeIdentifier(raw.campaignId, 'campaignId'),
    gameId: requireSafeIdentifier(raw.gameId, 'gameId'),
    ownerId: actor,
    createdBy: sanitizeUsername(audit?.createdBy ?? actor),
    updatedBy: actor,
    source: normalizeSource(raw.source),
    campaign: normalizeCampaign(raw.campaign),
    title: requireText(raw.title, 'title'),
    variant: normalizeVariant(raw.variant),
    assets: normalizeAssets(raw.assets),
    assetReadiness: normalizeAssetReadiness(raw.assetReadiness),
    copy: normalizeCopy(raw.copy),
    publishIntent: normalizePublishIntent(raw.publishIntent),
    knowledgeContext: normalizeKnowledgeContext(raw.knowledgeContext),
    review: normalizeReview(raw.review, updatedAt, actor),
    createdAt,
    updatedAt,
  };
}

function ensureRepository(): void {
  if (repositoryReady) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaign_distribution_packages (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      review_status TEXT NOT NULL,
      asset_readiness_state TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_campaign_distribution_packages_owner_updated_at
      ON campaign_distribution_packages(owner_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_campaign_distribution_packages_owner_review_status
      ON campaign_distribution_packages(owner_id, review_status);
    CREATE INDEX IF NOT EXISTS idx_campaign_distribution_packages_owner_asset_readiness
      ON campaign_distribution_packages(owner_id, asset_readiness_state);
  `);
  repositoryReady = true;
}

function parseStoredPackage(row: StoredCampaignDistributionPackageRow): CampaignDistributionPackage {
  const parsed = JSON.parse(row.payload_json) as CampaignDistributionPackage;
  return {
    ...parsed,
    id: row.id,
    ownerId: row.owner_id,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    review: {
      ...parsed.review,
      status: row.review_status,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    },
    assetReadiness: {
      ...parsed.assetReadiness,
      state: row.asset_readiness_state,
    },
  };
}

function savePackageRecord(pkg: CampaignDistributionPackage, existing = false): CampaignDistributionPackage {
  ensureRepository();
  const params = {
    id: pkg.id,
    owner_id: pkg.ownerId,
    game_id: pkg.gameId,
    created_by: pkg.createdBy,
    updated_by: sanitizeUsername(pkg.updatedBy ?? pkg.ownerId),
    review_status: pkg.review.status,
    asset_readiness_state: pkg.assetReadiness.state,
    created_at: pkg.createdAt,
    updated_at: pkg.updatedAt,
    payload_json: JSON.stringify(pkg),
  };
  if (existing) {
    db.prepare(`
      UPDATE campaign_distribution_packages
      SET
        game_id = @game_id,
        updated_by = @updated_by,
        review_status = @review_status,
        asset_readiness_state = @asset_readiness_state,
        updated_at = @updated_at,
        payload_json = @payload_json
      WHERE id = @id AND owner_id = @owner_id
    `).run(params);
    return pkg;
  }

  db.prepare(`
    INSERT INTO campaign_distribution_packages (
      id,
      owner_id,
      game_id,
      created_by,
      updated_by,
      review_status,
      asset_readiness_state,
      created_at,
      updated_at,
      payload_json
    ) VALUES (
      @id,
      @owner_id,
      @game_id,
      @created_by,
      @updated_by,
      @review_status,
      @asset_readiness_state,
      @created_at,
      @updated_at,
      @payload_json
    )
  `).run(params);
  return pkg;
}

function getStoredPackageRow(ownerId: string, packageId: string): StoredCampaignDistributionPackageRow | undefined {
  ensureRepository();
  return db.prepare(`
    SELECT
      id,
      owner_id,
      created_by,
      updated_by,
      review_status,
      asset_readiness_state,
      created_at,
      updated_at,
      payload_json
    FROM campaign_distribution_packages
    WHERE id = @id AND owner_id = @owner_id
  `).get({
    id: packageId,
    owner_id: ownerId,
  }) as StoredCampaignDistributionPackageRow | undefined;
}

export function isSafeCampaignDistributionPackageId(value: string): boolean {
  return isSafeIdentifier(value);
}

export function createCampaignDistributionPackage(
  ownerId: string,
  input: unknown,
): CampaignDistributionPackage {
  const actor = sanitizeUsername(ownerId);
  const pkg = normalizePackagePayload(input, actor);
  return savePackageRecord(pkg);
}

export function listCampaignDistributionPackages(ownerId: string): CampaignDistributionPackage[] {
  ensureRepository();
  const actor = sanitizeUsername(ownerId);
  const rows = db.prepare(`
    SELECT
      id,
      owner_id,
      created_by,
      updated_by,
      review_status,
      asset_readiness_state,
      created_at,
      updated_at,
      payload_json
    FROM campaign_distribution_packages
    WHERE owner_id = @owner_id
    ORDER BY updated_at DESC
  `).all({
    owner_id: actor,
  }) as StoredCampaignDistributionPackageRow[];

  return rows.map(parseStoredPackage);
}

export function getCampaignDistributionPackage(
  ownerId: string,
  packageId: string,
): CampaignDistributionPackage | undefined {
  const row = getStoredPackageRow(sanitizeUsername(ownerId), packageId);
  return row ? parseStoredPackage(row) : undefined;
}

function buildPatchInput(existing: CampaignDistributionPackage, patch: UnknownRecord): UnknownRecord {
  const next: UnknownRecord = {
    campaignId: existing.campaignId,
    gameId: existing.gameId,
    source: existing.source,
    campaign: existing.campaign,
    title: existing.title,
    variant: existing.variant,
    assets: existing.assets,
    assetReadiness: existing.assetReadiness,
    copy: existing.copy,
    publishIntent: existing.publishIntent,
    knowledgeContext: existing.knowledgeContext,
    review: {
      status: existing.review.status,
      notes: existing.review.notes,
    },
  };

  let touched = false;
  const assign = (key: keyof typeof next): void => {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      next[key] = patch[key];
      touched = true;
    }
  };

  assign('title');
  assign('campaignId');
  assign('gameId');
  assign('source');
  assign('campaign');
  assign('variant');
  assign('assets');
  assign('assetReadiness');
  assign('copy');
  assign('publishIntent');
  assign('knowledgeContext');
  assign('review');

  if (!touched) {
    throw new CampaignDistributionPackageValidationError('PATCH body must include at least one updatable field');
  }
  return next;
}

export function updateCampaignDistributionPackage(
  ownerId: string,
  packageId: string,
  patch: unknown,
): CampaignDistributionPackage | undefined {
  const actor = sanitizeUsername(ownerId);
  const existing = getCampaignDistributionPackage(actor, packageId);
  if (!existing) return undefined;

  const rawPatch = requireObject(patch, 'patch');
  const next = normalizePackagePayload(buildPatchInput(existing, rawPatch), actor, {
    id: existing.id,
    createdAt: existing.createdAt,
    createdBy: existing.createdBy,
  });
  return savePackageRecord(next, true);
}
