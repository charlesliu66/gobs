import fs from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { resolvePath } from '../infra/storage/resolver.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

export const CAMPAIGN_KNOWLEDGE_PACK_TYPES = [
  'brand_tone',
  'brand_compliance',
  'visual_style',
  'market_fundamentals',
  'user_persona',
  'live_ops_calendar',
  'live_ops_history',
  'selling_point_playbook',
] as const;

export type CampaignKnowledgePackType = (typeof CAMPAIGN_KNOWLEDGE_PACK_TYPES)[number];
export type CampaignKnowledgeSourceType = 'upload' | 'fastpublish-template' | 'manual';
export type CampaignKnowledgePackStatus = 'draft' | 'ready' | 'archived';
export const CAMPAIGN_KNOWLEDGE_CITATION_FEEDBACK_STATES = [
  'useful',
  'inaccurate',
  'do_not_use_again',
] as const;
export type CampaignKnowledgeCitationFeedbackState = (typeof CAMPAIGN_KNOWLEDGE_CITATION_FEEDBACK_STATES)[number];

export interface CampaignKnowledgeSource {
  sourceId: string;
  gameId: string;
  sourceType: CampaignKnowledgeSourceType;
  title: string;
  originalPath?: string;
  checksum?: string;
  content?: string;
  packType?: CampaignKnowledgePackType;
  importedAt: string;
}

export interface CampaignKnowledgePack {
  packId: string;
  gameId: string;
  type: CampaignKnowledgePackType;
  title: string;
  status: CampaignKnowledgePackStatus;
  summary: string;
  facts: string[];
  preferences: string[];
  avoid: string[];
  hookSeeds: string[];
  visualCues: string[];
  sourceIds: string[];
  templateId?: string;
  updatedAt: string;
}

export interface CampaignKnowledgeCitationFeedback {
  citationId: string;
  gameId: string;
  state: CampaignKnowledgeCitationFeedbackState;
  packId?: string;
  section?: string;
  value?: string;
  note?: string;
  updatedAt: string;
  updatedBy: string;
}

interface CampaignKnowledgeManifest {
  version: 1;
  gameId: string;
  packIds: string[];
  sourceIds: string[];
  updatedAt: string;
}

const EMPTY_MANIFEST = {
  version: 1,
  gameId: '',
  packIds: [],
  sourceIds: [],
  updatedAt: '',
} satisfies CampaignKnowledgeManifest;

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function trimText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function isSafeKnowledgeId(value: string): boolean {
  return /^[\w-]{1,64}$/.test(value);
}

export function isCampaignKnowledgePackType(value: string): value is CampaignKnowledgePackType {
  return CAMPAIGN_KNOWLEDGE_PACK_TYPES.includes(value as CampaignKnowledgePackType);
}

function nowIso(): string {
  return new Date().toISOString();
}

function getGameDir(username: string, gameId: string): string {
  const safeUser = sanitizeUsername(username);
  if (!isSafeKnowledgeId(gameId)) {
    throw new Error('Invalid gameId');
  }
  return resolvePath('campaign-knowledge', safeUser, gameId);
}

function getManifestPath(username: string, gameId: string): string {
  return path.join(getGameDir(username, gameId), 'manifest.json');
}

function getPackPath(username: string, gameId: string, packId: string): string {
  if (!isSafeKnowledgeId(packId)) {
    throw new Error('Invalid packId');
  }
  return path.join(getGameDir(username, gameId), 'packs', `${packId}.json`);
}

function getSourcePath(username: string, gameId: string, sourceId: string): string {
  if (!isSafeKnowledgeId(sourceId)) {
    throw new Error('Invalid sourceId');
  }
  return path.join(getGameDir(username, gameId), 'sources', `${sourceId}.json`);
}

function getCitationFeedbackPath(username: string, gameId: string): string {
  return path.join(getGameDir(username, gameId), 'citation-feedback.json');
}

async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(value, null, 2), 'utf-8');
  await fs.rename(tmpPath, filePath);
}

function normalizeManifest(gameId: string, raw: unknown): CampaignKnowledgeManifest {
  if (!raw || typeof raw !== 'object') {
    return {
      ...EMPTY_MANIFEST,
      gameId,
      updatedAt: nowIso(),
    };
  }
  const payload = raw as Record<string, unknown>;
  return {
    version: 1,
    gameId,
    packIds: uniqueStrings(Array.isArray(payload.packIds) ? payload.packIds.map(String) : []),
    sourceIds: uniqueStrings(Array.isArray(payload.sourceIds) ? payload.sourceIds.map(String) : []),
    updatedAt: trimText(payload.updatedAt) ?? nowIso(),
  };
}

function normalizeSource(gameId: string, raw: unknown): CampaignKnowledgeSource | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const payload = raw as Record<string, unknown>;
  const sourceId = trimText(payload.sourceId);
  const title = trimText(payload.title);
  const sourceType = trimText(payload.sourceType) as CampaignKnowledgeSourceType | undefined;
  if (!sourceId || !title || !sourceType || !isSafeKnowledgeId(sourceId)) return undefined;
  const packType = trimText(payload.packType);
  return {
    sourceId,
    gameId,
    sourceType,
    title,
    originalPath: trimText(payload.originalPath),
    checksum: trimText(payload.checksum),
    content: trimText(payload.content),
    packType: packType && isCampaignKnowledgePackType(packType) ? packType : undefined,
    importedAt: trimText(payload.importedAt) ?? nowIso(),
  };
}

function normalizePack(gameId: string, raw: unknown): CampaignKnowledgePack | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const payload = raw as Record<string, unknown>;
  const packId = trimText(payload.packId);
  const type = trimText(payload.type);
  const title = trimText(payload.title);
  if (!packId || !type || !title || !isSafeKnowledgeId(packId) || !isCampaignKnowledgePackType(type)) {
    return undefined;
  }
  return {
    packId,
    gameId,
    type,
    title,
    status: (trimText(payload.status) as CampaignKnowledgePackStatus | undefined) ?? 'draft',
    summary: trimText(payload.summary) ?? '',
    facts: uniqueStrings(Array.isArray(payload.facts) ? payload.facts.map(String) : []),
    preferences: uniqueStrings(Array.isArray(payload.preferences) ? payload.preferences.map(String) : []),
    avoid: uniqueStrings(Array.isArray(payload.avoid) ? payload.avoid.map(String) : []),
    hookSeeds: uniqueStrings(Array.isArray(payload.hookSeeds) ? payload.hookSeeds.map(String) : []),
    visualCues: uniqueStrings(Array.isArray(payload.visualCues) ? payload.visualCues.map(String) : []),
    sourceIds: uniqueStrings(Array.isArray(payload.sourceIds) ? payload.sourceIds.map(String) : []),
    templateId: trimText(payload.templateId),
    updatedAt: trimText(payload.updatedAt) ?? nowIso(),
  };
}

function isCampaignKnowledgeCitationFeedbackState(value: string): value is CampaignKnowledgeCitationFeedbackState {
  return CAMPAIGN_KNOWLEDGE_CITATION_FEEDBACK_STATES.includes(value as CampaignKnowledgeCitationFeedbackState);
}

function normalizeCitationFeedback(
  gameId: string,
  raw: unknown,
): CampaignKnowledgeCitationFeedback | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const payload = raw as Record<string, unknown>;
  const citationId = trimText(payload.citationId);
  const state = trimText(payload.state);
  if (!citationId || !isSafeKnowledgeId(citationId) || !state || !isCampaignKnowledgeCitationFeedbackState(state)) {
    return undefined;
  }
  const packId = trimText(payload.packId);
  return {
    citationId,
    gameId,
    state,
    packId: packId && isSafeKnowledgeId(packId) ? packId : undefined,
    section: trimText(payload.section),
    value: trimText(payload.value),
    note: trimText(payload.note),
    updatedAt: trimText(payload.updatedAt) ?? nowIso(),
    updatedBy: sanitizeUsername(trimText(payload.updatedBy)),
  };
}

async function readManifest(username: string, gameId: string): Promise<CampaignKnowledgeManifest> {
  const manifestPath = getManifestPath(username, gameId);
  try {
    const raw = await fs.readFile(manifestPath, 'utf-8');
    return normalizeManifest(gameId, JSON.parse(raw));
  } catch {
    return normalizeManifest(gameId, undefined);
  }
}

export async function listCampaignKnowledgeCitationFeedback(
  username: string,
  gameId: string,
): Promise<CampaignKnowledgeCitationFeedback[]> {
  if (!isSafeKnowledgeId(gameId)) {
    throw new Error('Invalid gameId');
  }
  try {
    const raw = await fs.readFile(getCitationFeedbackPath(username, gameId), 'utf-8');
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : [];
    return items
      .map((item) => normalizeCitationFeedback(gameId, item))
      .filter((item): item is CampaignKnowledgeCitationFeedback => Boolean(item))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function saveCampaignKnowledgeCitationFeedback(
  username: string,
  gameId: string,
  input: Omit<CampaignKnowledgeCitationFeedback, 'gameId' | 'updatedAt' | 'updatedBy'> & {
    updatedAt?: string;
    updatedBy?: string;
  },
): Promise<CampaignKnowledgeCitationFeedback> {
  if (!isSafeKnowledgeId(gameId)) {
    throw new Error('Invalid gameId');
  }
  const citationId = trimText(input.citationId);
  if (!citationId || !isSafeKnowledgeId(citationId)) {
    throw new Error('Invalid citationId');
  }
  if (!isCampaignKnowledgeCitationFeedbackState(input.state)) {
    throw new Error('Invalid feedback state');
  }
  const packId = trimText(input.packId);
  if (packId && !isSafeKnowledgeId(packId)) {
    throw new Error('Invalid packId');
  }
  const next: CampaignKnowledgeCitationFeedback = {
    citationId,
    gameId,
    state: input.state,
    packId: packId || undefined,
    section: trimText(input.section),
    value: trimText(input.value),
    note: trimText(input.note),
    updatedAt: input.updatedAt ?? nowIso(),
    updatedBy: sanitizeUsername(input.updatedBy ?? username),
  };
  const current = await listCampaignKnowledgeCitationFeedback(username, gameId);
  const merged = [next, ...current.filter((item) => item.citationId !== citationId)]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  await writeJsonAtomic(getCitationFeedbackPath(username, gameId), merged);
  return next;
}

export async function listRejectedKnowledgeCitationIds(
  username: string,
  gameId: string,
): Promise<string[]> {
  const feedback = await listCampaignKnowledgeCitationFeedback(username, gameId);
  return uniqueStrings(
    feedback
      .filter((item) => item.state === 'do_not_use_again')
      .map((item) => item.citationId),
  );
}

async function writeManifest(
  username: string,
  gameId: string,
  updater: (manifest: CampaignKnowledgeManifest) => CampaignKnowledgeManifest,
): Promise<CampaignKnowledgeManifest> {
  const next = updater(await readManifest(username, gameId));
  const normalized = normalizeManifest(gameId, next);
  normalized.updatedAt = nowIso();
  await writeJsonAtomic(getManifestPath(username, gameId), normalized);
  return normalized;
}

export function buildKnowledgeSourceId(prefix = 'cks'): string {
  return `${prefix}_${nanoid(10)}`;
}

export function buildKnowledgePackId(prefix = 'ckp'): string {
  return `${prefix}_${nanoid(10)}`;
}

export async function listCampaignKnowledgePacks(
  username: string,
  gameId: string,
): Promise<CampaignKnowledgePack[]> {
  const manifest = await readManifest(username, gameId);
  const packs = await Promise.all(
    manifest.packIds.map(async (packId) => {
      try {
        const raw = await fs.readFile(getPackPath(username, gameId, packId), 'utf-8');
        return normalizePack(gameId, JSON.parse(raw));
      } catch {
        return undefined;
      }
    }),
  );
  return packs
    .filter((item): item is CampaignKnowledgePack => Boolean(item))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listCampaignKnowledgeSources(
  username: string,
  gameId: string,
): Promise<CampaignKnowledgeSource[]> {
  const manifest = await readManifest(username, gameId);
  const sources = await Promise.all(
    manifest.sourceIds.map(async (sourceId) => {
      try {
        const raw = await fs.readFile(getSourcePath(username, gameId, sourceId), 'utf-8');
        return normalizeSource(gameId, JSON.parse(raw));
      } catch {
        return undefined;
      }
    }),
  );
  return sources
    .filter((item): item is CampaignKnowledgeSource => Boolean(item))
    .sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}

export async function saveCampaignKnowledgeSource(
  username: string,
  gameId: string,
  input: Omit<CampaignKnowledgeSource, 'importedAt'> & { importedAt?: string },
): Promise<CampaignKnowledgeSource> {
  const sourceId = trimText(input.sourceId);
  if (!sourceId || !isSafeKnowledgeId(sourceId)) {
    throw new Error('Invalid sourceId');
  }
  const normalized: CampaignKnowledgeSource = {
    sourceId,
    gameId,
    sourceType: input.sourceType,
    title: input.title.trim(),
    originalPath: trimText(input.originalPath),
    checksum: trimText(input.checksum),
    content: trimText(input.content),
    packType: input.packType,
    importedAt: input.importedAt ?? nowIso(),
  };
  await writeJsonAtomic(getSourcePath(username, gameId, sourceId), normalized);
  await writeManifest(username, gameId, (manifest) => ({
    ...manifest,
    sourceIds: uniqueStrings([...manifest.sourceIds, sourceId]),
  }));
  return normalized;
}

export async function upsertCampaignKnowledgePack(
  username: string,
  gameId: string,
  input: Omit<CampaignKnowledgePack, 'updatedAt'> & { updatedAt?: string },
): Promise<CampaignKnowledgePack> {
  const packId = trimText(input.packId);
  if (!packId || !isSafeKnowledgeId(packId)) {
    throw new Error('Invalid packId');
  }
  const normalized: CampaignKnowledgePack = {
    packId,
    gameId,
    type: input.type,
    title: input.title.trim(),
    status: input.status,
    summary: input.summary.trim(),
    facts: uniqueStrings(input.facts),
    preferences: uniqueStrings(input.preferences),
    avoid: uniqueStrings(input.avoid),
    hookSeeds: uniqueStrings(input.hookSeeds),
    visualCues: uniqueStrings(input.visualCues),
    sourceIds: uniqueStrings(input.sourceIds),
    templateId: trimText(input.templateId),
    updatedAt: input.updatedAt ?? nowIso(),
  };
  await writeJsonAtomic(getPackPath(username, gameId, packId), normalized);
  await writeManifest(username, gameId, (manifest) => ({
    ...manifest,
    packIds: uniqueStrings([...manifest.packIds, packId]),
  }));
  return normalized;
}
