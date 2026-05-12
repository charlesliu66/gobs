/**
 * 智能素材库匹配系统
 * - 索引文件存储在 {API_DATA_DIR}/asset-index.json
 * - 支持本地扫描 + AI 打标签
 * - 语义匹配分镜需求
 */
import fs from 'fs';
import path from 'path';
import { compassChatCompletionWithContent, compassChatCompletion } from './promptPolish.js';
import { getApiDataDir } from '../config/apiDataDir.js';
import type { ProductionShot } from './studioPipeline.js';

export type AssetType = 'character' | 'scene' | 'prop' | 'style';
export type AssetVisibility = 'private' | 'team';
export type AssetStorageProvider = 'local' | 'object_storage';
export type AssetSourceProvider = 'upload' | 'google_drive' | 'generated' | 'imported';
export type AssetOwnershipScope = 'my' | 'team' | 'all';

export const DEFAULT_ASSET_TEAM_ID = 'default-team';

const ASSET_VISIBILITY_SET = new Set<AssetVisibility>(['private', 'team']);
const ASSET_STORAGE_PROVIDER_SET = new Set<AssetStorageProvider>(['local', 'object_storage']);
const ASSET_SOURCE_PROVIDER_SET = new Set<AssetSourceProvider>(['upload', 'google_drive', 'generated', 'imported']);

export interface Asset {
  id: string;
  file: string;
  driveFileId?: string;
  localPath?: string;
  type: AssetType;
  name: string;
  tags: string[];
  gameVersion: string;
  description: string;
  thumbnailBase64?: string;
  ownerId?: string;
  teamId?: string;
  visibility?: AssetVisibility;
  storageProvider?: AssetStorageProvider;
  storageKey?: string;
  sourceProvider?: AssetSourceProvider;
  sourceExternalId?: string;
  sourceName?: string;
  ownedByActor?: boolean;
}

export interface AssetIndex {
  version: string;
  updatedAt: string;
  assets: Asset[];
}

export interface MatchedAssets {
  characterRefs: Asset[];
  sceneRef?: Asset;
  propRefs: Asset[];
  styleRef?: Asset;
}

function getIndexPath(): string {
  return path.join(getApiDataDir(), 'asset-index.json');
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function resolveActorTeamId(_username?: string): string {
  return DEFAULT_ASSET_TEAM_ID;
}

export function normalizeAssetVisibility(
  value: unknown,
  fallback: AssetVisibility = 'private',
): AssetVisibility {
  return ASSET_VISIBILITY_SET.has(value as AssetVisibility) ? value as AssetVisibility : fallback;
}

export function normalizeAssetStorageProvider(value: unknown): AssetStorageProvider {
  return ASSET_STORAGE_PROVIDER_SET.has(value as AssetStorageProvider)
    ? value as AssetStorageProvider
    : 'local';
}

export function normalizeAssetSourceProvider(value: unknown): AssetSourceProvider {
  return ASSET_SOURCE_PROVIDER_SET.has(value as AssetSourceProvider)
    ? value as AssetSourceProvider
    : 'upload';
}

export function normalizeAssetOwnershipScope(value: unknown): AssetOwnershipScope {
  return value === 'team' || value === 'all' ? value : 'my';
}

export function normalizeLegacyAsset(
  asset: Asset,
  actorUsername?: string,
): Asset {
  const raw = asset as Asset & Record<string, unknown>;
  const ownerId = readString(raw.ownerId) ?? readString(raw.owner_id);
  const driveFileId = readString(raw.driveFileId) ?? readString(raw.drive_file_id);
  const visibility = normalizeAssetVisibility(raw.visibility, ownerId ? 'private' : 'team');
  const teamId = readString(raw.teamId) ?? readString(raw.team_id) ?? DEFAULT_ASSET_TEAM_ID;
  const storageProvider = normalizeAssetStorageProvider(raw.storageProvider ?? raw.storage_provider);
  const storageKey = readString(raw.storageKey) ?? readString(raw.storage_key) ?? raw.localPath ?? raw.file;
  const sourceProvider = normalizeAssetSourceProvider(
    raw.sourceProvider ?? raw.source_provider ?? (driveFileId ? 'google_drive' : 'upload'),
  );
  const sourceExternalId = readString(raw.sourceExternalId) ?? readString(raw.source_external_id) ?? driveFileId;
  const sourceName = readString(raw.sourceName) ?? readString(raw.source_name) ?? raw.name;

  return {
    ...asset,
    driveFileId,
    ownerId,
    teamId,
    visibility,
    storageProvider,
    storageKey,
    sourceProvider,
    sourceExternalId,
    sourceName,
    ownedByActor: actorUsername ? ownerId === actorUsername : undefined,
  };
}

export function canActorReadAsset(
  asset: Pick<Asset, 'ownerId' | 'teamId' | 'visibility'>,
  actor: { username: string; teamId?: string | null },
): boolean {
  if (asset.ownerId && asset.ownerId === actor.username) {
    return true;
  }
  return normalizeAssetVisibility(asset.visibility, 'private') === 'team'
    && (asset.teamId ?? DEFAULT_ASSET_TEAM_ID) === (actor.teamId ?? DEFAULT_ASSET_TEAM_ID);
}

export function filterVisibleLegacyAssets(
  index: AssetIndex,
  actorUsername: string,
  scope: AssetOwnershipScope,
): AssetIndex {
  const actorTeamId = resolveActorTeamId(actorUsername);
  const assets = index.assets
    .map((asset) => normalizeLegacyAsset(asset, actorUsername))
    .filter((asset) => {
      const ownedByActor = asset.ownedByActor === true;
      const teamVisible = canActorReadAsset(asset, {
        username: actorUsername,
        teamId: actorTeamId,
      });

      if (scope === 'team') {
        return asset.visibility === 'team' && asset.teamId === actorTeamId;
      }
      if (scope === 'all') {
        return teamVisible;
      }
      return ownedByActor;
    });

  return {
    ...index,
    assets,
  };
}

export async function loadAssetIndex(): Promise<AssetIndex> {
  const indexPath = getIndexPath();
  if (!fs.existsSync(indexPath)) {
    return { version: '1.0', updatedAt: new Date().toISOString().slice(0, 10), assets: [] };
  }
  try {
    const raw = fs.readFileSync(indexPath, 'utf-8');
    const parsed = JSON.parse(raw) as AssetIndex;
    return {
      version: parsed.version ?? '1.0',
      updatedAt: parsed.updatedAt ?? new Date().toISOString().slice(0, 10),
      assets: Array.isArray(parsed.assets) ? parsed.assets.map((asset) => normalizeLegacyAsset(asset)) : [],
    };
  } catch {
    return { version: '1.0', updatedAt: new Date().toISOString().slice(0, 10), assets: [] };
  }
}

export async function saveAssetIndex(index: AssetIndex): Promise<void> {
  const indexPath = getIndexPath();
  index.updatedAt = new Date().toISOString().slice(0, 10);
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
}

/** 扫描 uploads 目录，为新文件自动打标签并加入索引 */
export async function buildAssetIndex(): Promise<AssetIndex> {
  const uploadsDir = path.join(getApiDataDir(), 'uploads');
  const existing = await loadAssetIndex();
  const existingFiles = new Set(existing.assets.map((a) => a.localPath ?? a.file));

  if (!fs.existsSync(uploadsDir)) {
    return existing;
  }

  const imageExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
  const files: string[] = [];

  function scanDir(dir: string) {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(full);
        } else if (imageExts.has(path.extname(entry.name).toLowerCase())) {
          const rel = path.relative(getApiDataDir(), full);
          if (!existingFiles.has(full) && !existingFiles.has(rel)) {
            files.push(full);
          }
        }
      }
    } catch {
      // 忽略无权限目录
    }
  }

  scanDir(uploadsDir);

  for (const filePath of files) {
    try {
      const tagged = await autoTagImage({ localPath: filePath, filename: path.basename(filePath) });
      const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const asset: Asset = {
        id,
        file: path.relative(getApiDataDir(), filePath),
        localPath: filePath,
        type: tagged.type,
        name: tagged.name,
        tags: tagged.tags,
        gameVersion: tagged.gameVersion,
        description: tagged.description,
      };
      existing.assets.push(asset);
    } catch (err) {
      console.warn('[assetLibrary] 自动打标签失败:', filePath, err);
    }
  }

  await saveAssetIndex(existing);
  return existing;
}

export interface AutoTagResult {
  type: AssetType;
  name: string;
  tags: string[];
  gameVersion: string;
  description: string;
}

/** 用 Compass 多模态识别图片内容，返回素材元数据 */
export async function autoTagImage(input: {
  imageBase64?: string;
  localPath?: string;
  filename: string;
}): Promise<AutoTagResult> {
  let imageBase64 = input.imageBase64;
  if (!imageBase64 && input.localPath && fs.existsSync(input.localPath)) {
    imageBase64 = fs.readFileSync(input.localPath).toString('base64');
  }

  if (!imageBase64) {
    // 无图片时用文件名推断
    return guessTagsFromFilename(input.filename);
  }

  const ext = path.extname(input.filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  const mime = mimeMap[ext] ?? 'image/png';
  const dataUrl = `data:${mime};base64,${imageBase64}`;

  const systemPrompt = `你是游戏/动漫素材分析助手。分析图片内容，输出素材元数据 JSON。

输出格式（严格 JSON，无额外文字）：
{
  "type": "character" | "scene" | "prop" | "style",
  "name": "素材名称（简短，如：蓝发少女、森林场景、神秘剑）",
  "tags": ["标签1", "标签2", "标签3"],
  "gameVersion": "all",
  "description": "一句话描述：颜色/特征/风格/用途"
}

type 选择规则（按优先级判断）：
1. character（最高优先级）：包含人物/角色/生物形象的图片，无论是全身、半身、头像、Q版、像素风还是写实风，只要图片主体是"一个有面部或身体特征的角色"就归类为 character。游戏角色立绘、皮肤图、头像图、人物原画、角色概念图都属于 character。
2. scene：以环境/地点/背景为主体的图片，图中没有突出的角色人物
3. style：抽象风格参考图、色彩板、无明确主体的概念氛围图
4. prop：只包含单独的物件/道具/武器/装备，画面中没有人物角色

⚠️ 重要：如果画面中有人物角色拿着武器/道具，应归类为 character 而不是 prop！

tags 规则：
- 包含：角色名/类型（如主角、少女、武士）、外观特征、风格标签（古装、现代、赛博朋克）
- 3-6 个 tag
- gameVersion 默认 "all"`;

  try {
    const raw = await compassChatCompletionWithContent({
      systemPrompt,
      userContent: [
        { type: 'text', text: `请分析这张图片（文件名：${input.filename}），输出素材元数据 JSON。` },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
      temperature: 0.2,
      maxTokens: 512,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('未返回 JSON');
    const parsed = JSON.parse(jsonMatch[0]) as AutoTagResult;
    if (!parsed.type || !parsed.name) throw new Error('字段不完整');
    return {
      type: parsed.type ?? 'prop',
      name: parsed.name ?? path.basename(input.filename, path.extname(input.filename)),
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      gameVersion: parsed.gameVersion ?? 'all',
      description: parsed.description ?? '',
    };
  } catch (err) {
    console.warn('[autoTagImage] AI 识别失败，降级用文件名推断:', err);
    return guessTagsFromFilename(input.filename);
  }
}

function guessTagsFromFilename(filename: string): AutoTagResult {
  const base = path.basename(filename, path.extname(filename));
  const lower = base.toLowerCase();

  let type: AssetType = 'character';
  const tags: string[] = [base];

  if (['角色', 'char', 'character', '立绘', '皮肤'].some((k) => lower.includes(k))) {
    type = 'character';
    tags.push('角色');
  } else if (['场景', 'scene', 'bg', 'background', '背景'].some((k) => lower.includes(k))) {
    type = 'scene';
    tags.push('场景');
  } else if (['道具', 'prop', '武器', 'weapon'].some((k) => lower.includes(k))) {
    type = 'prop';
    tags.push('道具');
  } else if (['风格', 'style', '参考'].some((k) => lower.includes(k))) {
    type = 'style';
    tags.push('风格');
  }

  return {
    type,
    name: base,
    tags,
    gameVersion: 'all',
    description: `素材：${base}`,
  };
}

/** 语义匹配：用 LLM 对文字描述做相关性评分 */
export async function semanticMatch(
  query: string,
  candidates: Asset[],
  gameVersion?: string,
): Promise<Asset[]> {
  if (candidates.length === 0) return [];

  // 先按版本过滤
  let filtered = candidates;
  if (gameVersion && gameVersion !== 'all') {
    const exact = candidates.filter(
      (a) => a.gameVersion === gameVersion || a.gameVersion === 'all',
    );
    filtered = exact.length > 0 ? exact : candidates;
  }

  if (filtered.length === 0) return [];
  if (filtered.length === 1) return filtered;

  const candidateList = filtered.map((a, i) => `[${i}] ${a.name}｜${a.description}｜标签：${a.tags.join(',')}`)
    .join('\n');

  const systemPrompt = `你是素材匹配助手。根据查询描述，从候选素材列表中找出最匹配的素材，按相关度排序，返回最多 3 个的序号数组。

只输出 JSON 数组，如 [0, 2, 1]，不要其他文字。`;

  try {
    const raw = await compassChatCompletion({
      systemPrompt,
      userText: `查询：${query}\n\n候选素材：\n${candidateList}`,
      temperature: 0.1,
      maxTokens: 64,
    });

    const match = raw.match(/\[[\d,\s]*\]/);
    if (!match) return filtered.slice(0, 3);
    const indices = JSON.parse(match[0]) as number[];
    return indices
      .filter((i) => typeof i === 'number' && i >= 0 && i < filtered.length)
      .map((i) => filtered[i]!)
      .filter(Boolean);
  } catch {
    return filtered.slice(0, 3);
  }
}

/** AI 分类 → 旧版 AssetType 映射 */
const CATEGORY_TO_TYPE: Record<string, AssetType> = {
  '角色': 'character',
  '武器道具': 'prop',
  '场景': 'scene',
  'UI素材': 'style',
  '宣传图': 'style',
  '视频片段': 'scene',
};

/** 从 SQLite 素材中台加载资产并转换为 Asset 格式 */
async function loadAssetsFromSqlite(username?: string): Promise<Asset[]> {
  try {
    // 复用已有的 assetDb 单例
    const db = (await import('../db/assetDb.js')).default;
    const query = username
      ? `SELECT id, filename, filepath, mimetype, ai_category, ai_description FROM assets WHERE status != 'deleted' AND username = ? ORDER BY updated_at DESC LIMIT 500`
      : `SELECT id, filename, filepath, mimetype, ai_category, ai_description FROM assets WHERE status != 'deleted' ORDER BY updated_at DESC LIMIT 500`;
    const rows = (username ? db.prepare(query).all(username) : db.prepare(query).all()) as Array<{
      id: string; filename: string; filepath: string; mimetype: string;
      ai_category: string | null; ai_description: string | null;
    }>;
    return rows.map((r) => ({
      id: `sqlite-${r.id}`,
      file: r.filepath,
      localPath: r.filepath,
      type: CATEGORY_TO_TYPE[r.ai_category ?? ''] ?? ('scene' as AssetType),
      name: r.filename.replace(/\.[^.]+$/, ''),
      tags: [r.ai_category ?? '未分类'],
      gameVersion: 'all',
      description: r.ai_description ?? r.filename,
    }));
  } catch {
    return [];
  }
}

/** 为单个分镜匹配最合适的素材 */
export async function matchAssetsForShot(
  shot: ProductionShot,
  gameVersion?: string,
  username?: string,
): Promise<MatchedAssets> {
  // 同时从两个数据源加载：SQLite 素材中台 + 旧版 asset-index.json
  const [index, sqliteAssets] = await Promise.all([
    loadAssetIndex(),
    loadAssetsFromSqlite(username),
  ]);
  const allAssets = [...sqliteAssets, ...index.assets];

  if (allAssets.length === 0) {
    return { characterRefs: [], propRefs: [] };
  }

  const characters = allAssets.filter((a) => a.type === 'character');
  const scenes = allAssets.filter((a) => a.type === 'scene');
  const props = allAssets.filter((a) => a.type === 'prop');
  const styles = allAssets.filter((a) => a.type === 'style');

  const characterQuery = `${shot.subject} ${shot.action}`;
  const sceneQuery = shot.structuredStill.sp_environment ?? shot.sceneRef;
  const propQuery = `${shot.notes} ${shot.structuredStill.sp_subject}`;

  const [characterRefs, sceneMatches, propRefs, styleMatches] = await Promise.all([
    semanticMatch(characterQuery, characters, gameVersion).catch(() => [] as Asset[]),
    semanticMatch(sceneQuery, scenes, gameVersion).catch(() => [] as Asset[]),
    semanticMatch(propQuery, props, gameVersion).catch(() => [] as Asset[]),
    semanticMatch(shot.structuredStill.sp_style, styles, gameVersion).catch(() => [] as Asset[]),
  ]);

  return {
    characterRefs: characterRefs.slice(0, 2),
    sceneRef: sceneMatches[0],
    propRefs: propRefs.slice(0, 2),
    styleRef: styleMatches[0],
  };
}
